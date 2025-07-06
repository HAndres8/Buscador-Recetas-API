import { Request, Response, NextFunction } from "express"
import { generarAccessToken, generarRefreshToken, verificarAccessToken, verificarRefreshToken } from "../utils/auth"
import { COOKIE_OPTIONS, CuerpoToken } from "../types/usuario"

export const autenticarToken = (req: Request, res: Response, next: NextFunction) => {
   const refreshToken: string = req.cookies.refreshToken
   const accessToken: string = req.cookies.accessToken

   if (!refreshToken && !accessToken) {
      res.status(401).json({ mensaje: 'Acceso denegado. Vuelve a iniciar sesión' })
      return
   }
   if (!accessToken) {
      const user = regenerarAccessToken(res, refreshToken)
      if (!user) {
         res.status(401).json({ mensaje: 'Token inválido o expirado' })
         return
      } 
      
      req.user = { id: user.id, rol: user.rol }
      return next()
   }

   try {
      const decoded = verificarAccessToken(accessToken)
      req.user = { id: decoded.id, rol: decoded.rol }
      return next()
   } catch (error) {
      res.status(401).json({ mensaje: 'Token inválido o expirado' })
      return
   }
}

export const autorizarToken = (req: Request, res: Response, next: NextFunction) => {
   if (req.user?.rol !== 'administrador') {
      res.status(403).json({ mensaje: 'Acceso denegado. Permisos insuficientes' })
      return
   }

   return next()
}

export const verificarLogin = (req: Request, res: Response, next: NextFunction) => {
   const refreshToken: string = req.cookies.refreshToken
   const accessToken: string = req.cookies.accessToken

   if (!accessToken) {
      const user = regenerarAccessToken(res, refreshToken)
      if (user) {
         req.user = { id: user.id, rol: user.rol }
      }

      return next()
   }

   try {
      const decoded = verificarAccessToken(accessToken)
      req.user = { id: decoded.id, rol: decoded.rol }
   } catch (error) {
   }

   return next()
}

function regenerarAccessToken(res: Response, refreshToken: string) {
   try {
      const decoded = verificarRefreshToken(refreshToken)
      const payload: CuerpoToken = { id: decoded.id, rol: decoded.rol }

      const nuevoAccessToken = generarAccessToken(payload)
      const nuevoRefreshToken = generarRefreshToken(payload)

      res.cookie('accessToken', nuevoAccessToken, {
         ...COOKIE_OPTIONS,
         maxAge: 1000 * 60 * 15
      })
      res.cookie('refreshToken', nuevoRefreshToken, {
         ...COOKIE_OPTIONS,
         maxAge: 1000 * 60 * 60 * 24 * 2
      })

      return { id: decoded.id, rol: decoded.rol }
   } catch (error) {
      return null
   }
}