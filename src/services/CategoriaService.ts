import ConnectionSupabase from "../config/Connection"
import { BodyCrearCategoria, Categoria } from "../types/categoria"
import { generar_embeddings_recetas } from "../utils/embeddings"
import { RespuestaError } from "../types/error"

class CategoriaService {
   // Muestra todas las categorías
   public static async getCategorias(): Promise<{ data: Categoria[]|null, error: RespuestaError|null }> {
      const supabase = ConnectionSupabase()

      const { data, error } = await supabase.from('Categoria')
         .select()
         .order('nombre', { ascending: true })
      if (error) {
         console.error({ details: error.details, message: error.message })
         return { data: null, error: { mensaje: 'No se puede procesar la solicitud', code: 500 }}
      }
      if (data.length == 0) {
         return { data: null, error: { mensaje: 'No existen categorías disponibles', code: 404 }}
      }

      return { data, error: null }
   }

   // Agrega una categoría a la BD
   public static async createCategoria(body: BodyCrearCategoria): Promise<{ idCategoria: number|null, mensaje: string|null, error: RespuestaError|null }> {
      const supabase = ConnectionSupabase()
      
      const { data: existeCategoria } = await supabase.from('Categoria')
         .select('id')
         .eq('nombre', body.nombre)
         .single()
      if (existeCategoria) {
         return { idCategoria: null, mensaje: null, error: { mensaje: 'Ya existe una categoría con el mismo nombre', code: 409 }}
      }

      const { data: categoriaCreada, error: errorCategoria } = await supabase.from('Categoria')
         .insert(body)
         .select('id')
         .single()
      if (errorCategoria) {
         console.error({ details: errorCategoria.details, message: errorCategoria.message })
         return { idCategoria: null, mensaje: null, error: { mensaje: 'No fue posible crear la categoría', code: 500 }}
      }

      return { idCategoria: categoriaCreada.id, mensaje: 'Categoría creada correctamente', error: null }
   }

   // Actualizar la información de una categoría
   public static async updateCategoria(body: BodyCrearCategoria, idCategoria: number): Promise<{ mensaje: string|null, error: RespuestaError|null }> {
      const supabase = ConnectionSupabase()
      let nuevosEmbeddings: { id: number, embedding: string }[] = []

      const { data: existeCategoria } = await supabase.from('Categoria')
         .select()
         .eq('id', idCategoria)
         .single()
      if (!existeCategoria) {
         return { mensaje: null, error: { mensaje: 'La categoría a actualizar no existe', code: 404 }}
      }

      // Actualizar primero para tomar el nuevo nombre en el embedding
      const { error: errorActualizar } = await supabase.from('Categoria')
         .update(body)
         .eq('id', idCategoria)
      if (errorActualizar) {
         console.error({ details: errorActualizar.details, message: errorActualizar.message })
         return { mensaje: null, error: { mensaje: 'No fue posible actualizar la categoría', code: 500 }}
      }


      // Actualizar los embeddings de las recetas afectadas si cambia el nombre
      if (body.nombre !== existeCategoria.nombre) {
         const { data: recetas, error: errorAfectadas } = await supabase.rpc('recetas_afectadas_por_categoria', {
            'p_categoria_id': idCategoria
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
      }


      return { mensaje: 'Categoría actualizada correctamente', error: null }
   }

   // Eliminar una categoría
   public static async deleteCategoria(idCategoria: number): Promise<{ mensaje: string|null, error: RespuestaError|null }> {
      const supabase = ConnectionSupabase()
      let nuevosEmbeddings: { id: number, embedding: string }[] = []

      const { error: errorBuscarCategoria } = await supabase.from('Categoria')
         .select('id')
         .eq('id', idCategoria)
         .single()
      if (errorBuscarCategoria) {
         console.error({ details: errorBuscarCategoria.details, message: errorBuscarCategoria.message })
         return { mensaje: null, error: { mensaje: 'La categoría a eliminar no existe', code: 404 }}
      }


      // Buscar las ids de las recetas antes de eliminar la categoría
      const { data: recetas, error: errorAfectadas } = await supabase.rpc('recetas_afectadas_por_categoria', {
         'p_categoria_id': idCategoria
      })
      if (errorAfectadas) {
         console.error({ details: errorAfectadas.details, message: errorAfectadas.message })
         return { mensaje: null, error: { mensaje: 'No fue posible obtener las recetas afectadas', code: 500 }}
      }

      const idsRecetas = recetas.map(r => r.id)


      // Eliminar la categoria
      const { error: errorEliminarCategoria } = await supabase.from('Categoria')
         .delete()
         .eq('id', idCategoria)
      if (errorEliminarCategoria) {
         console.error({ details: errorEliminarCategoria.details, message: errorEliminarCategoria.message })
         return { mensaje: null, error: { mensaje: 'No fue posible eliminar la categoría', code: 500 }}
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

      return { mensaje: 'Categoría eliminada correctamente', error: null }
   }
}

export default CategoriaService