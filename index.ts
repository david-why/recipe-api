import { BunRequest, sql } from "bun"
import docsPage from "./public/docs.html"
import { getAllRecipes } from "./src/backend/database"
import { Router } from "./src/backend/router"
import { CreateRecipeBody } from "./src/backend/schemas"
import z from "zod"

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

r.get("/*", () => {
  return error("Not found", 404)
})

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
  return ok(null, 201)
})

Bun.serve({
  routes: {
    ...r.routes,
    "/docs": docsPage,
    "/openapi.json": Bun.file("public/openapi.json"),
  },
  port: PORT,
})

async function initDatabase() {
  await sql.file("db/init.sql")
  console.log("Database initialized")
}
initDatabase()

console.info("Server started on port", PORT, `(http://localhost:${PORT})`)
