# Guía de Despliegue en Azure (Paso a Paso)

Sigue estos pasos para publicar tu aplicación en Azure sin necesidad de usar la terminal.

## Paso 1: Subir el código a GitHub
Como no tienes la herramienta `git` instalada en tu equipo, la forma más fácil es usar la web de GitHub directamente:

### Opción A: Usar la web de GitHub (Más rápido)
1. Crea un repositorio en [GitHub](https://github.com/new). Ponle un nombre (ej: `control-ocupacion`).
2. Una vez creado, verás una pantalla con instrucciones. Busca el enlace que dice **"uploading an existing file"**.
3. **Selecciona todos los archivos** de tu carpeta local (excepto la carpeta `node_modules`) y arrástralos a la ventana del navegador.
4. Haz clic en **"Commit changes"**.

### Opción B: GitHub Desktop (Recomendado para el futuro)
1. Descarga e instala [GitHub Desktop](https://desktop.github.com/).
2. Abre la aplicación e inicia sesión.
3. Ve a **File -> Add Local Repository** y selecciona la carpeta de este proyecto.
4. La app te dirá que no es un repositorio Git, haz clic en **"Create a repository"**.
5. Haz clic en **"Publish repository"** para subirlo a tu cuenta de GitHub.

## Paso 2: Crear el recurso en Azure Portal
1. Ve al [Portal de Azure](https://portal.azure.com).
2. Escribe **Static Web Apps** en la búsqueda y selecciona el servicio.
3. Haz clic en **+ Crear**.
4. Rellena los datos básicos (Región: West Europe, Plan: Gratis).

## Paso 3: Detalles de implementación
1. Selecciona **GitHub** como origen.
2. Autoriza y selecciona tu repositorio.
3. En **Ajustes de compilación**:
   - **Aplicación**: `/`
   - **Salida**: `dist`
4. Haz clic en **Revisar y crear**.

## Paso 4: Configurar Variables de Entorno (CRÍTICO)
1. En tu app de Azure, ve a **Configuración** -> **Variables de entorno**.
2. Añade:
   - `VITE_SHAREPOINT_SITE_URL`
   - `VITE_SHAREPOINT_CLIENT_ID`
   - `VITE_SHAREPOINT_TENANT_ID`
3. Guarda los cambios.

## Paso 5: Actualizar el Registro de Aplicación (Azure AD)
1. Copia la URL de tu app de Azure.
2. Ve a tu App Registration en Azure AD -> **Autenticación**.
3. Añade la URL de Azure a los **URIs de redireccionamiento**.
