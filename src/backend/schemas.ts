import z from "zod"

export const CreateRecipeStepBody = z.object({
  ordinal: z.number().min(0),
  instruction: z.string().max(1000),
  ingredients: z.array(z.string()),
})

export const CreateRecipeBody = z.object({
  title: z.string().max(100),
  description: z.string().max(1000),
  steps: z.array(CreateRecipeStepBody),
  ingredients: z.array(
    z.object({
      id: z.string(),
      ingredientId: z.uuid(),
      quantity: z.number().min(0),
      unit: z.string().min(1).max(100),
    }),
  ),
})
