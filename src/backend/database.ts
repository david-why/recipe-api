import { sql } from "bun"

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
  return recipes.map((r) => ({
    id: r.id,
    title: r.title,
    description: r.description,
    steps: r.steps
      .filter((rs) => rs.id !== null)
      .map((rs) => ({
        id: rs.id,
        ordinal: rs.ordinal,
        instruction: rs.instruction,
        ingredients: rs.ingredients || [],
      })),
    ingredients: r.ingredients
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
  }))
}
