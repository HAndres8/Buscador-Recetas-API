# Buscador de Recetas Inteligente
Este proyecto consiste en el desarrollo de una API con información detallada sobre las recetas de distintos países, incluyendo características, ingredientes y preparación. Como funcionalidad principal, se desarrolló un sistema de recomendación que, a partir de una descripción que se le proporcione, sugiere las recetas que son mas adecuadas para preparar.

## Características

- **Búsqueda en lenguaje natural:** Permite que el usuario ingrese una solicitud sobre la receta que le gustaría preparar. Puede incluir las porciones, la duración de la preparación, el momento del día o incluso los ingredientes que quiera usar. Entre más descriptivo, mejores resultados.
- **Uso de IA generativa:** Maneja la parte de procesar la solicitud del usuario, generar su embedding y generar los embeddings para cada receta.
- **Catálogo de recetas:** Muestra todas las recetas disponibles por si se necesita buscar una en concreto. Aquí se puede filtrar por país o categoría para centrarlo en un aspecto en específico.
- **Sección de Favoritos:** Permite a los usuarios registrados consultar cuales son aquellas recetas que más le gustaron y que revisan con frecuencia.
- **Gestión de recetas:** Permite solo a los administradores las tareas de creación, actualización y eliminación de recetas, lo que garantiza la confiabilidad de su contenido.

## Tecnologías

- **Framework:** Express
- **Lenguaje**: TypeScript
- **Base de datos:** Supabase
- **LLMs y Embeddings:** GeminiAI y LangChain
- **Autenticación y Seguridad:** Bcrypt, JWT y Cookies

## To Do

- [X] Recopilación de datos adecuados
- [X] Estructuración correcta en la base de datos
- [X] Funcionalidades para LLMs y embeddings
- [X] Realizar búsqueda por similaridad de embeddings
- [X] CRUD de recetas
- [X] Endpoints para la autenticación y autorización
- [X] Implementación de Cookies
- [X] CRUD de categorías
- [ ] CRUD de ingredientes
- [ ] Endpoints para las recetas favoritas del usuario
- [ ] Funcionalidades finales
- [ ] Despliegue

## Referencias
Toda la información de las recetas e imágenes fueron extraídas de los siguientes sitios web: [Recetas Gratis](https://www.recetasgratis.net/) y [My Colombian Recipes](https://www.mycolombianrecipes.com/).