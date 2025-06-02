import { z } from "zod"

export const cuerpoLoginSchema = z.object({
   mail: z.string().trim()
      .toLowerCase()
      .email({ message: 'Dirección de correo invalida' }),
   password: z.string().trim()
      .min(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
      .regex(/[A-Z]/, { message: 'La contraseña debe tener al menos una letra mayúscula' })
      .regex(/[a-z]/, { message: 'La contraseña debe tener al menos una letra minúscula' })
      .regex(/[0-9]/, { message: 'La contraseña debe tener al menos un número' })
})