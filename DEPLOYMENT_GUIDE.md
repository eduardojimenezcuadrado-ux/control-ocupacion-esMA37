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

## Paso 4: Configurar las contraseñas (Variables de entorno)
Este es el único paso técnico. Como tu app se construye en GitHub, necesitamos poner las credenciales allí para que se "borren" y se escriban las reales durante la construcción.

### A. Configurar en GitHub (Para que la app funcione)
1. Ve a tu repositorio en **GitHub**.
2. Ve a **Settings** -> **Secrets and variables** -> **Actions**.
3. Haz clic en la pestaña **Variables** (no Secrets, Variables).
4. Haz clic en **New repository variable** y añade estas tres:
   - `VITE_SHAREPOINT_SITE_URL`
   - `VITE_SHAREPOINT_CLIENT_ID`
   - `VITE_SHAREPOINT_TENANT_ID`

### B. Configurar en Azure (Para seguridad extra)
Repite lo mismo en el Portal de Azure (Pestaña "Variables de entorno"), aunque lo más importante es el paso de GitHub.

## Paso 5: Actualizar archivos y Re-desplegar
Cada vez que yo haga un cambio aquí (como el que acabo de hacer para arreglar los iconos), tienes que:
1. Subir/Arrastrar los archivos modificados a GitHub de nuevo.
2. Esto activará una nueva "construcción" (puedes verlo en la pestaña **Actions** de GitHub).
3. Cuando termine (se ponga en verde), refresca tu web de Azure.

## Paso 6: Primer Inicio de Sesión
La primera vez que entres en la nueva URL, la app no sabrá quién eres. 
1. Ve a la pantalla de **Ajustes**.
2. Pulsa en **Actualizar desde SharePoint**.
3. Haz el login de Microsoft. A partir de ese momento, la app ya te recordará siempre.
