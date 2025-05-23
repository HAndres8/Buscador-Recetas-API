import { Router } from "express"
import recetaController from "../controllers/RecetaController"

class RecetaRoute {
   public ApiRoute: Router

   constructor() {
      this.ApiRoute = Router()
      this.routesConfig()
   }

   public routesConfig() {
      this.ApiRoute.get("/receta/:id", recetaController.getRecetaById)
      this.ApiRoute.get("/listado", recetaController.getResumenRecetas)
      this.ApiRoute.post("/mejores", recetaController.getMejoresRecetas)
      this.ApiRoute.post("/crear-receta", recetaController.createReceta)
      this.ApiRoute.put("/actualizar-receta/:id", recetaController.updateReceta)
   }
}

const recetaRoute = new RecetaRoute()
export default recetaRoute.ApiRoute