import { SwaggerUIBundle } from "swagger-ui-dist"
import "swagger-ui-dist/swagger-ui.css"

window.addEventListener("load", () => {
  const node = document.getElementById("openapi-docs")
  SwaggerUIBundle({ url: "/openapi.json", domNode: node })
})
