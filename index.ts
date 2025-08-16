import { Router } from "./src/router"

const PORT = process.env.PORT || 3000

const r = new Router()

r.get("/", () => {
  return Response.json({ message: "Hello, World!" })
})

Bun.serve({
  routes: r.routes,
  port: PORT,
})

console.info("Server started on port", PORT, `(http://localhost:${PORT})`)
