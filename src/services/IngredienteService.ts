import ConnectionSupabase from "../config/Connection"
import { Ingrediente } from "../types/ingrediente"
import { RespuestaError } from "../types/error"
import { generar_embeddings_recetas } from "../utils/embeddings"

class IngredienteService {
   // Muestra todos los ingredientes
   public static async getIngredientes(): Promise<{ data: Ingrediente[]|null, error: RespuestaError|null }> {
      const supabase = ConnectionSupabase()

      const { data, error } = await supabase.from('Ingrediente')
         .select()
         .order('nombre', { ascending: true })
      if (error) {
         console.error({ details: error.details, message: error.message })
         return { data: null, error: { mensaje: 'No se puede procesar la solicitud', code: 500 }}
      }
      if (data.length == 0) {
         return { data: null, error: { mensaje: 'No existen ingredientes disponibles', code: 404 }}
      }

      return { data, error: null }
   }

   // Agrega un ingrediente a la BD
   public static async createIngrediente(nombreIng: string): Promise<{ idIngrediente: number|null, mensaje: string|null, error: RespuestaError|null }> {
      const supabase = ConnectionSupabase()

      const { data: existeIngrediente } = await supabase.from('Ingrediente')
         .select('id')
         .eq('nombre', nombreIng)
         .single()
      if (existeIngrediente) {
         return { idIngrediente: null, mensaje: null, error: { mensaje: 'Ya existe un ingrediente con el mismo nombre', code: 409 }}
      }

      const { data: ingredienteCreado, error: errorIngrediente } = await supabase.from('Ingrediente')
         .insert({nombre: nombreIng})
         .select('id')
         .single()
      if (errorIngrediente) {
         console.error({ details: errorIngrediente.details, message: errorIngrediente.message })
         return { idIngrediente: null, mensaje: null, error: { mensaje: 'No fue posible crear el ingrediente', code: 500 }}
      }

      return { idIngrediente: ingredienteCreado.id, mensaje: 'Ingrediente creado correctamente', error: null }
   }

   // Actualizar el nombre de un ingrediente
   public static async updateIngrediente(nombreIng: string, idIngrediente: number): Promise<{ mensaje: string|null, error: RespuestaError|null }> {
      const supabase = ConnectionSupabase()
      let nuevosEmbeddings: { id: number, embedding: string }[] = []

      const { data: existeIngrediente } = await supabase.from('Ingrediente')
         .select()
         .eq('id', idIngrediente)
         .single()
      if (!existeIngrediente) {
         return { mensaje: null, error: { mensaje: 'El ingrediente a actualizar no existe', code: 404 }}
      }

      // Actualizar primero para tomar el nuevo nombre en el embedding
      const { error: errorActualizar } = await supabase.from('Ingrediente')
         .update({nombre: nombreIng})
         .eq('id', idIngrediente)
      if (errorActualizar) {
         console.error({ details: errorActualizar.details, message: errorActualizar.message })
         return { mensaje: null, error: { mensaje: 'No fue posible actualizar el ingrediente', code: 500 }}
      }


      // Actualizar los embeddings de la recetas afectadas
      const { data: recetas, error: errorAfectadas } = await supabase.rpc('recetas_afectadas_por_ingrediente', {
         'p_ingrediente_id': idIngrediente
      })
      if (errorAfectadas) {
         console.error({ details: errorAfectadas.details, message: errorAfectadas.message })
         return { mensaje: null, error: { mensaje: 'No fue posible obtener las recetas afectadas', code: 500 }}
      }

      const idsRecetas = recetas.map(r => r.id)

      try {
         nuevosEmbeddings = await generar_embeddings_recetas(idsRecetas)
      } catch (e) {
         return { mensaje: null, error: { mensaje: (e as Error).message, code: 500 }}
      }


      // Actualizar las recetas
      try {
         await Promise.all(
            nuevosEmbeddings.map(async aux => {
               const { error: errorEmbeddings } = await supabase.from('Receta')
                  .update({embed_receta: aux.embedding})
                  .eq('id', aux.id)
               if (errorEmbeddings) {
                  console.error({ details: errorEmbeddings.details, message: errorEmbeddings.message })
                  throw new Error('No fue posible actualizar el embedding de la receta')
               }
            })
         )
      } catch (e) {
         return { mensaje: null, error: { mensaje: (e as Error).message, code: 500 }}
      }


      return { mensaje: 'Ingrediente actualizado correctamente', error: null }
   }

   // Eliminar un ingrediente
   public static async deleteIngrediente(idIngrediente: number): Promise<{ mensaje: string|null, error: RespuestaError|null }> {
      const supabase = ConnectionSupabase()
      let nuevosEmbeddings: { id: number, embedding: string }[] = []

      const { error: errorBuscarIngrediente } = await supabase.from('Ingrediente')
         .select('id')
         .eq('id', idIngrediente)
         .single()
      if (errorBuscarIngrediente) {
         console.error({ details: errorBuscarIngrediente.details, message: errorBuscarIngrediente.message })
         return { mensaje: null, error: { mensaje: 'El ingrediente a eliminar no existe', code: 404 }}
      }


      // Buscar las ids de las recetas antes de eliminar el ingrediente
      const { data: recetas, error: errorAfectadas } = await supabase.rpc('recetas_afectadas_por_ingrediente', {
         'p_ingrediente_id': idIngrediente
      })
      if (errorAfectadas) {
         console.error({ details: errorAfectadas.details, message: errorAfectadas.message })
         return { mensaje: null, error: { mensaje: 'No fue posible obtener las recetas afectadas', code: 500 }}
      }

      const idsRecetas = recetas.map(r => r.id)


      // Eliminar el ingrediente
      const { error: errorEliminarIngrediente } = await supabase.from('Ingrediente')
         .delete()
         .eq('id', idIngrediente)
      if (errorEliminarIngrediente) {
         console.error({ details: errorEliminarIngrediente.details, message: errorEliminarIngrediente.message })
         return { mensaje: null, error: { mensaje: 'No fue posible eliminar el ingrediente', code: 500 }}
      }


      // Actualizar los embeddings de las recetas afectadas
      try {
         nuevosEmbeddings = await generar_embeddings_recetas(idsRecetas)
      } catch (e) {
         return { mensaje: null, error: { mensaje: (e as Error).message, code: 500 }}
      }


      // Actualizar las recetas
      try {
         await Promise.all(
            nuevosEmbeddings.map(async aux => {
               const { error: errorEmbeddings } = await supabase.from('Receta')
                  .update({embed_receta: aux.embedding})
                  .eq('id', aux.id)
               if (errorEmbeddings) {
                  console.error({ details: errorEmbeddings.details, message: errorEmbeddings.message })
                  throw new Error('No fue posible actualizar el embedding de la receta')
               }
            })
         )
      } catch (e) {
         return { mensaje: null, error: { mensaje: (e as Error).message, code: 500 }}
      }

      return { mensaje: 'Ingrediente eliminado correctamente', error: null }
   }
}

export default IngredienteService