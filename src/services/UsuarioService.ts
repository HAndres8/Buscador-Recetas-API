import bcrypt from "bcrypt"
import ConnectionSupabase from "../config/Connection"
import { generarAccessToken, generarRefreshToken } from "../utils/auth"
import { CuerpoToken } from "../types/usuario"
import { RespuestaError } from "../types/error"

class UsuarioService {
   
   // Crea el nuevo usuario en la base de datos
   public static async register(mail: string, password: string): Promise<{ mensaje: string|null, error: RespuestaError|null }> {
      const supabase = ConnectionSupabase()
      
      const { data: existeUsuario } = await supabase.from('Usuario')
         .select('id')
         .eq('correo', mail)
         .single()
      if (existeUsuario) {
         return { mensaje: null, error: { mensaje: 'No es posible registrar el correo del usuario', code: 409 }}
      }

      const nuevaPassword = await bcrypt.hash(password, Number(process.env.SALTOS!))

      const { error } = await supabase.from('Usuario')
         .insert({
            'correo': mail,
            'contrasenya': nuevaPassword,
            'rol': 'usuario'
         })
      if (error) {
         console.error({ details: error.details, message: error.message })
         return { mensaje: null, error: { mensaje: 'No es posible registrar al nuevo usuario', code: 500 }}
      }

      return { mensaje: 'Usuario registrado exitosamente', error: null }
   }

   // Verifica la identidad del usuario y entrega tokens
   public static async login(mail: string, password: string): Promise<{ accessToken?: string, refreshToken?: string, error?: RespuestaError }> {
      const supabase = ConnectionSupabase()
      
      const { data: existeUsuario } = await supabase.from('Usuario')
         .select()
         .eq('correo', mail)
         .single()
      if (!existeUsuario) {
         return { error: { mensaje: 'Usuario o contraseña incorrectos', code: 401 }}
      }


      const valida = await bcrypt.compare(password, existeUsuario.contrasenya)
      if (!valida) {
         return { error: { mensaje: 'Usuario o contraseña incorrectos', code: 401 }}
      }

      const payload: CuerpoToken = {
         id: existeUsuario.id,
         rol: existeUsuario.rol
      }

      const accessToken = generarAccessToken(payload)
      const refreshToken = generarRefreshToken(payload)

      return { accessToken, refreshToken }
   }
}

export default UsuarioService