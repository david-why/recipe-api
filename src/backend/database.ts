import { sql } from "bun"
import { HTTPError } from "./router"

function uniqueReducer<T>(key: keyof T) {
  return (prev: T[], current: T) => {
    const id = current[key]
    for (const item of prev) {
      if (item[key] === id) {
        return prev
      }
    }
    prev.push(current)
    return prev
  }
}

function mapDbRecipe(recipe: DBRecipe): Recipe {
  return {
    id: recipe.id,
    title: recipe.title,
    description: recipe.description,
    steps: recipe.steps
      .filter((rs) => rs.id !== null)
      .map((rs) => ({
        id: rs.id,
        ordinal: rs.ordinal,
        instruction: rs.instruction,
        ingredients: rs.ingredients || [],
      }))
      .reduce(uniqueReducer("id"), []),
    ingredients: recipe.ingredients
      .filter((ri) => ri.id !== null)
      .map((ri) => ({
        id: ri.id,
        quantity: ri.quantity,
        unit: ri.unit,
        ingredient: mapDbIngredient(ri.ingredient),
      }))
      .reduce(uniqueReducer("id"), []),
    user: {
      id: recipe.user.id,
      username: recipe.user.username,
      flags: recipe.user.flags,
    },
  }
}

function mapDbIngredient(ingredient: DBIngredient): Ingredient {
  return {
    id: ingredient.id,
    name: ingredient.name,
    defaultUnit: ingredient.default_unit,
  }
}

function mapDbUser(user: DBUser): User {
  return {
    id: user.id,
    username: user.username,
    passwordHash: user.password_hash,
    flags: user.flags,
  }
}

export async function getAllRecipes(
  limit: number,
  page: number,
): Promise<Recipe[]> {
  const recipes = await sql<DBRecipe[]>`
    SELECT
      r.id,
      r.title,
      r.description,
      json_agg(
        json_build_object(
          'id', rs.id,
          'ordinal', rs.ordinal,
          'instruction', rs.instruction,
          'ingredients', (
            SELECT
              json_agg(rsi.recipe_ingredient_id)
            FROM
              recipe_step_ingredients AS rsi
            WHERE
              rsi.recipe_step_id = rs.id
          )
        )
        ORDER BY rs.ordinal
      ) AS steps,
      json_agg(
        json_build_object(
          'id', ri.id,
          'quantity', ri.quantity,
          'unit', ri.unit,
          'ingredient', (
            SELECT
              json_build_object(
                'id', i.id,
                'name', i.name,
                'default_unit', i.default_unit
              )
            FROM
              ingredients AS i
            WHERE
              i.id = ri.ingredient_id
          )
        )
      ) AS ingredients,
      json_build_object(
        'id', u.id,
        'username', u.username,
        'flags', u.flags
      ) AS user
    FROM
      recipes AS r
    INNER JOIN
      users AS u ON r.user_id = u.id
    LEFT JOIN
      recipe_steps AS rs ON r.id = rs.recipe_id
    LEFT JOIN
      recipe_ingredients AS ri ON r.id = ri.recipe_id
    GROUP BY
      r.id, u.id
    ORDER BY
      r.id
    LIMIT ${limit}
    OFFSET ${page * limit}
  `
  return recipes.map(mapDbRecipe)
}

export async function createRecipe(userId: string, data: CreateRecipeBody) {
  const recipeId = (
    await sql<[{ id: string }]>`
      INSERT INTO recipes (title, description, user_id)
      VALUES (${data.title}, ${data.description}, ${userId})
      RETURNING id
    `
  )[0].id

  const dbIngredients = data.ingredients.map((i) => ({
    recipe_id: recipeId,
    quantity: i.quantity,
    unit: i.unit,
    ingredient_id: i.ingredientId,
  }))
  let dbIngredientIds: string[]
  try {
    dbIngredientIds = data.ingredients.length
      ? (
          await sql<{ id: string }[]>`
            INSERT INTO recipe_ingredients ${sql(dbIngredients)}
            RETURNING id
          `
        ).map((i) => i.id)
      : []
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes("violates foreign key constraint")
    ) {
      throw new HTTPError(400, "Invalid ingredient ID")
    }
    throw error
  }
  const ingredientIdMap = Object.fromEntries(
    data.ingredients.map((ingredient, index) => [
      ingredient.id,
      dbIngredientIds[index],
    ]),
  )

  if (data.steps.length) {
    const dbSteps = data.steps.map((s) => ({
      recipe_id: recipeId,
      ordinal: s.ordinal,
      instruction: s.instruction,
    }))
    const dbStepIds = (
      await sql<{ id: string }[]>`
        INSERT INTO recipe_steps ${sql(dbSteps)}
        RETURNING id
      `
    ).map((s) => s.id)

    for (const [index, step] of data.steps.entries()) {
      if (step.ingredients.length === 0) continue
      const stepId = dbStepIds[index]
      const dbStepIngredients = step.ingredients.map((i) => {
        if (!ingredientIdMap[i]) {
          throw new HTTPError(400, `Invalid ingredient ID: ${i}`)
        }
        return {
          recipe_step_id: stepId,
          recipe_ingredient_id: ingredientIdMap[i],
        }
      })
      await sql`INSERT INTO recipe_step_ingredients ${sql(dbStepIngredients)}`
    }
  }
}

