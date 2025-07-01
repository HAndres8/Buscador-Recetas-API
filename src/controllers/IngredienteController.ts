import { Request, Response } from "express"
import IngredienteService from "../services/IngredienteService"
import { validarIdSchema, cuerpoIngredienteSchema } from "../schemas/IngredienteSchema"

class IngredienteController {
   public async getIngredientes(req: Request, res: Response) {
      const { data, error } = await IngredienteService.getIngredientes()
      if (error) {
         res.status(error.code).json({ error: 'Error al realizar la consulta', details: error.mensaje })
         return
      }

      res.status(200).json(data)
      return
   }

   public async createIngrediente(req: Request, res: Response) {
      const result = cuerpoIngredienteSchema.safeParse(req.body)
      if (!result.success) {
         res.status(400).json({ error: result.error.issues[0].message })
         return
      }

      const nombre = result.data.nombre
      const { idIngrediente, mensaje, error } = await IngredienteService.createIngrediente(nombre)
      if (error) {
         res.status(error.code).json({ error: 'Error al realizar la creación', details: error.mensaje })
         return
      }

      res.status(201).json({ id: idIngrediente, mensaje: mensaje })
      return
   }

   public async updateIngrediente(req: Request, res: Response) {
      const resultBody = cuerpoIngredienteSchema.safeParse(req.body)
      const resultID = validarIdSchema.safeParse(req.params)
      if (!resultBody.success) {
         res.status(400).json({ error: resultBody.error.issues[0].message })
         return
      }
      if (!resultID.success) {
         res.status(400).json({ error: resultID.error.issues[0].message })
         return
      }

      const nombre = resultBody.data.nombre
      const id = resultID.data.id
      const { mensaje, error } = await IngredienteService.updateIngrediente(nombre, id)
      if (error) {
         res.status(error.code).json({ error: 'Error al realizar la actualización', details: error.mensaje })
         return
      }

      res.status(200).json({ mensaje: mensaje })
      return
   }

   public async deleteIngrediente(req: Request, res: Response) {
      const result = validarIdSchema.safeParse(req.params)
      if (!result.success) {
         res.status(400).json({ error: result.error.issues[0].message })
         return
      }

      const id = result.data.id
      const { mensaje, error } = await IngredienteService.deleteIngrediente(id)
      if (error) {
         res.status(error.code).json({ error: 'Error al realizar la eliminación', details: error.mensaje })
         return
      }

      res.status(200).json({ mensaje: mensaje })
      return
   }
}

const ingredienteController = new IngredienteController()
export default ingredienteController