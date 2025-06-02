import { Router } from "express";
import usuarioController from "../controllers/UsuarioController";

class UsuarioRoute {
   public ApiRoute: Router

   constructor() {
      this.ApiRoute = Router()
      this.routesConfig()
   }

   public routesConfig() {
      this.ApiRoute.post('/register', usuarioController.createUser)
      this.ApiRoute.post('/login', usuarioController.login)
      this.ApiRoute.post('/logout', usuarioController.logout)
   }
}

const usuarioRoute = new UsuarioRoute()
export default usuarioRoute.ApiRoute