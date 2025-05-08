import { JsonOutputParser } from '@langchain/core/output_parsers'
import { ChatPromptTemplate } from '@langchain/core/prompts'
import { ChatGoogleGenerativeAI } from '@langchain/google-genai'

export async function filtroCaracteristicas(prompt: string): Promise<Record<string, any>> {
   const llm = new ChatGoogleGenerativeAI({
      model: 'gemini-2.0-flash-lite',
      temperature: 0,
      apiKey: process.env.GEMINI_API_KEY,
   })

   const momentos = 'Almuerzo, Desayuno, Cena, Merienda, Postre'
   const estructura = `especifico: {
         "porcionMAX": "number" | null,
         "porcionMIN": "number" | null,
         "porcion": "number | null",
         "tiempo": "[string] | null",
         "duracionMAX": "number" | null,
         "duracionMIN": "number" | null,
         "duracion": "number" | null
      }, generico: {
         "porcionMAX": "number" | null,
         "porcionMIN": "number" | null,
         "duracionMAX": "number" | null,
         "duracionMIN": "number" | null,
      }`

   const systemTemplate = `MUY IMPORTANTE: Debes retornar SOLO un objeto JSON con la sigueinte estructura: {estruct}
   
   No incluyas ningun texto adicional, ni explicaciones, ni formatos. Actua como un asistente experto en recetas de cocina y devuelve el JSON con los campos rellenados de la siguiente manera:
   
   - "porciones" hace referencia a la cantidad de porciones que se pueden servir.
   - "tiempo" hace referencia al momento en el que se sirve ({momentos}).
   - "duracion" hace referencia al tiempo en minutos que tarda en hacerse la receta.

   PORCIONES:
   - Si el prompt especifica una porcion puntual, debes rellenar el campo "porcion" en "especifico".
   Los campos "porcionMAX" y "porcionMIN" en "especifico" quedaran en null.
   - Si el prompt especifica porciones en un rango explícito, debes rellenar los campos "porcionMAX" y "porcionMIN" en "especifico".
   El campo "porcion" en "especifico" quedara en null.
   - Si el prompt especifica porcion relativa:
      - "Mas de X": rellena en "especifico" la "porcionMIN" = X, y la "porcionMAX" = null.
      - "Menos de X": rellena en "especifico" la "porcionMIN" = null, y la "porcionMAX" = X.
      - En todos estos casos, el campo "porcion" en "especifico" debe quedar en null.
   - Si el prompt no especifica porciones de ninguna manera, los campos "porcionMAX", "porcionMIN" y "porcion" en "especifico" quedaran en null.

   DURACIONES:
   - Si el prompt especifica una duracion puntual, debes rellenar el campos "duracion" en "especifico".
   Los campos "duracionMAX" y "duracionMIN" en "especifico" quedaran en null.
   - Si el prompt especifica duracion en un rango explícito, debes rellenar los campos "duracionMAX" y "duracionMIN" en "especifico".
   El campo "duracion" en "especifico" quedara en null.
   - Si el prompt especifica duracion relativa:
      - "Mas de Y": rellena en "especifico" la "duracionMIN" = Y, y la "duracionMAX" = null.
      - "Menos de Y": rellena en "especifico" la "duracionMIN" = null, y la "duracionMAX" = Y.
      - En todos estos casos, el campo "duracion" en "especifico" debe quedar en null.
   - Si el prompt no especifica duraciones de ninguna manera, los campos "duracionMAX", "duracionMIN" y "duracion" en "especifico" quedaran en null.

   CAMPOS GENERICOS:
   - Si el prompt especifica una porcion puntual, establece un rango prudente para rellenar los campos "porcionMAX" y "porcionMIN" en "generico".
   - Si el prompt especifica una duracion puntual, establece un rango prudente para rellenar los campos "duracionMAX" y "duracionMIN" en "generico".
   - Si el prompt especifica porciones en un rango (explícito o relativo), los campos "porcionMAX" y "porcionMIN" en "generico" quedaran en null.
   - Si el prompt especifica duraciones en un rango (explícito o relativo), los campos "duracionMAX" y "duracionMIN" en "generico" quedaran en null.
   
   MOMENTO DE SERVIR:
   - Si el prompt especifica el momento en que se sirve la receta, debes rellenar el campo "tiempo" en "especifico" con los valores permitidos en {momentos}.
   - Si el prompt no especifica el momento en que se sirve la receta, el campo "tiempo" en "especifico" quedara en null.`

   const humanTemplate = `Teniendo en cuenta el siguiente prompt: {prompt}. Entrega la estructura solicitada.`

   const chatTemplate = ChatPromptTemplate.fromMessages([
      ['system', systemTemplate],
      ['user', humanTemplate],
   ])

   const parser = new JsonOutputParser()
   const chain = llm.pipe(parser)

   const rta = await chatTemplate.invoke({
      momentos: momentos,
      estruct: estructura,
      prompt: prompt
   })

   const result = await chain.invoke(rta)
   return result
}