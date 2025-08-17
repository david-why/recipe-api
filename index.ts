import { type BunRequest, password, sql } from "bun"
import z from "zod"
import docsPage from "./public/docs.html"
import openapi from "./public/openapi.json"
import {
  createIngredient,
  createRecipe,
  createRecipeStep,
  deleteRecipe,
  getAllIngredients,
  getAllRecipes,
  getRecipeById,
  getUserById,
  getUserByUsername,
  updateIngredient,
} from "./src/backend/database"
import { HTTPError, Router } from "./src/backend/router"
import {
  CreateIngredientBody,
  CreateRecipeBody,
  CreateRecipeStepBody,
  LoginBody,
} from "./src/backend/schemas"
import { signJWT, verifyJWT } from "./src/backend/jwt"

const PORT = process.env.PORT || 3000

const r = new Router()

function ok(data: any = null, status: number = 200) {
  if (data === null) {
    return new Response("", { status: status === 200 ? 204 : status })
  }
  return Response.json(data, { status })
}

function error(error: any, status: number = 500) {
  return Response.json({ error }, { status })
}

function getPagination(req: BunRequest) {
  const url = new URL(req.url)
  const limit = Math.max(
    Math.min(Number(url.searchParams.get("limit") || 10), 100),
    1,
  )
  const page = Math.max(Number(url.searchParams.get("page") || 0), 0)
  return { limit, page }
}

function getAuth(
  req: BunRequest,
  required?: false,
): { sub: string; flags: number } | null
function getAuth(
  req: BunRequest,
  required: true,
): { sub: string; flags: number }

function getAuth(req: BunRequest, required: boolean = false) {
  const authorization = req.headers.get("authorization")
  if (authorization && authorization.startsWith("Bearer ")) {
    const token = authorization.slice(7)
    try {
      const payload = verifyJWT<{ sub: string; flags: number }>(token)
      return payload
    } catch (error) {
      console.error("Error verifying JWT:", error)
    }
  }
  if (required) {
    throw new HTTPError(401, "Unauthorized")
  }
  return null
}

r.get("/*", () => {
  return error("Not found", 404)
})

// #region API routes

r.get("/api/v1/recipes", async (req) => {
  const { limit, page } = getPagination(req)
  const recipes = await getAllRecipes(limit, page)
  return ok(recipes)
})

r.post("/api/v1/recipes", async (req) => {
  const body = await req.json()
  const data = CreateRecipeBody.safeParse(body)
  if (!data.success) {
    return error(z.treeifyError(data.error), 400)
  }
  await createRecipe(data.data)
  return ok(null, 201)
})

r.get("/api/v1/recipes/:id", async (req) => {
  const id = req.params.id
  const result = await getRecipeById(id)
  return ok(result)
})

r.post("/api/v1/recipes/:id/steps", async (req) => {
  const id = req.params.id
  const body = await req.json()
  const data = CreateRecipeStepBody.safeParse(body)
  if (!data.success) {
    return error(z.treeifyError(data.error), 400)
  }
  await createRecipeStep(id, data.data)
  return ok(null, 201)
})

r.delete("/api/v1/recipes/:id", async (req) => {
  const id = req.params.id
  await deleteRecipe(id)
  return ok()
})

r.get("/api/v1/ingredients", async (req) => {
  const { limit, page } = getPagination(req)
  const ingredients = await getAllIngredients(limit, page)
  return ok(ingredients)
})

r.post("/api/v1/ingredients", async (req) => {
  const body = await req.json()
  const data = CreateIngredientBody.safeParse(body)
  if (!data.success) {
    return error(z.treeifyError(data.error), 400)
  }
  await createIngredient(data.data)
  return ok(null, 201)
})

r.put("/api/v1/ingredients/:id", async (req) => {
  const id = req.params.id
  const body = await req.json()
  const data = CreateIngredientBody.safeParse(body)
  if (!data.success) {
    return error(z.treeifyError(data.error), 400)
  }
  await updateIngredient(id, data.data)
  return ok()
})

r.post("/api/v1/auth/login", async (req) => {
  const body = await req.json()
  const data = LoginBody.safeParse(body)
  if (!data.success) {
    return error(z.treeifyError(data.error), 400)
  }
  const user = await getUserByUsername(data.data.username)
  if (
    !user ||
    !(await password.verify(data.data.password, user.passwordHash))
  ) {
    return error("Invalid credentials", 401)
  }
  const token = signJWT({ sub: user.id, flags: user.flags })
  return ok({ token })
})

r.get("/api/v1/auth/inspect", async (req) => {
  const auth = getAuth(req, true)
  const userId = auth.sub
  const user = await getUserById(userId)
  return ok({ user })
})

// #endregion API routes

Bun.serve({
  routes: {
    ...r.routes,
    "/docs": docsPage,
    "/openapi.json": {
      GET: async () => Response.json(openapi),
    },
  },
  port: PORT,
})

async function initDatabase() {
  await sql.file("db/init.sql")
  console.log("Database initialized")
}
initDatabase()

console.info("Server started on port", PORT, `(http://localhost:${PORT})`)
