import { z } from "zod";

const DIFICULTADES = ['baja','media','alta'] as const

export const recetaByIdSchema = z.object({
   id: z.coerce.number()
      .int()
      .positive({ message: 'El ID de la receta debe ser un número válido mayor de cero' })
})

export const resumenRecetasSchema = z.object({
   pais: z.string().trim()
      .length(3, { message: 'El formato del país debe ser de 3 letras' })
      .optional(),
   categoria: z.string().trim().optional(),
   pag: z.coerce.number()
      .int()
      .positive({ message: 'La pagina a buscar debe ser un número válido mayor de cero' })
      .default(1)
}).refine(data => !(data.pais && data.categoria), {
   message: 'No se puede filtrar por país y categoría a la vez'
})

export const mejoresRecetasSchema = z.object({
   solicitud: z.string().trim()
      .min(15, { message: 'La solicitud debe ser un poco mas larga' })
})

export const creacionReceta = z.object({
   nombre: z.string().trim()
      .min(5, { message: 'El nombre debe ser mas largo' }),
   pasos: z.array(z.string().trim()
      .min(1, { message: 'Cada paso debe tener contenido' })
   ).nonempty({ message: 'Debes especificar los pasos de la receta' }),
   pais: z.string().trim()
      .length(3, { message: 'El formato del país debe ser de 3 letras' })
      .regex(/^[A-Z]{3}$/, { message: 'El país debe estar en mayúsculas' }),
   duracion: z.number()
      .int()
      .gte(5, { message: 'La receta debe durar 5 minutos o más' }),
   porciones: z.number()
      .int()
      .positive(),
   etiquetas: z.array(z.string().trim()
      .min(1, { message: 'Cada etiqueta debe tener contenido' })
   ),
   dificultad: z.enum(DIFICULTADES),
   imagen: z.string().trim()
      .endsWith(".jpg", { message: 'Solo imagenes con extensión .jpg se permiten' }),
   categorias: z.array(z.object({
      id: z.number().int().positive(),
      nombre: z.string().trim().min(1)
   })).nonempty({ message: 'Debes especificar las categorias de la receta' }),
   ingredientes: z.array(z.object({
      id: z.number().int().positive(),
      nombre: z.string().trim().min(1),
      cantidad: z.string().trim().min(1),
      especificacion: z.string().trim().min(1).nullable()
   })).nonempty({ message: 'Debes especificar los ingredientes de la receta' })
}).refine(data => data.imagen.startsWith(data.pais), {
   message: 'La imagen debe comenzar con el codigo del pais'
})