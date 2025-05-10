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
      let primerFiltro = false
      let primerFiltroGenerico = false
      
      let queryEspecifica = supabase.from("Receta").select("id, Categoria!inner()") // inner para trabajar directamente con Categoria
      let queryGenerica = supabase.from("Receta").select("id, Categoria!inner()")
      
      // Si se especifican porciones o duracion puntuales, se tabaja con un rango en la generica por si no hay suficientes
      // recetas recomendadas justo como se solicita. Si se especifican rangos en porciones o duracion, se trabaja solo con
      // esos y no se evaluaria esa caracteristica en la generica
      if (tiempo?.length > 0) {
         queryEspecifica = queryEspecifica.in("Categoria.nombre", tiempo)
         primerFiltro = true
      }
      
      if (porcion != null) {
         if (tiempo?.length > 0) queryGenerica = queryGenerica.in("Categoria.nombre", tiempo)
         if (porcionMAXGen != null) queryGenerica = queryGenerica.lte("porciones", porcionMAXGen)
         if (porcionMINGen != null) queryGenerica = queryGenerica.gte("porciones", porcionMINGen)
         
         queryEspecifica = queryEspecifica.eq("porciones", porcion)
         primerFiltro = true
         primerFiltroGenerico = true
      } else {
         if (porcionMAX != null) {
            queryEspecifica = queryEspecifica.lte("porciones", porcionMAX)
            primerFiltro = true
         }
         if (porcionMIN != null) {
            queryEspecifica = queryEspecifica.gte("porciones", porcionMIN)
            primerFiltro = true
         }
      }

      if (duracion != null) {
         if (tiempo?.length > 0) queryGenerica = queryGenerica.in("Categoria.nombre", tiempo)
         if (duracionMAXGen != null) queryGenerica = queryGenerica.lte("duracion", duracionMAXGen)
         if (duracionMINGen != null) queryGenerica = queryGenerica.gte("duracion", duracionMINGen)
         
         queryEspecifica = queryEspecifica.eq("duracion", duracion)
         primerFiltro = true
         primerFiltroGenerico = true
      } else {
         if (duracionMAX != null) {
            queryEspecifica = queryEspecifica.lte("duracion", duracionMAX)
            primerFiltro = true
         }
         if (duracionMIN != null) {
            queryEspecifica = queryEspecifica.gte("duracion", duracionMIN)
            primerFiltro = true
         }
      }

      const solicitudUsuario = await embeddingSolicitud(prompt)
      let idsMejoresRecetas:number[] = []
      let cantidadRecetas = 0

      if (!solicitudUsuario) {
         return { data: null, error: new Error('No se pudo procesar la solicitud del usuario') }
      }


      // * PARA OBTENER LAS MAS RECOMENDADAS *
      // Si se especifican ciertos valores en el prompt, se usa la funcion especifica
      // Solo revisa las ids que se le pasan
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
               
               idsMejoresRecetas = [...idsMejoresRecetas, ...data.map(r => r.id)]
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
      let idsRecetasAuxiliares:number[] = []

      const { data: auxiliaresData, error: auxiliaresError } = await supabase.rpc('match_recetas_global', {
         'query_embedding': solicitudUsuario,
         'ids_recetas': idsMejoresRecetas,
         'match_threshold': this.NIVEL_DE_ACEPTACION,
         'match_count': this.NUMERO_DE_RECETAS_EXTRA
      })
      if (auxiliaresError) {
         return { data: null, error: auxiliaresError }
      }

      idsRecetasAuxiliares = auxiliaresData.map(r => r.id)


      // * SEGUNDO FILTRO
      // Obtener la informacion de las mejores para reclasificarla (por eso se trae mas cosas)
      const { data: mejoresRecetasData, error: errorMejoresRecetas } = await supabase.from("Receta")
         .select(`id, nombre, pais, duracion, porciones, etiqueta_nutricional, dificultad, imagen_url,
                  categorias: Categoria(id, nombre, grupo),
                  ingredientes: IngredienteReceta(ingrediente: Ingrediente(nombre))`)
         .in("id", idsMejoresRecetas)
      if (errorMejoresRecetas) {
         return { data: null, error: errorMejoresRecetas }
      }
      
      // Obtener la informacion de las auxiliares
      const { data: recetasExtraData, error: errorRecetasExtra } = await supabase.from("Receta")
         .select(`id, nombre, pais, duracion, porciones, dificultad, imagen_url,
                  categorias: Categoria(id, nombre, grupo)`)
         .in("id", idsRecetasAuxiliares)
      if (errorRecetasExtra) {
         return { data: null, error: errorRecetasExtra }
      }

      // Diccionario para acceder con mayor facilidad a los datos a la hora de entregar la ultima estructura
      let mejoresRecetasDict: { [key: number]: any } = {}
      if (mejoresRecetasData) {
         mejoresRecetasData.forEach(receta => {
            mejoresRecetasDict[receta.id] = receta
         })
      }

      let recetasAuxiliaresDict: { [key: number]: any } = {}
      if (recetasExtraData) {
         recetasExtraData.forEach(receta => {
            recetasAuxiliaresDict[receta.id] = receta
         })
      }

      // Estructuración del texto para reordenar la recomendacion
      let mejoresRecetasStr: string[] = []
      for (const receta of Object.values(mejoresRecetasDict)) {
         const etiquetas = receta.etiqueta_nutricional.join(', ')
         const categorias = receta.categorias.map((c:any) => c.nombre).join(', ')
         const ingredientes = receta.ingredientes.map((i:any) => i.ingrediente.nombre).join(', ')

         const aux = `La receta con ID: ${receta.id}, se llama ${receta.nombre} y es típica de ${receta.pais}. Pertenece a las categorias: ${categorias}. Y usa los ingredientes: ${ingredientes}.
Adicionalmente tiene duración en minutos: ${receta.duracion}, porciones: ${receta.porciones}, dificultad: ${receta.dificultad} y etiquetas nutricionales como: ${etiquetas}.`

         mejoresRecetasStr.push(aux)
      }

      if (mejoresRecetasStr.length > 0) {
         idsMejoresRecetas = await analizarRecetas(prompt,mejoresRecetasStr)
      }


      // Arreglar la estructura final
      let result: { mejores: ResumenReceta[], extra: ResumenReceta[] } = {
         mejores: [],
         extra: []
      }

      idsMejoresRecetas.forEach(id => {
         const receta = mejoresRecetasDict[id]
         const aux = {
            id: receta.id,
            nombre: receta.nombre,
            pais: receta.pais,
            duracion: receta.duracion,
            porciones: receta.porciones,
            dificultad: receta.dificultad,
            imagen_url: receta.imagen_url,
            categorias: receta.categorias
         }

         result.mejores.push(aux)
      })
      idsRecetasAuxiliares.forEach(id => {
         const receta = recetasAuxiliaresDict[id]
         const aux = {
            id: receta.id,
            nombre: receta.nombre,
            pais: receta.pais,
            duracion: receta.duracion,
            porciones: receta.porciones,
            dificultad: receta.dificultad,
            imagen_url: receta.imagen_url,
            categorias: receta.categorias
         }

         result.extra.push(aux)
      })

      return { data: result, error: null }
   }
}

export default RecetaService