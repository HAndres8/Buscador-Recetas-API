import { z } from "zod"

const GRUPOS = ['plato', 'coccion', 'momento'] as const

export const cuerpoCategoriaSchema = z.object({
   nombre: z.string().trim()
      .min(3, { message: 'El nombre debe ser mas largo' }),
   grupo: z.enum(GRUPOS)
}) 