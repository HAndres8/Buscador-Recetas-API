import ConnectionSupabase from "../config/Connection"
import { CrearReceta, BodyCrearReceta, Receta, ResumenReceta, IngredienteReceta } from "../types/receta"
import { analizarRecetas, filtroCaracteristicas, validarPrompt } from "../utils/modelos"
import { embeddingReceta, embeddingSolicitud } from "../utils/embeddings"

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

   // Agrega una receta a la BD y la relaciona con sus categorias e ingredientes
   // * Falta el cargado de imagenes desde el front
   public static async createReceta(body: BodyCrearReceta): Promise<{ mensaje: string|null, error: any }> {
      const supabase = ConnectionSupabase()
      let nuevaReceta: CrearReceta = {
         nombre: body.nombre,
         pasos: body.pasos,
         pais: body.pais,
         duracion: body.duracion,
         porciones: body.porciones,
         etiqueta_nutricional: body.etiquetas,
         dificultad: body.dificultad,
         imagen_url: body.imagen,
         embed_receta: ''
      }
      const { categorias, ingredientes } = body

      if ((categorias.length == 0) || (ingredientes.length == 0)) {
         return { mensaje: null, error: new Error('Debes indicar las categorias e ingredientes de la receta') }
      }

      const { data: existeReceta } = await supabase.from("Receta")
         .select('id')
         .eq("nombre", nuevaReceta.nombre)
         .single()
      if (existeReceta) {
         return { mensaje: null, error: new Error('No es posible agregar la receta, ya existe una con el mismo nombre') }
      }


      const nombresCategorias = categorias.map(c => c.nombre).join(', ')
      const nombresIngredientes = ingredientes.map(i => i.nombre).join(', ')
      const embeddingGenerado = await embeddingReceta(nuevaReceta.nombre, nombresCategorias, nombresIngredientes, nuevaReceta.dificultad)
      if (!embeddingGenerado) {
         return { mensaje: null, error: new Error('No se pudo generar el embedding de la receta') }
      }
      nuevaReceta.embed_receta = embeddingGenerado
      
      const { data: nuevaRecetaData, error: errorNuevaReceta } = await supabase.from("Receta")
         .insert(nuevaReceta)
         .select('id')
         .single()
      if (errorNuevaReceta) {
         return { mensaje: 'No fue posible crear la receta', error: errorNuevaReceta }
      }

      
      const registrosCat = categorias.map(c => ({id_categoria: c.id, id_receta: nuevaRecetaData.id}))
      const registrosIng = ingredientes.map(i => ({id_ingrediente: i.id, id_receta: nuevaRecetaData.id, cantidad: i.cantidad, especificacion: i.especificacion}))
      
      const [dataCategorias, dataIngredientes] = await Promise.all([
         supabase.from("CategoriaReceta")
            .insert(registrosCat),
         supabase.from("IngredienteReceta")
            .insert(registrosIng)
      ])

      const { error: errorRelacionCategoria } = dataCategorias
      const { error: errorRelacionIngrediente } = dataIngredientes

      if (errorRelacionCategoria) {
         await supabase.from("Receta").delete().eq("id", nuevaRecetaData.id)
         return { mensaje: 'Fallo al relacionar las categorias', error: errorRelacionCategoria }
      }
      if (errorRelacionIngrediente) {
         await supabase.from("Receta").delete().eq("id", nuevaRecetaData.id)
         return { mensaje: 'Fallo al relacionar los ingredientes', error: errorRelacionIngrediente }
      }


      return { mensaje: 'Receta creada y relacionada correctamente', error: null }
   }

   // Actualizar la informacion de una receta
   // * Falta la actualizacion de imagenes desde el front
   public static async updateReceta(body: BodyCrearReceta, idReceta: number) {
      const supabase = ConnectionSupabase()
      let miReceta: CrearReceta = {
         nombre: body.nombre,
         pasos: body.pasos,
         pais: body.pais,
         duracion: body.duracion,
         porciones: body.porciones,
         etiqueta_nutricional: body.etiquetas,
         dificultad: body.dificultad,
         imagen_url: body.imagen,
         embed_receta: ''
      }
      const { categorias, ingredientes } = body

      if ((categorias.length == 0) || (ingredientes.length == 0)) {
         return { mensaje: null, error: new Error('Debes indicar las categorias e ingredientes de la receta') }
      }

      const { data: existeReceta } = await supabase.from("Receta")
         .select(`nombre, dificultad, embed_receta,
                  categorias: Categoria(id, nombre),
                  ingredientes: IngredienteReceta(ingrediente: Ingrediente(id, nombre))`)
         .eq("id", idReceta)
         .single()
      if (!existeReceta) {
         return { mensaje: null, error: new Error('No se encuentra la ID de la receta a actualizar') }
      }


      // Comprobar si los campos claves del embedding fueron cambiados, compara los del body con los de la BD
      // Si hay cambios se regenera el embedding, y si no se toma el almacenado
      const cambios = comprobarCambiosEmbedding(miReceta.nombre, miReceta.dificultad, categorias, ingredientes, existeReceta)
      if (cambios.otro || cambios.categoria || cambios.ingrediente) {
         const nombresCategorias = categorias.map(c => c.nombre).join(', ')
         const nombresIngredientes = ingredientes.map(i => i.nombre).join(', ')
         const embeddingGenerado = await embeddingReceta(miReceta.nombre, nombresCategorias, nombresIngredientes, miReceta.dificultad)
         if (!embeddingGenerado) {
            return { mensaje: null, error: new Error('No se pudo generar el embedding de la receta') }
         }
         miReceta.embed_receta = embeddingGenerado
      } else {
         miReceta.embed_receta = existeReceta.embed_receta
      }

      const { error: errorActualizar } = await supabase.from("Receta")
         .update(miReceta)
         .eq('id', idReceta)
      if (errorActualizar) {
         return { mensaje: 'No fue posible actualizar la receta', error: errorActualizar }
      }


      // Si cambia las categorias, desrelacionar y relacionar las que se pasen
      if (cambios.categoria) {
         const res = await relacionesCategorias(categorias, supabase, idReceta)
         if (res.error) {
            return { mensaje: 'Fallo al relacionar las categorias', error: res.error }
         }
      }

      // Esta por fuera porque en los cambios de ingredientes solo se valida el nombre, no las especificaciones
      // Siempre eliminar todas las relaciones de la receta y agrega las nuevas que se le pasen
      const res = await relacionesIngredientes(ingredientes, supabase, idReceta)
      if (res.error) {
         return { mensaje: 'Fallo al relacionar los ingredientes', error: res.error }
      }

      return { mensaje: 'Receta actualizada y relacionada correctamente', error: null }
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

// Se ordenan los arrays para comparar que cada valor sea el correspondiente con el nuevo, si alguno llegase a cambiar
// el orden ya no seria el mismo, indicando que se cambio alguna categoria o ingrediente
function comprobarCambiosEmbedding(nombre: string, difi: string, cate: any[], ingre: any[], actual: any): any {
   const nombreNuevo = nombre
   const dificultadNueva = difi
   const nombresCategoriasNuevas = cate.map(c => c.nombre).sort()
   const nombresIngredientesNuevos = ingre.map(i => i.nombre).sort()

   const nombreViejo = actual.nombre
   const dificultadVieja = actual.dificultad
   const nombresCategoriasViejas = actual.categorias.map((c:any) => c.nombre).sort()
   const nombresIngredientesViejos = actual.ingredientes.map((i:any) => i.ingrediente.nombre).sort()

   let cambios: {otro: boolean, categoria: boolean, ingrediente: boolean} = {
      otro: false,
      categoria: false,
      ingrediente: false
   }
   if (nombreNuevo !== nombreViejo) cambios.otro = true
   if (dificultadNueva !== dificultadVieja) cambios.otro = true

   if ((nombresCategoriasNuevas.length !== nombresCategoriasViejas.length) ||
      (!nombresCategoriasNuevas.every((val,i) => val === nombresCategoriasViejas[i]))
   ) cambios.categoria = true
   if ((nombresIngredientesNuevos.length !== nombresIngredientesViejos.length) ||
      (!nombresIngredientesNuevos.every((val,i) => val === nombresIngredientesViejos[i]))
   ) cambios.ingrediente = true

   return cambios
}

// Elimina todas las relaciones de la receta y agrega las que se pasan nuevas
async function relacionesCategorias(categoriasNew: any[], supabase: any, idReceta: number): Promise<{ error: any }> {
   const registrosCat = categoriasNew.map(c => ({id_categoria: c.id, id_receta: idReceta}))

   await supabase.from("CategoriaReceta")
      .delete()
      .eq("id_receta", idReceta)
   
   const { error } = await supabase.from("CategoriaReceta")
      .insert(registrosCat)
   
   return { error: error }
}

// Elimina todas las relaciones de la receta y agrega las que se pasan nuevas
async function relacionesIngredientes(ingredientesNew: IngredienteReceta[], supabase: any, idReceta: number): Promise<{ error: any }> {
   const registrosIng = ingredientesNew.map(i => ({id_ingrediente: i.id, id_receta: idReceta, cantidad: i.cantidad, especificacion: i.especificacion}))

   await supabase.from("IngredienteReceta")
      .delete()
      .eq("id_receta", idReceta)
   
   const { error } = await supabase.from("IngredienteReceta")
      .insert(registrosIng)
   
   return { error: error }
}

export default RecetaService