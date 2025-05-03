import { Database } from "./database"

export interface CategoriaReceta {
   id: number
   nombre: string
   grupo: Database["public"]["Enums"]["categorias"]
}

export interface IngredienteReceta {
   id: number
   nombre: string
   cantidad: string
   especificacion: string | null
}

export interface Receta {
   id: number
   nombre: string
   pais: string
   duracion: number
   porciones: number
   dificultad: Database["public"]["Enums"]["dificultades"]
   categoria: CategoriaReceta[]
   ingredientes: IngredienteReceta[]
   pasos: string[]
   etiqueta_nutricional: string[] | null
   imagen_url: string
}

export interface ResumenReceta {
   
}