import type z from "zod"
import type {
  CreateIngredientBody,
  CreateRecipeBody,
  CreateRecipeStepBody,
} from "../backend/schemas"

declare global {
  declare interface DBRecipe {
    id: string
    title: string
    description: string
    steps:
      | {
          id: string
          ordinal: number
          instruction: string
          ingredients: string[] | null
        }[]
      | [
          {
            id: null
            ordinal: null
            instruction: null
            ingredients: null
          },
        ]
    ingredients:
      | {
          id: string
          quantity: number
          unit: string
          ingredient: DBIngredient
        }[]
      | [
          {
            id: null
            quantity: null
            unit: null
            ingredient: null
          },
        ]
  }

  declare interface DBIngredient {
    id: string
    name: string
    default_unit: string
  }

  declare interface Recipe {
    id: string
    title: string
    description: string
    steps: {
      id: string
      ordinal: number
      instruction: string
      ingredients: string[]
    }[]
    ingredients: {
      id: string
      quantity: number
      unit: string
      ingredient: Ingredient
    }[]
  }

  declare interface Ingredient {
    id: string
    name: string
    defaultUnit: string
  }

  declare type CreateRecipeBody = z.infer<typeof CreateRecipeBody>

  declare type CreateRecipeStepBody = z.infer<typeof CreateRecipeStepBody>

  declare type CreateIngredientBody = z.infer<typeof CreateIngredientBody>
}
