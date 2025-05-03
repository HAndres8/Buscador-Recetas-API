import { Router } from "express"
import recetaController from "../controllers/RecetaController"

class RecetaRoute {
   public ApiRoute: Router

   constructor() {
      this.ApiRoute = Router()
      this.routesConfig()
   }

   public routesConfig() {
      this.ApiRoute.get("/:id", recetaController.getRecetaById)
   }
}

const recetaRoute = new RecetaRoute()
export default recetaRoute.ApiRoute