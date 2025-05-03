import { Request, Response } from "express";
import RecetaService from "../services/RecetaService"

class RecetaController {
   public async getRecetaById(req: Request, res: Response) {
      const id = Number(req.params.id)
      if (!Number.isInteger(id) || id <= 0) {
         res.status(400).json({ error: 'El ID de la receta debe ser un número válido' })
         return
      }

      const { data, error } = await RecetaService.getReceta(id);
      if (error) {
         res.status(500).json({ error: 'Error al realizar la consulta', details: error.message })
         return
      }
      if (!data) {
         res.status(404).json({ response: 'Receta no disponible' })
         return
      }

      res.status(200).json(data)
      return
   }
}

const recetaController = new RecetaController()
export default recetaController