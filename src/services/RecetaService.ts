import ConnectionSupabase from "../config/Connection"
import { Receta } from "types/receta"

class RecetaService {

   // Muestra información de una receta en especifico
   public static async getReceta(idReceta: number): Promise<{ data: Receta | null, error: any }> {
      let result: Receta | null = null

      const supabase = ConnectionSupabase()
      const { data, error } = await supabase.from("Receta")
         .select(`*,
                  categorias: Categoria(id, nombre,grupo),
                  ingredientes: IngredienteReceta(id_ingrediente_receta, ingrediente: Ingrediente(nombre), cantidad, especificacion)`)
         .eq("id", idReceta)
         .single()
      
      if (data) {
         const ingredientesFinal = data.ingredientes.map((ingre) => ({
            id: ingre.id_ingrediente_receta,
            nombre: ingre.ingrediente.nombre,
            cantidad: ingre.cantidad,
            especificacion: ingre.especificacion,
         }))

         result = {
            id: data.id,
            nombre: data.nombre,
            pais: data.pais,
            duracion: data.duracion,
            porciones: data.porciones,
            dificultad: data.dificultad,
            categoria: data.categorias,
            ingredientes: ingredientesFinal,
            pasos: data.pasos,
            etiqueta_nutricional: data.etiqueta_nutricional,
            imagen_url: data.imagen_url
         }
      }

      return { data: result, error }
   }

   // Muestra un resumen de varias de las recetas
}

export default RecetaService