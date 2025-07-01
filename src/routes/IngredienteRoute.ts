import { Router } from "express"
import ingredienteController from "../controllers/IngredienteController"
import { autenticarToken, autorizarToken } from "../middlewares/authMiddleware"

class IngredienteRoute {
   public ApiRoute: Router

   constructor() {
      this.ApiRoute = Router()
      this.routesConfig()
   }

   public routesConfig() {
      this.ApiRoute.get('/all', autenticarToken, autorizarToken, ingredienteController.getIngredientes)
      this.ApiRoute.post('/crear-ingrediente', autenticarToken, autorizarToken, ingredienteController.createIngrediente)
      this.ApiRoute.put('/actualizar-ingrediente/:id', autenticarToken, autorizarToken, ingredienteController.updateIngrediente)
      this.ApiRoute.delete('/eliminar-ingrediente/:id', autenticarToken, autorizarToken, ingredienteController.deleteIngrediente)
   }
}

const ingredienteRoute = new IngredienteRoute()
export default ingredienteRoute.ApiRoute