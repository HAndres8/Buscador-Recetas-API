import { z } from "zod"

export const validarIdSchema = z.object({
   id: z.coerce.number()
      .int()
      .positive({ message: 'El ID del ingrediente debe ser un número válido mayor de cero' })
})

export const cuerpoIngredienteSchema = z.object({
   nombre: z.string().trim()
      .min(3, { message: 'El nombre debe ser mas largo' })
})