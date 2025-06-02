import { Database } from "./database"

export interface CuerpoToken {
   id: number
   rol: Database["public"]["Enums"]["roles"]
}