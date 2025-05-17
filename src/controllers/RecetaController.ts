import { Request, Response } from "express";
import { recetaByIdSchema, resumenRecetasSchema, mejoresRecetasSchema } from "../schemas/RecetaSchema";
import RecetaService from "../services/RecetaService"

class RecetaController {
   public async getRecetaById(req: Request, res: Response) {
      const result = recetaByIdSchema.safeParse(req.params)
      if (!result.success) {
         res.status(400).json({ error: result.error.issues[0].message })
         return
      }

      const id = result.data.id
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
      const result = resumenRecetasSchema.safeParse(req.query)
      if (!result.success) {
         res.status(400).json({ error: result.error.issues[0].message })
         return
      }

      const { pais, categoria, pag }= result.data
      const { data, count, error } = await RecetaService.getRecetas(pais ?? null, categoria ?? null, pag)
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
      const result = mejoresRecetasSchema.safeParse(req.body)
      if (!result.success) {
         res.status(400).json({ error: result.error.issues[0].message })
         return
      }

      const prompt = result.data.solicitud
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