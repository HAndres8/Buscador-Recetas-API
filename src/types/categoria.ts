import { Database } from "./database";

export interface Categoria {
   id: number
   nombre: string
   grupo: Database["public"]["Enums"]["categorias"]
}