import type z from "zod"
import type {
  CreateIngredientBody,
  CreateRecipeBody,
  CreateRecipeStepBody,
  LoginBody,
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
        ],
    user: Pick<DBUser, "id" | "username" | "flags">
  }

  declare interface DBIngredient {
    id: string
    name: string
    default_unit: string
  }
  
  declare interface DBUser {
    id: string
    username: string
    password_hash: string
    flags: number
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
    user: Pick<User, "id" | "username" | "flags">
  }

  declare interface Ingredient {
    id: string
    name: string
    defaultUnit: string
  }

  declare interface User {
    id: string
    username: string
    passwordHash: string
    flags: number
  }

  declare type CreateRecipeBody = z.infer<typeof CreateRecipeBody>

  declare type CreateRecipeStepBody = z.infer<typeof CreateRecipeStepBody>

  declare type CreateIngredientBody = z.infer<typeof CreateIngredientBody>

  declare type LoginBody = z.infer<typeof LoginBody>
}