export async function getRecipeById(id: string): Promise<Recipe | null> {
  const recipes = await sql<DBRecipe[]>`
    SELECT
      r.id,
      r.title,
      r.description,
      json_agg(
        json_build_object(
          'id', rs.id,
          'ordinal', rs.ordinal,
          'instruction', rs.instruction,
          'ingredients', (
            SELECT
              json_agg(rsi.recipe_ingredient_id)
            FROM
              recipe_step_ingredients AS rsi
            WHERE
              rsi.recipe_step_id = rs.id
          )
        )
        ORDER BY rs.ordinal
      ) AS steps,
      json_agg(
        json_build_object(
          'id', ri.id,
          'quantity', ri.quantity,
          'unit', ri.unit,
          'ingredient', (
            SELECT
              json_build_object(
                'id', i.id,
                'name', i.name,
                'default_unit', i.default_unit
              )
            FROM
              ingredients AS i
            WHERE
              i.id = ri.ingredient_id
          )
        )
      ) AS ingredients,
      json_build_object(
        'id', u.id,
        'username', u.username,
        'flags', u.flags
      ) AS user
    FROM
      recipes AS r
    INNER JOIN
      users AS u ON r.user_id = u.id
    LEFT JOIN
      recipe_steps AS rs ON r.id = rs.recipe_id
    LEFT JOIN
      recipe_ingredients AS ri ON r.id = ri.recipe_id
    WHERE
      r.id = ${id}
    GROUP BY
      r.id, u.id
  `
  const recipe = recipes[0]
  return recipe ? mapDbRecipe(recipe) : null
}

export async function createRecipeStep(
  recipeId: string,
  data: CreateRecipeStepBody,
) {
  // apparently sql.begin is bugged so no transactions :(
  const dbStep = {
    recipe_id: recipeId,
    ordinal: data.ordinal,
    instruction: data.instruction,
  }
  let stepId: string
  try {
    stepId = (
      await sql<[{ id: string }]>`
        INSERT INTO recipe_steps ${sql(dbStep)}
        RETURNING id
      `
    )[0].id
  } catch (error) {
    if (error instanceof Error && error.message.includes("duplicate key")) {
      throw new HTTPError(400, "Duplicate ordinal in new step")
    }
    throw error
  }

  if (data.ingredients.length) {
    const dbStepIngredients = data.ingredients.map((i) => ({
      recipe_step_id: stepId,
      recipe_ingredient_id: i,
    }))
    await sql`INSERT INTO recipe_step_ingredients ${sql(dbStepIngredients)}`
  }
}

export async function deleteRecipe(id: string) {
  await sql`DELETE FROM recipes WHERE id = ${id}`
}

export async function getAllIngredients(
  limit: number,
  page: number,
): Promise<Ingredient[]> {
  const ingredients = await sql<DBIngredient[]>`
    SELECT
      i.id,
      i.name,
      i.default_unit
    FROM
      ingredients AS i
    ORDER BY
      i.name
    LIMIT ${limit}
    OFFSET ${page * limit}
  `
  return ingredients.map(mapDbIngredient)
}

export async function createIngredient(data: CreateIngredientBody) {
  const dbIngredient = {
    name: data.name,
    default_unit: data.defaultUnit,
  }
  await sql<[{ id: string }]>`
    INSERT INTO ingredients ${sql(dbIngredient)}
    RETURNING id
  `
}

export async function updateIngredient(id: string, data: CreateIngredientBody) {
  const dbIngredient = {
    name: data.name,
    default_unit: data.defaultUnit,
  }
  await sql`
    UPDATE ingredients
    SET ${sql(dbIngredient)}
    WHERE id = ${id}
  `
}

export async function getUserByUsername(username: string) {
  const users = await sql<DBUser[]>`
    SELECT
      u.id,
      u.username,
      u.password_hash,
      u.flags
    FROM
      users AS u
    WHERE
      u.username = ${username}
  `
  return users[0] ? mapDbUser(users[0]) : null
}

export async function getUserById(id: string) {
  const users = await sql<DBUser[]>`
    SELECT
      u.id,
      u.username,
      u.password_hash,
      u.flags
    FROM
      users AS u
    WHERE
      u.id = ${id}
  `
  return users[0] ? mapDbUser(users[0]) : null
}
