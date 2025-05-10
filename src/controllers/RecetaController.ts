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

   public async getResumenRecetas(req: Request, res: Response) {
      const { pais, categoria, pag } = req.query
      const page = Number(pag) || 1

      if (pais && categoria) {
         res.status(400).json({ error: 'No se puede filtrar por ambos campos' })
         return
      }
      if (pais && typeof pais !== 'string') {
         res.status(400).json({ error: 'El país debe ser string' })
         return
      }
      if (categoria && typeof categoria !== 'string') {
         res.status(400).json({ error: 'La categoria debe ser string' })
         return
      }
      if (!Number.isInteger(page) || page <= 0) {
         res.status(400).json({ error: 'La pagina a buscar debe ser un número válido' })
         return
      }

      const { data, count, error } = await RecetaService.getRecetas(pais ?? null, categoria ?? null, page)
      if (error) {
         res.status(500).json({ error: 'Error al realizar la consulta', details: error.message })
         return
      }
      if (data && data.length == 0) {
         res.status(404).json({ response: 'Recetas no disponibles' })
         return
      }

      res.status(200).json({ data, count })
      return
   }

   public async getMejoresRecetas(req: Request, res: Response) {
      const prompt = req.body.solicitud

      if (typeof prompt !== 'string') {
         res.status(400).json({ error: 'La solicitud debe ser un string' })
         return
      }

      const { data, error } = await RecetaService.getMejoresRecetas(prompt)
      if (error) {
         res.status(500).json({ error: 'Error al realizar la consulta', details: error.message })
         return
      }
      if ((data?.mejores.length == 0) && (data?.extra.length == 0)) {
         res.status(404).json({ response: 'No se pudo encontrar ninguna recomendación para la solicitud. Intenta reformularla' })
         return
      }

      res.status(200).json({ data })
      return
   }
}

const recetaController = new RecetaController()
export default recetaController