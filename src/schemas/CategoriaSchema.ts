import { z } from "zod"

const GRUPOS = ['plato', 'coccion', 'momento'] as const

export const validarIdSchema = z.object({
   id: z.coerce.number()
      .int()
      .positive({ message: 'El ID de la categoría debe ser un número válido mayor de cero' })
})

export const cuerpoCategoriaSchema = z.object({
   nombre: z.string().trim()
      .min(3, { message: 'El nombre debe ser mas largo' }),
   grupo: z.enum(GRUPOS)
}) 