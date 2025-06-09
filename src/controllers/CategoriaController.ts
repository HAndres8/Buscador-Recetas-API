import { Request, Response } from "express"
import CategoriaService from "../services/CategoriaService"

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
}

const categoriaController = new CategoriaController()
export default categoriaController