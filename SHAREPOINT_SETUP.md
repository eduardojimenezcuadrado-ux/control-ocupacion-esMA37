# Configuración de Azure AD para SharePoint

Esta guía te ayudará a configurar la autenticación de Azure AD necesaria para conectar la aplicación Piloto SPICED con SharePoint Online.

## Requisitos Previos

- Acceso al [Azure Portal](https://portal.azure.com)
- Permisos de administrador en Azure AD (o solicitar ayuda al administrador de TI)
- Cuenta de Microsoft 365 con acceso al sitio de SharePoint

## Paso 1: Acceder al Azure Portal

1. Abre tu navegador y ve a [https://portal.azure.com](https://portal.azure.com)
2. Inicia sesión con tu cuenta de Microsoft 365

## Paso 2: Registrar una Nueva Aplicación

1. En el menú lateral izquierdo, busca y selecciona **"Azure Active Directory"** (o **"Microsoft Entra ID"**)
2. En el menú de Azure AD, selecciona **"App registrations"** (Registros de aplicaciones)
3. Haz clic en **"+ New registration"** (+ Nuevo registro)

## Paso 3: Configurar la Aplicación

Completa el formulario con la siguiente información:

### Nombre
- **Name**: `Piloto SPICED - SharePoint Connector`

### Supported account types
- Selecciona: **"Accounts in this organizational directory only"** (Solo cuentas de este directorio organizacional)

### Redirect URI
- **Platform**: Selecciona `Single-page application (SPA)`
- **Redirect URI**: Introduce `http://localhost:3000`
  - Si despliegas la aplicación en producción, añade también la URL de producción

4. Haz clic en **"Register"** (Registrar)

## Paso 4: Copiar el Client ID y Tenant ID

Después del registro, serás redirigido a la página de la aplicación:

1. **Client ID (Application ID)**:
   - En la página "Overview" (Información general), encontrarás el **"Application (client) ID"**
   - Copia este valor (formato: `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`)
   - **Guárdalo** - lo necesitarás en la aplicación

2. **Tenant ID (Directory ID)**:
   - En la misma página "Overview", encontrarás el **"Directory (tenant) ID"**
   - Copia este valor (formato: `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`)
   - **Guárdalo** - también lo necesitarás

## Paso 5: Configurar Permisos de API

1. En el menú lateral de tu aplicación, selecciona **"API permissions"** (Permisos de API)
2. Haz clic en **"+ Add a permission"** (+ Agregar un permiso)
3. Selecciona **"Microsoft Graph"**
4. Selecciona **"Delegated permissions"** (Permisos delegados)
5. Busca y marca las siguientes casillas:
   - `Sites.Read.All` - Leer elementos en todos los sitios
   - `User.Read` - Iniciar sesión y leer el perfil del usuario
6. Haz clic en **"Add permissions"** (Agregar permisos)

### Conceder Consentimiento de Administrador (Opcional pero Recomendado)

Si tienes permisos de administrador:
1. En la página de "API permissions", haz clic en **"Grant admin consent for [Tu Organización]"**
2. Confirma haciendo clic en **"Yes"**

Esto evitará que cada usuario tenga que dar consentimiento individualmente.

## Paso 6: Usar las Credenciales en la Aplicación

Ahora que tienes el **Client ID** y **Tenant ID**:

1. Abre la aplicación Piloto SPICED
2. En la pantalla de inicio, selecciona la pestaña **"SharePoint"**
3. Introduce los valores:
   - **SharePoint Site URL**: `https://raonacloud.sharepoint.com/sites/ClientesSPICEDAI`
   - **List Name**: `Negocios`
   - **Client ID**: Pega el Application (client) ID que copiaste
   - **Tenant ID**: Pega el Directory (tenant) ID que copiaste
4. Haz clic en **"Autenticar y Conectar"**
5. Se abrirá una ventana emergente de Microsoft para iniciar sesión
6. Inicia sesión con tu cuenta de Microsoft 365
7. Acepta los permisos solicitados
8. ¡Listo! Los datos se cargarán automáticamente

## Configuración Opcional: Variables de Entorno

Para evitar tener que introducir las credenciales cada vez, puedes configurarlas en el archivo `.env.local`:

```env
SHAREPOINT_SITE_URL=https://raonacloud.sharepoint.com/sites/ClientesSPICEDAI
SHAREPOINT_LIST_NAME=Negocios
SHAREPOINT_CLIENT_ID=tu-client-id-aqui
SHAREPOINT_TENANT_ID=tu-tenant-id-aqui
```

Después de configurar estas variables, reinicia el servidor de desarrollo:
```bash
npm run dev
```

## Solución de Problemas

### Error: "AADSTS50011: The reply URL specified in the request does not match"

**Solución**: Verifica que la Redirect URI en Azure AD coincida exactamente con la URL donde se ejecuta la aplicación:
- Desarrollo local: `http://localhost:3000`
- Producción: Tu URL de producción

### Error: "Insufficient privileges to complete the operation"

**Solución**: 
1. Verifica que los permisos `Sites.Read.All` estén configurados
2. Si es posible, solicita al administrador que conceda el consentimiento de administrador

### Error: "List not found"

**Solución**: 
1. Verifica que el nombre de la lista sea exacto (distingue mayúsculas/minúsculas)
2. Asegúrate de tener permisos de lectura en la lista de SharePoint

### La ventana de autenticación no se abre

**Solución**:
1. Verifica que tu navegador no esté bloqueando ventanas emergentes
2. Permite ventanas emergentes para `localhost:3000` o tu dominio

## Recursos Adicionales

- [Documentación oficial de Azure AD](https://docs.microsoft.com/en-us/azure/active-directory/)
- [Microsoft Graph API](https://docs.microsoft.com/en-us/graph/)
- [MSAL.js Documentation](https://github.com/AzureAD/microsoft-authentication-library-for-js)

## Seguridad

- **No compartas** tu Client ID y Tenant ID públicamente
- El Client ID no es secreto, pero el Tenant ID identifica tu organización
- Los usuarios siempre deben autenticarse con sus propias credenciales de Microsoft 365
- La aplicación no almacena contraseñas, solo tokens de sesión temporales
