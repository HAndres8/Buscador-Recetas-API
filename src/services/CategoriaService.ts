import ConnectionSupabase from "../config/Connection"
import { BodyCrearCategoria, Categoria } from "../types/categoria"
import { RespuestaError } from "../types/error"

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

   // Agregar una categoría a la BD
   public static async createCategoria(body: BodyCrearCategoria): Promise<{ idCategoria: number|null, mensaje: string|null, error: RespuestaError|null }> {
      const supabase = ConnectionSupabase()
      
      const { data: existeCategoria } = await supabase.from('Categoria')
         .select('id')
         .eq('nombre', body.nombre)
         .single()
      if (existeCategoria) {
         return { idCategoria: null, mensaje: null, error: { mensaje: 'Ya existe una categoría con el mismo nombre', code: 409}}
      }

      const { data: categoriaCreada, error: errorCategoria } = await supabase.from('Categoria')
         .insert(body)
         .select('id')
         .single()
      if (errorCategoria) {
         console.error({ details: errorCategoria.details, message: errorCategoria.message })
         return { idCategoria: null, mensaje: null, error: { mensaje: 'No fue posible crear la categoría', code: 500 }}
      }

      return { idCategoria: categoriaCreada.id, mensaje: 'Categoría creada correctamente', error: null}
   }
}

export default CategoriaService