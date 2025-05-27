import { Request, Response } from "express";
import { validarIdSchema, resumenRecetasSchema, mejoresRecetasSchema, cuerpoRecetaSchema } from "../schemas/RecetaSchema";
import RecetaService from "../services/RecetaService"

class RecetaController {
   public async getRecetaById(req: Request, res: Response) {
      const result = validarIdSchema.safeParse(req.params)
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

   public async createReceta(req: Request, res: Response) {
      const result = cuerpoRecetaSchema.safeParse(req.body)
      if (!result.success) {
         res.status(400).json({ error: result.error.issues[0].message })
         return
      }

      const cuerpo = result.data
      const { idReceta, mensaje, error } = await RecetaService.createReceta(cuerpo)
      if (error) {
         res.status(500).json({ error: 'Error al realizar la creación', mensaje: mensaje, details: error.message })
         return
      }

      res.status(200).json({ id: idReceta, mensaje: mensaje })
      return
   }

   public async updateReceta(req: Request, res: Response) {
      const resultBody = cuerpoRecetaSchema.safeParse(req.body)
      const resultID = validarIdSchema.safeParse(req.params)
      if (!resultBody.success) {
         res.status(400).json({ error: resultBody.error.issues[0].message })
         return
      }
      if (!resultID.success) {
         res.status(400).json({ error: resultID.error.issues[0].message })
         return
      }

      const cuerpo = resultBody.data
      const id = resultID.data.id
      const { mensaje, error } = await RecetaService.updateReceta(cuerpo, id)
      if (error) {
         res.status(500).json({ error: 'Error al realizar la actualización', mensaje: mensaje, details: error.message })
         return
      }

      res.status(200).json({ mensaje: mensaje })
      return
   }

   public async deleteReceta(req: Request, res: Response) {
      const result = validarIdSchema.safeParse(req.params)
      if (!result.success) {
         res.status(400).json({ error: result.error.issues[0].message })
         return
      }

      const id = result.data.id
      const { mensaje, error } = await RecetaService.deleteReceta(id);
      if (error) {
         res.status(500).json({ error: 'Error al realizar la eliminación', mensaje: mensaje, details: error.message })
         return
      }

      res.status(200).json({ mensaje: mensaje })
      return
   }
}

const recetaController = new RecetaController()
export default recetaController