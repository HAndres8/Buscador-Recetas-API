import jwt, { JwtPayload } from "jsonwebtoken"
import { CuerpoToken } from "../types/usuario"

export function generarAccessToken(payload: CuerpoToken): string {
   return jwt.sign(payload, process.env.ACCESS_SECRET!, { expiresIn: '15m' })
}

export function generarRefreshToken(payload: CuerpoToken): string {
   return jwt.sign(payload, process.env.REFRESH_SECRET!, { expiresIn: '2d' })
}

export function verificarAccessToken(token: string): JwtPayload {
   return jwt.verify(token, process.env.ACCESS_SECRET!) as JwtPayload
}

export function verificarRefreshToken(token: string): JwtPayload {
   return jwt.verify(token, process.env.REFRESH_SECRET!) as JwtPayload
}