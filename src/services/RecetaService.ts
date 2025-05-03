import ConnectionSupabase from "../config/Connection"
import { Receta, ResumenReceta } from "types/receta"

class RecetaService {

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
         const { data: categoriaData, error } = await supabase.from("Categoria")
         .select("Receta(id)")
         .eq("nombre", categoria)
         .single()
         
         const recetasIDs = categoriaData?.Receta.map(receta => receta.id) || []

         // Buscar las recetas segun los IDs obtenidos anteriormente
         const { data: recetasData, count } = await supabase.from("Receta")
         .select(`id, nombre, pais, duracion, porciones, dificultad, imagen_url,
                  categorias: Categoria(id, nombre, grupo)`,
                  { count: "exact" })
         .in("id", recetasIDs)
         .order("nombre", { ascending: true })
         .range(desde,hasta)

         return { data: recetasData, count: count ?? 0, error }
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
}

export default RecetaService