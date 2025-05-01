import cors from "cors"
import morgan from "morgan"
import dotenv from "dotenv"
import express from "express"
import ConnectionSupabase from "./Connection"

class Server {
   public app: express.Application
   
   constructor() {
      dotenv.config({ path: ".env" })
      ConnectionSupabase()
      this.app = express()
      this.startConf()
      this.startRoutes()
   }

   public startConf() {
      this.app.set("PORT", process.env.PORT || 3000)
      this.app.use(cors())
      this.app.use(morgan("dev"))
      this.app.use(express.json({ limit: "50MB" }))
      this.app.use(express.urlencoded({ extended: true }))
   }

   public startRoutes() {

   }

   public startServer() {
      this.app.listen(this.app.get("PORT"), () => {
         console.log('Backend listo en el puerto', this.app.get("PORT"))
      })
   }
}

export default Server