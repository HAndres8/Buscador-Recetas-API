import ConnectionSupabase from "../config/Connection"
import { Receta, ResumenReceta } from "../types/receta"
import { analizarRecetas, filtroCaracteristicas, validarPrompt } from "../utils/modelos"
import { embeddingSolicitud } from "../utils/embeddings"

class RecetaService {
   private static readonly NIVEL_DE_ACEPTACION = 0.585
   private static readonly NUMERO_DE_RECETAS = 16
   private static readonly NUMERO_DE_RECETAS_EXTRA = 30 - this.NUMERO_DE_RECETAS

   // Muestra información de una receta en especifico
   public static async getReceta(idReceta: number): Promise<{ data: Receta|null, error: any }> {
      let result: Receta | null = null
      const supabase = ConnectionSupabase()

      // Obtener toda la informacion relacionada a esa receta
      const { data, error } = await supabase.from("Receta")
         .select(`*,
                  categorias: Categoria(id, nombre,grupo),
                  ingredientes: IngredienteReceta(id_ingrediente_receta, ingrediente: Ingrediente(nombre), cantidad, especificacion)`)
         .eq("id", idReceta)
         .single()
      
      if (data) {
         // Extraer el nombre del ingrediente fuera del objeto
         const ingredientesFinal = data.ingredientes.map((ingre) => ({
            id: ingre.id_ingrediente_receta,
            nombre: ingre.ingrediente.nombre,
            cantidad: ingre.cantidad,
            especificacion: ingre.especificacion,
         }))

         result = {
            ...data,
            ingredientes: ingredientesFinal,
         }
      }

      return { data: result, error }
   }

   // Muestra un resumen de varias de las recetas
   public static async getRecetas(pais: string|null, categoria: string|null, page: number): Promise<{ data: ResumenReceta[]|null, count: number, error: any }> {
      const supabase = ConnectionSupabase()
      // Bloques de 10 recetas por pagina
      const desde = (page - 1) * 10
      const hasta = desde + 9

      // Buscar recetas de ese país en especifico
      if (pais) {
         const { data, count, error } = await supabase.from("Receta")
            .select(`id, nombre, pais, duracion, porciones, dificultad, imagen_url,
                     categorias: Categoria(id, nombre, grupo)`,
                     { count: "exact" })
            .eq("pais", pais)
            .order("nombre", { ascending: true })
            .range(desde,hasta)

         return { data, count: count ?? 0, error }
      }
      // Buscar recetas de esa categoria en especifico
      if (categoria) {
         // Obtener las recetas que pertenecen a esa categoria
         const { data: categoriaData, error: errorCategoria } = await supabase.from("Categoria")
            .select("Receta(id)")
            .eq("nombre", categoria)
            .single()
         
         if (errorCategoria) {
            return { data: categoriaData, count: 0, error: errorCategoria }
         }
         
         const recetasIDs = categoriaData?.Receta.map(receta => receta.id) || []

         // Buscar las recetas segun los IDs obtenidos anteriormente
         const { data: recetasData, count, error: errorReceta } = await supabase.from("Receta")
            .select(`id, nombre, pais, duracion, porciones, dificultad, imagen_url,
                     categorias: Categoria(id, nombre, grupo)`,
                     { count: "exact" })
            .in("id", recetasIDs)
            .order("nombre", { ascending: true })
            .range(desde,hasta)

         return { data: recetasData, count: count ?? 0, error: errorReceta }
      }

      // Si no se especifica ninguna, se devuelven en general
      const { data, count, error } = await supabase.from("Receta")
         .select(`id, nombre, pais, duracion, porciones, dificultad, imagen_url,
                  categorias: Categoria(id, nombre, grupo)`,
                  { count: "exact" })
         .order("nombre", { ascending: true })
         .range(desde,hasta)
      
      return { data, count: count ?? 0, error }
   }

