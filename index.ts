import { Router } from "./src/backend/router"
import docsPage from "./public/docs.html"

const PORT = process.env.PORT || 3000

const r = new Router()

function ok(data: any = null, message: string | null = null) {
  return Response.json({ data, message }, { status: 200 })
}

function error(message: string, status: number = 500) {
  return Response.json({ message, data: null }, { status })
}

r.get("/api", () => {
  return ok()
})

Bun.serve({
  routes: {
    ...r.routes,
    "/docs": docsPage,
    "/openapi.json": Bun.file("public/openapi.json"),
  },
  port: PORT,
})

console.info("Server started on port", PORT, `(http://localhost:${PORT})`)
