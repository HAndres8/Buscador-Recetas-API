import bcrypt from "bcrypt"
import ConnectionSupabase from "../config/Connection";
import { generarAccessToken, generarRefreshToken } from "../utils/auth";
import { CuerpoToken } from "../types/usuario";

class UsuarioService {
   
   // Crea el nuevo usuario en la base de datos
   public static async register(mail: string, password: string): Promise<{ mensaje: string|null, error: any }> {
      const supabase = ConnectionSupabase()
      
      const { data: existeUsuario } = await supabase.from('Usuario')
         .select('id')
         .eq('correo', mail)
         .single()
      if (existeUsuario) {
         return { mensaje: null, error: new Error('No es posible registrar el correo del usuario') }
      }


      const nuevaPassword = await bcrypt.hash(password, Number(process.env.SALTOS!))


      const { error } = await supabase.from('Usuario')
         .insert({
            'correo': mail,
            'contrasenya': nuevaPassword,
            'rol': 'usuario'
         })
      if (error) {
         return { mensaje: 'No es posible registrar al nuevo usuario', error: error }
      }

      return { mensaje: 'Usuario registrado exitosamente', error: null }
   }

   // Verifica la identidad del usuario y entrega tokens
   public static async login(mail: string, password: string): Promise<{ user?: CuerpoToken, accessToken?: string, refreshToken?: string, error?: any }> {
      const supabase = ConnectionSupabase()
      
      const { data: existeUsuario } = await supabase.from('Usuario')
         .select()
         .eq('correo', mail)
         .single()
      if (!existeUsuario) {
         return { error: new Error('No es posible iniciar sesión con este correo') }
      }


      const valida = await bcrypt.compare(password, existeUsuario.contrasenya)
      if (!valida) {
         return { error: new Error('Usuario o contraseña incorrectos') }
      }


      const payload: CuerpoToken = {
         id: existeUsuario.id,
         rol: existeUsuario.rol
      }

      const accessToken = generarAccessToken(payload)
      const refreshToken = generarRefreshToken(payload)

      return { user: payload, accessToken, refreshToken }
   }
}

export default UsuarioService