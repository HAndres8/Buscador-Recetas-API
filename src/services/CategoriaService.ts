import ConnectionSupabase from "../config/Connection"
import { BodyCrearCategoria, Categoria } from "../types/categoria"
import { embeddingReceta } from "../utils/embeddings"
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

      // Actualizar la categoria
      const { error: errorActualizar } = await supabase.from('Categoria')
         .update(body)
         .eq('id', idCategoria)
      if (errorActualizar) {
         console.error({ details: errorActualizar.details, message: errorActualizar.message })
         return { mensaje: null, error: { mensaje: 'No fue posible actualizar la categoría', code: 500 }}
      }


      // Actualizar los embeddings de las recetas afectadas si cambia el nombre
      if (body.nombre !== existeCategoria.nombre) {
         try {
            nuevosEmbeddings = await generar_embeddings_recetas(idCategoria)
         } catch (e) {
            return { mensaje: null, error: { mensaje: (e as Error).message, code: 500 }}
         }


         // Actualizar las recetas
         for (const aux of nuevosEmbeddings) {
            const { error: errorEmbeddings } = await supabase.from('Receta')
               .update({embed_receta: aux.embedding})
               .eq('id', aux.id)
            if (errorEmbeddings) {
               console.error({ details: errorEmbeddings.details, message: errorEmbeddings.message })
               return { mensaje: null, error: { mensaje: 'No fue posible actualizar el embedding de la receta', code: 500 }}
            }
         }
      }


      return { mensaje: 'Categoría actualizada correctamente', error: null }
   }
}


// Genera unos nuevos embeddings por la eliminacion o actualizacion de la categoria
async function generar_embeddings_recetas(idCategoria: number): Promise<{ id: number, embedding: string }[]> {
   const supabase = ConnectionSupabase()
   
   const { data: recetas, error: errorAfectadas } = await supabase.rpc('recetas_afectadas_por_categoria', {
      'p_categoria_id': idCategoria
   })
   if (errorAfectadas) {
      console.error({ details: errorAfectadas.details, message: errorAfectadas.message })
      throw new Error('No fue posible obtener las recetas afectadas')
   }

   const idsRecetas = recetas.map(r => r.id)
   const { data: recetasRelacionadas } = await supabase.from('Receta')
      .select(`id, nombre, dificultad, embed_receta,
               categorias: Categoria(id, nombre),
               ingredientes: IngredienteReceta(ingrediente: Ingrediente(id, nombre))`)
      .in('id', idsRecetas)
   
   if (!recetasRelacionadas || recetasRelacionadas.length == 0) throw new Error('No fue posible obtener las recetas afectadas')

   return await Promise.all(
      recetasRelacionadas.map(async receta => {
         const nombresCategorias = receta.categorias.map(c => c.nombre).join(', ')
         const nombresIngredientes = receta.ingredientes.map(i => i.ingrediente.nombre).join(', ')
         const embeddingGenerado = await embeddingReceta(receta.nombre, nombresCategorias, nombresIngredientes, receta.dificultad)
         
         if (!embeddingGenerado) throw new Error('No se puede generar el embedding de la receta')

         return {
            id: receta.id,
            embedding: embeddingGenerado
         }
      }
   ))
}

export default CategoriaService