   // Muestra las recetas recomendadas segun el prompt del usuario. Si es especifican categorias e ingredientes, los resultados seran mejores
   public static async getMejoresRecetas(prompt: string): Promise<{ data: { mejores: ResumenReceta[], extra: ResumenReceta[] }|null, error: any }> {
      // Comprobar que el prompt sea adecuado para recetas
      const promptValido = await validarPrompt(prompt)
      if (!promptValido) {
         return { data: null, error: new Error('Solicitud no procesada. Intenta especificar que vas a preparar recetas') }
      }

      const supabase = ConnectionSupabase()

      // Extraer cierta estructura y filtros del prompt
      const estructura = await filtroCaracteristicas(prompt)
      const { porcion, porcionMAX, porcionMIN, duracion, duracionMAX, duracionMIN, tiempo } = estructura.especifico
      const { porcionMAXGen, porcionMINGen, duracionMAXGen, duracionMINGen } = estructura.generico
      
      const primerFiltro = (tiempo?.length > 0) || (porcion != null) || (porcionMAX != null) || (porcionMIN != null) || (duracion != null) || (duracionMAX != null) || (duracionMIN != null)
      const primerFiltroGenerico = (porcion != null) || (duracion != null)
      
      let queryEspecifica = supabase.from("Receta").select("id, Categoria!inner()") // inner para trabajar directamente con Categoria
      let queryGenerica = supabase.from("Receta").select("id, Categoria!inner()")
      
      // Si se especifican porciones o duracion puntuales, se tabaja con un rango en la generica por si no hay suficientes
      // recetas recomendadas justo como se solicita. Si se especifican rangos en porciones o duracion, se trabaja solo con
      // esos y no se evaluaria esa caracteristica en la generica
      if (tiempo?.length > 0) queryEspecifica = queryEspecifica.in("Categoria.nombre", tiempo)
      
      if (porcion != null) {
         if (tiempo?.length > 0) queryGenerica = queryGenerica.in("Categoria.nombre", tiempo)
         if (porcionMAXGen != null) queryGenerica = queryGenerica.lte("porciones", porcionMAXGen)
         if (porcionMINGen != null) queryGenerica = queryGenerica.gte("porciones", porcionMINGen)
         
         queryEspecifica = queryEspecifica.eq("porciones", porcion)
      } else {
         if (porcionMAX != null) queryEspecifica = queryEspecifica.lte("porciones", porcionMAX)
         if (porcionMIN != null) queryEspecifica = queryEspecifica.gte("porciones", porcionMIN)
      }

      if (duracion != null) {
         if (tiempo?.length > 0) queryGenerica = queryGenerica.in("Categoria.nombre", tiempo)
         if (duracionMAXGen != null) queryGenerica = queryGenerica.lte("duracion", duracionMAXGen)
         if (duracionMINGen != null) queryGenerica = queryGenerica.gte("duracion", duracionMINGen)
         
         queryEspecifica = queryEspecifica.eq("duracion", duracion)
      } else {
         if (duracionMAX != null) queryEspecifica = queryEspecifica.lte("duracion", duracionMAX)
         if (duracionMIN != null) queryEspecifica = queryEspecifica.gte("duracion", duracionMIN)
      }


      const solicitudUsuario = await embeddingSolicitud(prompt)
      if (!solicitudUsuario) {
         return { data: null, error: new Error('No se pudo procesar la solicitud del usuario') }
      }

      let idsMejoresRecetas:number[] = []
      let cantidadRecetas = 0


      // * PARA OBTENER LAS MAS RECOMENDADAS *
      // Si se especifican ciertos valores en el prompt, se usa la funcion especifica
      // La funcion solo revisa las ids que se le pasan
      if (primerFiltro) {
         const { data, error } = await queryEspecifica
         if (error) {
            return { data: null, error }
         }

         const idsRecetasEspe = data.map(receta => receta.id)
         if (idsRecetasEspe.length > 0) {
            const { data, error } = await supabase.rpc('match_recetas_especificas', {
               'query_embedding': solicitudUsuario,
               'ids_recetas': idsRecetasEspe,
               'match_threshold': this.NIVEL_DE_ACEPTACION,
               'match_count': this.NUMERO_DE_RECETAS
            })
            if (error) {
               return { data: null, error }
            }
            
            idsMejoresRecetas = data.map(r => r.id)
            cantidadRecetas += data.length
         }

         // Si faltan recetas recomendadas y se pueden usar los rangos establecidos de manera generica
         if ((cantidadRecetas < this.NUMERO_DE_RECETAS) && primerFiltroGenerico) {
            const { data, error } = await queryGenerica
            if (error) {
               return { data: null, error }
            }

            // No incluir las recetas que se almacenaron anteriormente
            const idsRecetasGene = data
               .filter(item => !idsMejoresRecetas.includes(item.id))
               .map(item => item.id)
            if (idsRecetasGene.length > 0) {
               const { data, error } = await supabase.rpc('match_recetas_especificas', {
                  'query_embedding': solicitudUsuario,
                  'ids_recetas': idsRecetasGene,
                  'match_threshold': this.NIVEL_DE_ACEPTACION,
                  'match_count': this.NUMERO_DE_RECETAS - cantidadRecetas
               })
               if (error) {
                  return { data: null, error }
               }
               
               idsMejoresRecetas.push(...data.map(r => r.id))
            }
         }
      } else {
         // Para aplicar la funcion global
         // Revisa todo menos las ids que se le pasan
         const { data, error } = await supabase.rpc('match_recetas_global', {
            'query_embedding': solicitudUsuario,
            'ids_recetas': [],
            'match_threshold': this.NIVEL_DE_ACEPTACION,
            'match_count': this.NUMERO_DE_RECETAS
         })
         if (error) {
            return { data: null, error }
         }
         
         idsMejoresRecetas = data.map(r => r.id)
      }


      // * PARA OBTENER LA SECCION "Puede interesarte" *
      // No se incluyen las mejores recetas que se encontraron en el primer filtro, la funcion revisa la base de datos
      // excluyendo las que se le pasen
      const { data: auxiliaresData, error: auxiliaresError } = await supabase.rpc('match_recetas_global', {
         'query_embedding': solicitudUsuario,
         'ids_recetas': idsMejoresRecetas,
         'match_threshold': this.NIVEL_DE_ACEPTACION,
         'match_count': this.NUMERO_DE_RECETAS_EXTRA
      })
      if (auxiliaresError) {
         return { data: null, error: auxiliaresError }
      }

      const idsRecetasAuxiliares = auxiliaresData.map(r => r.id)


      // * SEGUNDO FILTRO
      // [1] Obtener la informacion de las mejores para reclasificarla (por eso se trae mas cosas)
      // [2] Obtener informacion de las auxiliares
      const [mejoresRecetas, recetasExtra] = await Promise.all([
         supabase.from("Receta")
            .select(`id, nombre, pais, duracion, porciones, etiqueta_nutricional, dificultad, imagen_url,
                     categorias: Categoria(id, nombre, grupo),
                     ingredientes: IngredienteReceta(ingrediente: Ingrediente(nombre))`)
            .in("id", idsMejoresRecetas),
         supabase.from("Receta")
            .select(`id, nombre, pais, duracion, porciones, dificultad, imagen_url,
                     categorias: Categoria(id, nombre, grupo)`)
            .in("id", idsRecetasAuxiliares)
      ])

      const { data: mejoresRecetasData, error: errorMejoresRecetas } = mejoresRecetas
      const { data: recetasExtraData, error: errorRecetasExtra } = recetasExtra

      if (errorMejoresRecetas) {
         return { data: null, error: errorMejoresRecetas }
      }
      if (errorRecetasExtra) {
         return { data: null, error: errorRecetasExtra }
      }

      // Diccionario para acceder con mayor facilidad a los datos a la hora de entregar la ultima estructura
      const mejoresRecetasDict = Object.fromEntries(mejoresRecetasData.map(receta => [receta.id, receta]))
      const recetasAuxiliaresDict = Object.fromEntries(recetasExtraData.map(receta => [receta.id, receta]))

      // Estructuración del texto para reordenar la recomendacion
      const mejoresRecetasStr = mejoresRecetasData.map(receta => {
         const etiquetas = receta.etiqueta_nutricional.join(', ')
         const categorias = receta.categorias.map(c => c.nombre).join(', ')
         const ingredientes = receta.ingredientes.map(i => i.ingrediente.nombre).join(', ')

         const aux = `La receta con ID: ${receta.id}, se llama ${receta.nombre} y es típica de ${receta.pais}. Pertenece a las categorias: ${categorias}. Y usa los ingredientes: ${ingredientes}.
Adicionalmente tiene duración en minutos: ${receta.duracion}, porciones: ${receta.porciones}, dificultad: ${receta.dificultad} y etiquetas nutricionales como: ${etiquetas}.`
         
         return aux
      })

      if (mejoresRecetasStr.length > 0) {
         idsMejoresRecetas = await analizarRecetas(prompt,mejoresRecetasStr)
      }


      // Arreglar la estructura final
      let result: { mejores: ResumenReceta[], extra: ResumenReceta[] } = {
         mejores: [],
         extra: []
      }

      result.mejores = idsMejoresRecetas.map(id => generarResumen(mejoresRecetasDict[id]))
      result.extra = idsRecetasAuxiliares.map(id => generarResumen(recetasAuxiliaresDict[id]))

      return { data: result, error: null }
   }
}

function generarResumen(receta: any): ResumenReceta {
   return {
      id: receta.id,
      nombre: receta.nombre,
      pais: receta.pais,
      duracion: receta.duracion,
      porciones: receta.porciones,
      dificultad: receta.dificultad,
      imagen_url: receta.imagen_url,
      categorias: receta.categorias
   }
}

export default RecetaService