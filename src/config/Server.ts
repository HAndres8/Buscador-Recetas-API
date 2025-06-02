import cors from "cors"
import morgan from "morgan"
import dotenv from "dotenv"
import cookieParser from 'cookie-parser'
import express from "express"
import { Express } from "express"
import ConnectionSupabase from "./Connection"
import RecetaRoute from "../routes/RecetaRoute"
import UsuarioRoute from "../routes/UsuarioRoute"

class Server {
   public app: Express
   
   constructor() {
      dotenv.config({ path: '.env' })
      ConnectionSupabase()
      this.app = express()
      this.startConf()
      this.startRoutes()
   }

   public startConf() {
      this.app.set('PORT', process.env.PORT || 3000)
      this.app.use(cors())
      this.app.use(morgan('dev'))
      this.app.use(cookieParser())
      this.app.use(express.json({ limit: '50MB' }))
      this.app.use(express.urlencoded({ extended: true }))
   }

   public startRoutes() {
      this.app.use('/api/recetas', RecetaRoute)
      this.app.use('/api/usuarios', UsuarioRoute)
   }

   public startServer() {
      this.app.listen(this.app.get('PORT'), () => {
         console.log('Backend listo en el puerto', this.app.get('PORT'))
      })
   }
}

export default Server