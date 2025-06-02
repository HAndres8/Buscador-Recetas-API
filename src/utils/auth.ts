import jwt from "jsonwebtoken"
import { CuerpoToken } from "../types/usuario";

export function generarAccessToken(payload: CuerpoToken): string {
   return jwt.sign(payload, process.env.ACCESS_SECRET!, { expiresIn: '15m' })
}

export function generarRefreshToken(payload: CuerpoToken): string {
   return jwt.sign(payload, process.env.REFRESH_SECRET!, { expiresIn: '1d' })
}

export function verficarAccessToken(token: string) {
   return jwt.verify(token, process.env.ACCESS_SECRET!)
}

export function verificarRefreshToken(token: string) {
   return jwt.verify(token, process.env.REFRESH_SECRET!)
}