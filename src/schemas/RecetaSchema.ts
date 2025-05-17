import { z } from "zod";

export const recetaByIdSchema = z.object({
   id: z.string()
      .transform(Number)
      .refine(id => Number.isInteger(id) && id > 0, {
         message: 'El ID de la receta debe ser un número válido mayor de cero'
      })
})

export const resumenRecetasSchema = z.object({
   pais: z.string().optional(),
   categoria: z.string().optional(),
   pag: z.string().default('1')
      .transform(Number)
      .refine(pag => Number.isInteger(pag) && pag > 0, {
         message: 'La pagina a buscar debe ser un número válido mayor de cero'
      })
}).refine(data => !(data.pais && data.categoria), {
   message: 'No se puede filtrar por país y categoría a la vez'
})

export const mejoresRecetasSchema = z.object({
   solicitud: z.string()
      .min(15, { message: 'La solicitud debe ser un poco mas larga' })
})