import { Request, Response } from "express"
import UsuarioService from "../services/UsuarioService"
import { cuerpoLoginSchema } from "../schemas/UsuarioSchema"
import { COOKIE_OPTIONS } from "types/usuario"

class UsuarioController {
   public async createUser(req: Request, res: Response) {
      const result = cuerpoLoginSchema.safeParse(req.body)
      if (!result.success) {
         res.status(400).json({ error: result.error.issues[0].message })
         return
      }

      const { mail, password } = result.data
      const { mensaje, error } = await UsuarioService.register(mail, password)
      if (error) {
         res.status(500).json({ error: 'Error al realizar el registro', mensaje: mensaje, details: error.message })
         return
      }

      res.status(200).json({ mensaje: mensaje })
      return
   }

   public async login(req: Request, res: Response) {
      const result = cuerpoLoginSchema.safeParse(req.body)
      if (!result.success) {
         res.status(400).json({ error: result.error.issues[0].message })
         return
      }

      const { mail, password } = result.data
      const { accessToken, refreshToken, error } = await UsuarioService.login(mail, password)
      if (error) {
         res.status(500).json({ error: 'Error al iniciar sesión', details: error.message })
         return
      }

      res.cookie('accessToken', accessToken, {
         ...COOKIE_OPTIONS,
         maxAge: 1000 * 60 * 15
      })
      res.cookie('refreshToken', refreshToken, {
         ...COOKIE_OPTIONS,
         maxAge: 1000 * 60 * 60 * 24 * 2
      })

      res.status(200).json({ mensaje: 'Sesión iniciada correctamente' })
      return
   }

   public logout(req: Request, res: Response) {
      res.clearCookie('accessToken', { ...COOKIE_OPTIONS })
      res.clearCookie('refreshToken', { ...COOKIE_OPTIONS })

      res.status(200).json({ mensaje: 'Sesión cerrada correctamente' })
      return
   }
}

const usuarioController = new UsuarioController()
export default usuarioController