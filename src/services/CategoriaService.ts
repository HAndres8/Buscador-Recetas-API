import ConnectionSupabase from "../config/Connection"
import { Categoria } from "types/categoria"
import { RespuestaError } from "types/error"

class CategoriaService {
   // Muestra todas las categorías
   public static async getCategorias(): Promise<{ data: Categoria[]|null, error: RespuestaError|null }> {
      const supabase = ConnectionSupabase()

      const { data, error } = await supabase.from("Categoria")
         .select()
         .order("nombre", { ascending: true })
      if (error) {
         console.error({ details: error.details, message: error.message })
         return { data: null, error: { mensaje: 'No se puede procesar la solicitud', code: 500}}
      }
      if (data.length == 0) {
         return { data: null, error: { mensaje: 'No existen categorías disponibles', code: 404}}
      }

      return { data, error: null }
   }
}

export default CategoriaService