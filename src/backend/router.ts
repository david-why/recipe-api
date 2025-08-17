import type { BunRequest } from "bun"

export class Router {
  routes: Record<string, Bun.RouterTypes.RouteHandlerObject<string>> = {}

  private addRoute<T extends string>(
    method: Bun.RouterTypes.HTTPMethod,
    path: T,
    handler: Bun.RouterTypes.RouteHandler<T>,
  ) {
    ;(this.routes[path] ??= {})[method] = this.getHandler(handler)
  }

  private getHandler(handler: Bun.RouterTypes.RouteHandler<string>) {
    return async (req: BunRequest, server: Bun.Server) => {
      try {
        return await handler(req, server)
      } catch (error) {
        if (error instanceof HTTPError) {
          return Response.json({ error: error.data }, { status: error.status })
        }
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

export class HTTPError extends Error {
  constructor(
    public status: number,
    public data: any,
  ) {
    super(JSON.stringify(data))
    this.name = "HTTPError"
  }
}
