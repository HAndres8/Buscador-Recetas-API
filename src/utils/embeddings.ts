import { GoogleGenAI } from '@google/genai'

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