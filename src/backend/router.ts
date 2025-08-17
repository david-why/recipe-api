import type { BunRequest } from "bun"

export class Router {
  routes: Record<string, Bun.RouterTypes.RouteHandlerObject<string>> = {}

  private addRoute<T extends string>(
    method: Bun.RouterTypes.HTTPMethod,
    path: T,
    handler: Bun.RouterTypes.RouteHandler<T>,
  ) {
    ;(this.routes[path] ??= {})[method] = (req, server) => {
      return handler(req, server)
    }
  }

  private getHandler(handler: Bun.RouterTypes.RouteHandler<string>) {
    return (req: BunRequest, server: Bun.Server) => {
      try {
        return handler(req, server)
      } catch (error) {
        console.error("Error in route handler:", error)
        return Response.json(
          { error: "Internal server error" },
          { status: 500 },
        )
      }
    }
  }

  get<T extends string>(path: T, handler: Bun.RouterTypes.RouteHandler<T>) {
    this.addRoute("GET", path, handler)
  }

  post<T extends string>(path: T, handler: Bun.RouterTypes.RouteHandler<T>) {
    this.addRoute("POST", path, handler)
  }
}
