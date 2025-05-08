export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          operationName?: string
          query?: string
          variables?: Json
          extensions?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      Categoria: {
        Row: {
          grupo: Database["public"]["Enums"]["categorias"]
          id: number
          nombre: string
        }
        Insert: {
          grupo: Database["public"]["Enums"]["categorias"]
          id?: number
          nombre: string
        }
        Update: {
          grupo?: Database["public"]["Enums"]["categorias"]
          id?: number
          nombre?: string
        }
        Relationships: []
      }
      CategoriaReceta: {
        Row: {
          id_categoria: number
          id_receta: number
        }
        Insert: {
          id_categoria: number
          id_receta: number
        }
        Update: {
          id_categoria?: number
          id_receta?: number
        }
        Relationships: [
          {
            foreignKeyName: "CategoriaReceta_id_categoria_fkey"
            columns: ["id_categoria"]
            isOneToOne: false
            referencedRelation: "Categoria"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "CategoriaReceta_id_receta_fkey"
            columns: ["id_receta"]
            isOneToOne: false
            referencedRelation: "Receta"
            referencedColumns: ["id"]
          },
        ]
      }
      Ingrediente: {
        Row: {
          id: number
          nombre: string
        }
        Insert: {
          id?: number
          nombre: string
        }
        Update: {
          id?: number
          nombre?: string
        }
        Relationships: []
      }
      IngredienteReceta: {
        Row: {
          cantidad: string
          especificacion: string | null
          id_ingrediente: number
          id_ingrediente_receta: number
          id_receta: number
        }
        Insert: {
          cantidad: string
          especificacion?: string | null
          id_ingrediente: number
          id_ingrediente_receta?: number
          id_receta: number
        }
        Update: {
          cantidad?: string
          especificacion?: string | null
          id_ingrediente?: number
          id_ingrediente_receta?: number
          id_receta?: number
        }
        Relationships: [
          {
            foreignKeyName: "IngredienteReceta_id_ingrediente_fkey"
            columns: ["id_ingrediente"]
            isOneToOne: false
            referencedRelation: "Ingrediente"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "IngredienteReceta_id_receta_fkey"
            columns: ["id_receta"]
            isOneToOne: false
            referencedRelation: "Receta"
            referencedColumns: ["id"]
          },
        ]
      }
      Receta: {
        Row: {
          dificultad: Database["public"]["Enums"]["dificultades"]
          duracion: number
          embed_receta: string | null
          etiqueta_nutricional: string[] | null
          id: number
          imagen_url: string
          nombre: string
          pais: string
          pasos: string[]
          porciones: number
        }
        Insert: {
          dificultad: Database["public"]["Enums"]["dificultades"]
          duracion: number
          embed_receta?: string | null
          etiqueta_nutricional?: string[] | null
          id?: number
          imagen_url: string
          nombre: string
          pais: string
          pasos: string[]
          porciones: number
        }
        Update: {
          dificultad?: Database["public"]["Enums"]["dificultades"]
          duracion?: number
          embed_receta?: string | null
          etiqueta_nutricional?: string[] | null
          id?: number
          imagen_url?: string
          nombre?: string
          pais?: string
          pasos?: string[]
          porciones?: number
        }
        Relationships: []
      }
      Usuario: {
        Row: {
          contrasenya: string
          correo: string
          id: number
          rol: Database["public"]["Enums"]["roles"]
        }
        Insert: {
          contrasenya: string
          correo: string
          id?: number
          rol: Database["public"]["Enums"]["roles"]
        }
        Update: {
          contrasenya?: string
          correo?: string
          id?: number
          rol?: Database["public"]["Enums"]["roles"]
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      match_recetas_especificas: {
        Args: {
          query_embedding: string
          match_threshold: number
          match_count: number
          ids_recetas: number[]
        }
        Returns: {
          id: number
          similarity: number
        }[]
      }
      match_recetas_global: {
        Args: {
          query_embedding: string
          match_threshold: number
          match_count: number
          ids_recetas: number[]
        }
        Returns: {
          id: number
          similarity: number
        }[]
      }
    }
    Enums: {
      categorias: "plato" | "coccion" | "momento"
      dificultades: "baja" | "media" | "alta"
      roles: "administrador" | "usuario"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      categorias: ["plato", "coccion", "momento"],
      dificultades: ["baja", "media", "alta"],
      roles: ["administrador", "usuario"],
    },
  },
} as const