import { GoogleGenAI } from "@google/genai"
import ConnectionSupabase from "../config/Connection"

export async function embeddingReceta(tit: string, cate: string, ingre: string, difi: 'baja'|'media'|'alta'): Promise<string|null> {
   const llm = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
   })
   const dificultades = {
      baja: 'Baja',
      media: 'Media',
      alta: 'Alta'
   }

   const texto = `Esta receta se llama: ${tit}. Pertenece a las categorías: ${cate}. Los ingredientes necesarios son: ${ingre}. Su dificultad es: ${dificultades[difi]}`

   const result = await llm.models.embedContent({
      model: 'text-embedding-004',
      contents: texto,
      config: {
         taskType: 'RETRIEVAL_DOCUMENT'
      }
   })

   if (!result.embeddings || result.embeddings.length === 0) {
      throw new Error('No se encontraron embeddings en el resultado')
   }

   const embedding = JSON.stringify(result.embeddings[0].values) || null
   return embedding
}

export async function embeddingSolicitud(prompt: string): Promise<string|null> {
   const llm = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
   })

   const result = await llm.models.embedContent({
      model: 'text-embedding-004',
      contents: prompt,
      config: {
         taskType: 'RETRIEVAL_QUERY'
      }
   })

   if (!result.embeddings || result.embeddings.length === 0) {
      throw new Error('No se encontraron embeddings en el resultado')
   }

   const embedding = JSON.stringify(result.embeddings[0].values) || null
   return embedding
}


// Genera unos nuevos embeddings por la eliminacion o actualizacion de la categoria
export async function generar_embeddings_recetas(idsRecetas: number[]): Promise<{ id: number, embedding: string }[]> {
   const supabase = ConnectionSupabase()

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
      })
   )
}