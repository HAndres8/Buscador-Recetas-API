import { Router } from "express"
import recetaController from "../controllers/RecetaController"
import { autenticarToken, autorizarToken } from "../middlewares/authMiddleware"

class RecetaRoute {
   public ApiRoute: Router

   constructor() {
      this.ApiRoute = Router()
      this.routesConfig()
   }

   public routesConfig() {
      this.ApiRoute.get('/receta/:id', recetaController.getRecetaById)
      this.ApiRoute.get('/listado', recetaController.getResumenRecetas)
      this.ApiRoute.post('/mejores', recetaController.getMejoresRecetas)
      this.ApiRoute.post('/crear-receta', autenticarToken, autorizarToken, recetaController.createReceta)
      this.ApiRoute.put('/actualizar-receta/:id', autenticarToken, autorizarToken, recetaController.updateReceta)
      this.ApiRoute.delete('/eliminar-receta/:id', autenticarToken, autorizarToken, recetaController.deleteReceta)
   }
}

const recetaRoute = new RecetaRoute()
export default recetaRoute.ApiRoute