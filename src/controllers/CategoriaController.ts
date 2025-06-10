import { Request, Response } from "express"
import CategoriaService from "../services/CategoriaService"
import { cuerpoCategoriaSchema } from "../schemas/CategoriaSchema"

class CategoriaController {
   public async getCategorias(req: Request, res: Response) {
      const { data, error } = await CategoriaService.getCategorias()
      if (error) {
         res.status(error.code).json({ error: 'Error al realizar la consulta', details: error.mensaje })
         return
      }

      res.status(200).json(data)
      return
   }

   public async createCategoria(req: Request, res: Response) {
      const result = cuerpoCategoriaSchema.safeParse(req.body)
      if (!result.success) {
         res.status(400).json({ error: result.error.issues[0].message })
         return
      }

      const cuerpo = result.data
      const { idCategoria, mensaje, error } = await CategoriaService.createCategoria(cuerpo)
      if (error) {
         res.status(error.code).json({ error: 'Error al realizar la creación', details: error.mensaje })
         return
      }

      res.status(201).json({ id: idCategoria, mensaje: mensaje })
      return
   }
}

const categoriaController = new CategoriaController()
export default categoriaController