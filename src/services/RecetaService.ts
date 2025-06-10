import ConnectionSupabase from "../config/Connection"
import { BodyCrearReceta, Receta, ResumenReceta } from "../types/receta"
import { analizarRecetas, filtroCaracteristicas, validarPrompt } from "../utils/modelos"
import { embeddingReceta, embeddingSolicitud } from "../utils/embeddings"
import { RespuestaError } from "../types/error"

class RecetaService {
   private static readonly NIVEL_DE_ACEPTACION = 0.585
   private static readonly NUMERO_DE_RECETAS = 16
   private static readonly NUMERO_DE_RECETAS_EXTRA = 30 - this.NUMERO_DE_RECETAS

   // Muestra información de una receta en especifico
   public static async getReceta(idReceta: number): Promise<{ data: Receta|null, error: RespuestaError|null }> {
      const supabase = ConnectionSupabase()

      // Obtener toda la informacion relacionada a esa receta
      const { data, error } = await supabase.from('Receta')
         .select(`id, nombre, pais, duracion, porciones, dificultad, pasos, etiqueta_nutricional, imagen_url,
                  categorias: Categoria(id, nombre,grupo),
                  ingredientes: IngredienteReceta(ingrediente: Ingrediente(id, nombre), cantidad, especificacion)`)
         .eq('id', idReceta)
         .single()
      if (error) {
         console.error({ details: error.details, message: error.message })
         return { data: null, error: { mensaje: 'La receta no existe', code: 404}}
      }
      
      // Extraer el nombre del ingrediente fuera del objeto
      const ingredientesFinal = data.ingredientes.map((ingre) => ({
         id: ingre.ingrediente.id,
         nombre: ingre.ingrediente.nombre,
         cantidad: ingre.cantidad,
         especificacion: ingre.especificacion,
      }))

      const result: Receta = {
         ...data,
         ingredientes: ingredientesFinal,
      }

      return { data: result, error: null }
   }

   // Muestra un resumen de varias de las recetas
   public static async getRecetas(pais: string|null, categoria: string|null, page: number): Promise<{ data: ResumenReceta[]|null, count: number, error: RespuestaError|null }> {
      const supabase = ConnectionSupabase()
      // Bloques de 10 recetas por pagina
      const desde = (page - 1) * 10
      const hasta = desde + 9

      // Buscar recetas de ese país en especifico
      if (pais) {
         const { data, count, error } = await supabase.from('Receta')
            .select(`id, nombre, pais, duracion, porciones, dificultad, imagen_url,
                     categorias: Categoria(id, nombre, grupo)`,
                     { count: 'exact' })
            .eq('pais', pais)
            .order('nombre', { ascending: true })
            .range(desde,hasta)
         if (error) {
            console.error({ details: error.details, message: error.message })
            return { data: null, count: 0, error: { mensaje: 'No se puede procesar la solicitud', code: 500}}
         }
         if (data.length == 0) {
            return { data: null, count: 0, error: { mensaje: 'No existen recetas para ese país', code: 404}}
         }

         return { data, count: count!, error: null}      // Si no da error, count es un numero
      }
      // Buscar recetas de esa categoria en especifico
      if (categoria) {
         // Obtener las recetas que pertenecen a esa categoria
         const { data: categoriaData, error: errorCategoria } = await supabase.from('Categoria')
            .select('Receta(id)')
            .eq('nombre', categoria)
            .single()
         if (errorCategoria) {
            console.error({ details: errorCategoria.details, message: errorCategoria.message })
            return { data: null, count: 0, error: { mensaje: 'La categoria no existe', code: 404}}
         }
         
         const recetasIDs = categoriaData.Receta.map(receta => receta.id)
         if (recetasIDs.length == 0) {
            return { data: null, count: 0, error: { mensaje: 'No existen recetas para esa categoria', code: 404}}
         }

         // Buscar las recetas segun los IDs obtenidos anteriormente
         const { data: recetasData, count, error: errorReceta } = await supabase.from('Receta')
            .select(`id, nombre, pais, duracion, porciones, dificultad, imagen_url,
                     categorias: Categoria(id, nombre, grupo)`,
                     { count: 'exact' })
            .in('id', recetasIDs)
            .order('nombre', { ascending: true })
            .range(desde,hasta)
         if (errorReceta) {
            console.error({ details: errorReceta.details, message: errorReceta.message })
            return { data: null, count: 0, error: { mensaje: 'No se puede procesar la solicitud', code: 500}}
         }

         return { data: recetasData, count: count!, error: null }
      }

      // Si no se especifica ninguna, se devuelven en general
      const { data, count, error } = await supabase.from('Receta')
         .select(`id, nombre, pais, duracion, porciones, dificultad, imagen_url,
                  categorias: Categoria(id, nombre, grupo)`,
                  { count: 'exact' })
         .order('nombre', { ascending: true })
         .range(desde,hasta)
      if (error) {
         console.error({ details: error.details, message: error.message })
         return { data: null, count: 0, error: { mensaje: 'No se puede procesar la solicitud', code: 500}}
      }
      if (data.length == 0) {
         return { data: null, count: 0, error: { mensaje: 'No existen recetas disponibles', code: 404}}
      }
      
      return { data, count: count!, error: null }
   }

