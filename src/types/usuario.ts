import { Database } from "./database"
import { CookieOptions } from "express"

export const COOKIE_OPTIONS: CookieOptions = {
   httpOnly: true,
   secure: false,          // Cambiar a true en produccion
   sameSite: 'lax'         // Cambiar a none en produccion
}

export interface CuerpoToken {
   id: number
   rol: Database["public"]["Enums"]["roles"]
}

declare global {
   namespace Express {
      interface Request {
         user?: CuerpoToken
      }
   }
}