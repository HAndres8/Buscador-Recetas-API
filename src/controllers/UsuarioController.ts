import { Request, Response } from "express";
import UsuarioService from "../services/UsuarioService";
import { cuerpoLoginSchema } from "../schemas/UsuarioSchema";

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
      const { user, accessToken, refreshToken, error } = await UsuarioService.login(mail, password)
      if (error) {
         res.status(500).json({ error: 'Error al iniciar sesión', details: error.message })
         return
      }

      res.cookie('accessToken', accessToken, {
         httpOnly: true,
         secure: false,          // Cambiar a true en produccion
         sameSite: 'lax',        // Cambiar a none en produccion
         maxAge: 1000 * 60 * 15
      })
      res.cookie('refreshToken', refreshToken, {
         httpOnly: true,
         secure: false,          // Cambiar a true en produccion
         sameSite: 'lax',        // Cambiar a none en produccion
         maxAge: 1000 * 60 * 60 * 24
      })

      res.status(200).json({ user: user ?? {} })
      return
   }

   public logout(req: Request, res: Response) {
      res.clearCookie('accessToken', {
         httpOnly: true,
         secure: false,          // Cambiar a true en produccion
         sameSite: 'lax'         // Cambiar a none en produccion
      })
      res.clearCookie('refreshToken', {
         httpOnly: true,
         secure: false,          // Cambiar a true en produccion
         sameSite: 'lax'         // Cambiar a none en produccion
      })

      res.status(200).json({ mensaje: 'Sesión cerrada correctamente' })
      return
   }
}

const usuarioController = new UsuarioController()
export default usuarioController