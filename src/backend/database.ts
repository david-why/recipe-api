import { sql } from "bun"
import { HTTPError } from "./router"

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
      })),
    ingredients: recipe.ingredients
      .filter((ri) => ri.id !== null)
      .map((ri) => ({
        id: ri.id,
        quantity: ri.quantity,
        unit: ri.unit,
        ingredient: {
          id: ri.ingredient.id,
          name: ri.ingredient.name,
          defaultUnit: ri.ingredient.default_unit,
        },
      })),
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
      ) AS ingredients
    FROM
      recipes AS r
    LEFT JOIN
      recipe_steps AS rs ON r.id = rs.recipe_id
    LEFT JOIN
      recipe_ingredients AS ri ON r.id = ri.recipe_id
    GROUP BY
      r.id
    ORDER BY
      r.id
    LIMIT
      ${limit}
    OFFSET
      ${page * limit}
  `
  return recipes.map(mapDbRecipe)
}

export async function createRecipe(data: CreateRecipeBody) {
  await sql.transaction(async (tx) => {
    const recipeId = (
      await tx<[{ id: string }]>`
        INSERT INTO recipes (title, description)
        VALUES (${data.title}, ${data.description})
        RETURNING id
      `
    )[0].id

    const dbIngredients = data.ingredients.map((i) => ({
      recipe_id: recipeId,
      quantity: i.quantity,
      unit: i.unit,
      ingredient_id: i.ingredientId,
    }))
    const dbIngredientIds = data.ingredients.length
      ? (
          await tx<{ id: string }[]>`
            INSERT INTO recipe_ingredients ${tx(dbIngredients)}
            RETURNING id
          `
        ).map((i) => i.id)
      : []
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
        await tx<{ id: string }[]>`
          INSERT INTO recipe_steps ${tx(dbSteps)}
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
        await tx`INSERT INTO recipe_step_ingredients ${tx(dbStepIngredients)}`
      }
    }
  })
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
      ) AS ingredients
    FROM
      recipes AS r
    LEFT JOIN
      recipe_steps AS rs ON r.id = rs.recipe_id
    LEFT JOIN
      recipe_ingredients AS ri ON r.id = ri.recipe_id
    WHERE
      r.id = ${id}
    GROUP BY
      r.id
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
