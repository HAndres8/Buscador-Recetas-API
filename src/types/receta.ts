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
   categorias: CategoriaReceta[]
   ingredientes: IngredienteReceta[]
   pasos: string[]
   etiqueta_nutricional: string[]
   imagen_url: string
}

export interface ResumenReceta {
   id: number
   nombre: string
   pais: string
   duracion: number
   porciones: number
   dificultad: Database["public"]["Enums"]["dificultades"]
   categorias: CategoriaReceta[]
   imagen_url: string
}

export interface BodyCrearReceta {
   nombre: string
   pasos: string[]
   pais: string
   duracion: number
   porciones: number
   etiquetas: string[]
   dificultad: Database["public"]["Enums"]["dificultades"]
   imagen: string
   categorias: {
      id: number
      nombre: string
   }[]
   ingredientes: IngredienteReceta[]
}