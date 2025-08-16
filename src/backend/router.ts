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

  get<T extends string>(path: T, handler: Bun.RouterTypes.RouteHandler<T>) {
    this.addRoute("GET", path, handler)
  }

  post<T extends string>(path: T, handler: Bun.RouterTypes.RouteHandler<T>) {
    this.addRoute("POST", path, handler)
  }
}
