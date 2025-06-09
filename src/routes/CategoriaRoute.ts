import { Router } from "express"
import categoriaController from "../controllers/CategoriaController"

class CategoriaRoute {
   public ApiRoute: Router

   constructor() {
      this.ApiRoute = Router()
      this.routesConfig()
   }

   public routesConfig() {
      this.ApiRoute.get('/all', categoriaController.getCategorias)
   }
}

const categoriaRoute = new CategoriaRoute()
export default categoriaRoute.ApiRoute