   // Muestra las recetas recomendadas segun el prompt del usuario. Si es especifican categorias e ingredientes, los resultados seran mejores
   public static async getMejoresRecetas(prompt: string): Promise<{ data: { mejores: ResumenReceta[], extra: ResumenReceta[] }|null, error: RespuestaError|null }> {
      // Comprobar que el prompt sea adecuado para recetas
      const promptValido = await validarPrompt(prompt)
      if (!promptValido) {
         return { data: null, error: { mensaje: 'Solicitud no procesada. Intenta especificar que vas a preparar recetas', code: 400 }}
      }

      const supabase = ConnectionSupabase()

      // Extraer cierta estructura y filtros del prompt
      const estructura = await filtroCaracteristicas(prompt)
      const { porcion, porcionMAX, porcionMIN, duracion, duracionMAX, duracionMIN, tiempo } = estructura.especifico
      const { porcionMAXGen, porcionMINGen, duracionMAXGen, duracionMINGen } = estructura.generico
      
      const primerFiltro = (tiempo?.length > 0) || (porcion != null) || (porcionMAX != null) || (porcionMIN != null) || (duracion != null) || (duracionMAX != null) || (duracionMIN != null)
      const primerFiltroGenerico = (porcion != null) || (duracion != null)
      
      let queryEspecifica = supabase.from('Receta').select('id, Categoria!inner()')       // inner para trabajar directamente con Categoria
      let queryGenerica = supabase.from('Receta').select('id, Categoria!inner()')
      
      // Si se especifican porciones o duracion puntuales, se tabaja con un rango en la generica por si no hay suficientes
      // recetas recomendadas justo como se solicita. Si se especifican rangos en porciones o duracion, se trabaja solo con
      // esos y no se evaluaria esa caracteristica en la generica
      if (tiempo?.length > 0) queryEspecifica = queryEspecifica.in('Categoria.nombre', tiempo)
      
      if (porcion != null) {
         if (tiempo?.length > 0) queryGenerica = queryGenerica.in('Categoria.nombre', tiempo)
         if (porcionMAXGen != null) queryGenerica = queryGenerica.lte('porciones', porcionMAXGen)
         if (porcionMINGen != null) queryGenerica = queryGenerica.gte('porciones', porcionMINGen)
         
         queryEspecifica = queryEspecifica.eq('porciones', porcion)
      } else {
         if (porcionMAX != null) queryEspecifica = queryEspecifica.lte('porciones', porcionMAX)
         if (porcionMIN != null) queryEspecifica = queryEspecifica.gte('porciones', porcionMIN)
      }

      if (duracion != null) {
         if (tiempo?.length > 0) queryGenerica = queryGenerica.in('Categoria.nombre', tiempo)
         if (duracionMAXGen != null) queryGenerica = queryGenerica.lte('duracion', duracionMAXGen)
         if (duracionMINGen != null) queryGenerica = queryGenerica.gte('duracion', duracionMINGen)
         
         queryEspecifica = queryEspecifica.eq('duracion', duracion)
      } else {
         if (duracionMAX != null) queryEspecifica = queryEspecifica.lte('duracion', duracionMAX)
         if (duracionMIN != null) queryEspecifica = queryEspecifica.gte('duracion', duracionMIN)
      }


      const solicitudUsuario = await embeddingSolicitud(prompt)
      if (!solicitudUsuario) {
         return { data: null, error: { mensaje: 'No se puede procesar la solicitud del usuario', code: 500 }}
      }

      let idsMejoresRecetas:number[] = []
      let cantidadRecetas = 0


      // * PARA OBTENER LAS MAS RECOMENDADAS *
      // Si se especifican ciertos valores en el prompt, se usa la funcion especifica
      // La funcion solo revisa las ids que se le pasan
      if (primerFiltro) {
         const { data, error } = await queryEspecifica
         if (error) {
            console.error({ details: error.details, message: error.message })
            return { data: null, error: { mensaje: 'No se puede procesar la solicitud', code: 500 }}
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
               console.error({ details: error.details, message: error.message })
               return { data: null, error: { mensaje: 'No se puede procesar la solicitud', code: 500 }}
            }
            
            idsMejoresRecetas = data.map(r => r.id)
            cantidadRecetas += data.length
         }

         // Si faltan recetas recomendadas y se pueden usar los rangos establecidos de manera generica
         if ((cantidadRecetas < this.NUMERO_DE_RECETAS) && primerFiltroGenerico) {
            const { data, error } = await queryGenerica
            if (error) {
               console.error({ details: error.details, message: error.message })
               return { data: null, error: { mensaje: 'No se puede procesar la solicitud', code: 500 }}
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
                  console.error({ details: error.details, message: error.message })
                  return { data: null, error: { mensaje: 'No se puede procesar la solicitud', code: 500 }}
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
            console.error({ details: error.details, message: error.message })
            return { data: null, error: { mensaje: 'No se puede procesar la solicitud', code: 500 }}
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
         console.error({ details: auxiliaresError.details, message: auxiliaresError.message })
         return { data: null, error: { mensaje: 'No se puede procesar la solicitud', code: 500 }}
      }

      const idsRecetasAuxiliares = auxiliaresData.map(r => r.id)


      if ((idsMejoresRecetas.length == 0) && (idsRecetasAuxiliares.length == 0 )) {
         return { data: null, error: { mensaje: 'No se pudo encontrar ninguna recomendación para la solicitud. Intenta reformularla', code: 404 }}
      }
      

      // * SEGUNDO FILTRO
      // [1] Obtener la informacion de las mejores para reclasificarla (por eso se trae mas cosas)
      // [2] Obtener informacion de las auxiliares
      const [mejoresRecetas, recetasExtra] = await Promise.all([
         supabase.from('Receta')
            .select(`id, nombre, pais, duracion, porciones, etiqueta_nutricional, dificultad, imagen_url,
                     categorias: Categoria(id, nombre, grupo),
                     ingredientes: IngredienteReceta(ingrediente: Ingrediente(nombre))`)
            .in('id', idsMejoresRecetas),
         supabase.from('Receta')
            .select(`id, nombre, pais, duracion, porciones, dificultad, imagen_url,
                     categorias: Categoria(id, nombre, grupo)`)
            .in('id', idsRecetasAuxiliares)
      ])

      const { data: mejoresRecetasData, error: errorMejoresRecetas } = mejoresRecetas
      const { data: recetasExtraData, error: errorRecetasExtra } = recetasExtra

      if (errorMejoresRecetas) {
         console.error({ details: errorMejoresRecetas.details, message: errorMejoresRecetas.message })
         return { data: null, error: { mensaje: 'No se puede procesar la solicitud', code: 500 }}
      }
      if (errorRecetasExtra) {
         console.error({ details: errorRecetasExtra.details, message: errorRecetasExtra.message })
         return { data: null, error: { mensaje: 'No se puede procesar la solicitud', code: 500 }}
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
   public static async createReceta(body: BodyCrearReceta): Promise<{ idReceta: number|null, mensaje: string|null, error: RespuestaError|null }> {
      const supabase = ConnectionSupabase()
      const { categorias, ingredientes } = body

      const { data: existeReceta } = await supabase.from('Receta')
         .select('id')
         .eq('nombre', body.nombre)
         .single()
      if (existeReceta) {
         return { idReceta: null, mensaje: null, error: { mensaje: 'Ya existe una receta con el mismo nombre', code: 409}}
      }


      const nombresCategorias = categorias.map(c => c.nombre).join(', ')
      const nombresIngredientes = ingredientes.map(i => i.nombre).join(', ')
      const embeddingGenerado = await embeddingReceta(body.nombre, nombresCategorias, nombresIngredientes, body.dificultad)
      if (!embeddingGenerado) {
         return { idReceta: null, mensaje: null, error: { mensaje: 'No se puede generar el embedding de la receta', code: 500 }}
      }
      const embed_receta = embeddingGenerado
      

      // Despues de aqui se llama a la funcion que maneja insercion y relaciones en un solo llamado
      const { data: idNuevaReceta, error: errorAgregar } = await supabase.rpc('agregar_recetas_con_relaciones', {
         'p_nombre': body.nombre,
         'p_pasos': body.pasos,
         'p_pais': body.pais,
         'p_duracion': body.duracion,
         'p_porciones': body.porciones,
         'p_etiquetas': body.etiquetas,
         'p_dificultad': body.dificultad,
         'p_imagen': body.imagen,
         'p_embedding': embed_receta,
         'p_categorias': categorias,
         'p_ingredientes': JSON.parse(JSON.stringify(ingredientes))          // No detecta la interfaz como JSON valido
      })
      if (errorAgregar) {
         console.error({ details: errorAgregar.details, message: errorAgregar.message })
         return { idReceta: null, mensaje: null, error: { mensaje: 'No fue posible crear la receta', code: 500 }}
      }

      return { idReceta: idNuevaReceta, mensaje: 'Receta creada y relacionada correctamente', error: null }
   }

   // Actualizar la informacion de una receta
   // * Falta la actualizacion de imagenes desde el front
   public static async updateReceta(body: BodyCrearReceta, idReceta: number): Promise<{ mensaje: string|null, error: RespuestaError|null }> {
      const supabase = ConnectionSupabase()
      const { categorias, ingredientes } = body
      let embed_receta = ''

      const { data: existeReceta } = await supabase.from('Receta')
         .select(`nombre, dificultad, embed_receta,
                  categorias: Categoria(id, nombre),
                  ingredientes: IngredienteReceta(ingrediente: Ingrediente(id, nombre))`)
         .eq('id', idReceta)
         .single()
      if (!existeReceta) {
         return { mensaje: null, error: { mensaje: 'La receta a actualizar no existe', code: 404 }}
      }


      // Comprobar si los campos claves del embedding fueron cambiados, compara los del body con los de la BD
      // Si hay cambios se regenera el embedding, y si no se toma el almacenado
      const cambios = comprobarCambiosEmbedding(body.nombre, body.dificultad, categorias, ingredientes, existeReceta)
      if (cambios) {
         const nombresCategorias = categorias.map(c => c.nombre).join(', ')
         const nombresIngredientes = ingredientes.map(i => i.nombre).join(', ')
         const embeddingGenerado = await embeddingReceta(body.nombre, nombresCategorias, nombresIngredientes, body.dificultad)
         if (!embeddingGenerado) {
            return { mensaje: null, error: { mensaje: 'No se puede generar el embedding de la receta', code: 500 }}
         }
         embed_receta = embeddingGenerado
      } else {
         embed_receta = existeReceta.embed_receta
      }


      // Despues de aqui se llama a la funcion que maneja actualizacion y relaciones en un solo llamado
      const { error: errorActualizar } = await supabase.rpc('actualizar_recetas_con_relaciones', {
         'p_id': idReceta,
         'p_nombre': body.nombre,
         'p_pasos': body.pasos,
         'p_pais': body.pais,
         'p_duracion': body.duracion,
         'p_porciones': body.porciones,
         'p_etiquetas': body.etiquetas,
         'p_dificultad': body.dificultad,
         'p_imagen': body.imagen,
         'p_embedding': embed_receta,
         'p_categorias': categorias,
         'p_ingredientes': JSON.parse(JSON.stringify(ingredientes))          // No detecta la interfaz como JSON valido
      })
      if (errorActualizar) {
         console.error({ details: errorActualizar.details, message: errorActualizar.message })
         return { mensaje: null, error: { mensaje: 'No fue posible actualizar la receta', code: 500 }}
      }

      return { mensaje: 'Receta actualizada y relacionada correctamente', error: null }
   }

   // Eliminar una receta y todas sus relaciones
   // * Falta la eliminacion de las imagenes
   public static async deleteReceta(idReceta: number): Promise<{ mensaje: string|null, error: RespuestaError|null }> {
      const supabase = ConnectionSupabase()

      const { error: errorBuscarReceta } = await supabase.from('Receta')
         .select('id')
         .eq('id', idReceta)
         .single()
      if (errorBuscarReceta) {
         console.error({ details: errorBuscarReceta.details, message: errorBuscarReceta.message })
         return { mensaje: null, error: { mensaje: 'La receta a eliminar no existe', code: 404}}
      }

      const { error: errorEliminarReceta } = await supabase.from('Receta')
         .delete()
         .eq('id', idReceta)
      if (errorEliminarReceta) {
         console.error({ details: errorEliminarReceta.details, message: errorEliminarReceta.message })
         return { mensaje: null, error: { mensaje: 'No fue posible eliminar la receta', code: 500 }}
      }
      
      return { mensaje: 'Receta eliminada correctamente', error: null }
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
function comprobarCambiosEmbedding(nombre: string, difi: string, cate: any[], ingre: any[], actual: any): boolean {
   const nombreNuevo = nombre
   const dificultadNueva = difi
   const nombresCategoriasNuevas = cate.map(c => c.nombre).sort()
   const nombresIngredientesNuevos = ingre.map(i => i.nombre).sort()

   const nombreViejo = actual.nombre
   const dificultadVieja = actual.dificultad
   const nombresCategoriasViejas = actual.categorias.map((c:any) => c.nombre).sort()
   const nombresIngredientesViejos = actual.ingredientes.map((i:any) => i.ingrediente.nombre).sort()

   let cambios = false
   if (nombreNuevo !== nombreViejo) cambios = true
   if (dificultadNueva !== dificultadVieja) cambios = true

   if ((nombresCategoriasNuevas.length !== nombresCategoriasViejas.length) ||
      (!nombresCategoriasNuevas.every((val,i) => val === nombresCategoriasViejas[i]))
   ) cambios = true
   if ((nombresIngredientesNuevos.length !== nombresIngredientesViejos.length) ||
      (!nombresIngredientesNuevos.every((val,i) => val === nombresIngredientesViejos[i]))
   ) cambios = true

   return cambios
}

export default RecetaService