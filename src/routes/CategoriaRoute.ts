import { Router } from "express"
import categoriaController from "../controllers/CategoriaController"
import { autenticarToken, autorizarToken } from "../middlewares/authMiddleware"

class CategoriaRoute {
   public ApiRoute: Router

   constructor() {
      this.ApiRoute = Router()
      this.routesConfig()
   }

   public routesConfig() {
      this.ApiRoute.get('/all', autenticarToken, autorizarToken, categoriaController.getCategorias)
      this.ApiRoute.post('/crear-categoria', autenticarToken, autorizarToken, categoriaController.createCategoria)
      this.ApiRoute.put('/actualizar-categoria/:id', autenticarToken, autorizarToken, categoriaController.updateCategoria)
      this.ApiRoute.delete('/eliminar-categoria/:id', autenticarToken, autorizarToken, categoriaController.deleteCategoria)
   }
}

const categoriaRoute = new CategoriaRoute()
export default categoriaRoute.ApiRoute