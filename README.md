# SPICED - Control de Ocupación

Herramienta premium de gestión de capacidad y planificación para consultoría, diseñada para optimizar la asignación de recursos y proporcionar visibilidad estratégica en tiempo real.

![Branding](https://img.shields.io/badge/Stack-React%20%7C%20Vite%20%7C%20Tailwind%20%7C%20Recharts-orange)
![Version](https://img.shields.io/badge/Version-1.0.4-darkgray)

## 🌟 Características Principales

### 1. Dashboard de Analítica Avanzada
- **Curva de Carga**: Visualización temporal de la ocupación del equipo (Mensual/Semanal).
- **KPIs Estratégicos**: Monitorización de FTE, Bench, Sobrecarga y Carga Tentativa.
- **Copilot AI**: Recomendaciones inteligentes para optimizar la asignación de recursos.

### 2. Escritorio de Planificación
- **Gestión Multi-Nivel**: Capacidad de planificar a nivel de mes o desglosar por semanas (Enero Sem. 1, etc.).
- **Sincronización Automática**: El desglose semanal se agrega automáticamente al total mensual.
- **Visualización de Carga**: Indicadores visuales de saturación por consultor.

### 3. Gestión de Talento y Proyectos
- **Fichas Técnicas**: Perfiles detallados de consultores con historial de asignaciones.
- **Catálogo de Portfolio**: Gestión de proyectos de clientes, internos y ausencias.
- **Control de Incidencias**: Registro centralizado de vacaciones, festivos y bajas.

## 🎨 Diseño y Branding
La aplicación sigue estrictamente las guías de estilo corporativo:
- **Colores**: `#252729` (Gris Oscuro) y `#f78c38` (Naranja SPICED).
- **Tipografía**: 'Outfit' (Geometric Sans Serif).
- **Estética**: Glassmorphism, sombras premium y micro-interacciones fluidas.

## 🚀 Instalación y Uso

1. **Dependencias**:
   ```bash
   npm install
   ```

2. **Entorno**:
   Asegúrate de configurar tu `GEMINI_API_KEY` en el archivo `.env.local` para habilitar las funcionalidades de IA.

3. **Ejecución**:
   ```bash
   npm run dev
   ```

## 🛠️ Tecnologías
- **Frontend**: React 18 + Vite
- **Estado**: Zustand/Custom Hooks para gestión de local storage.
- **Visualización**: Recharts para gráficas de tendencias.
- **Iconografía**: Lucide React.
- **Estilo**: CSS Vanilla (Diseño de sistema premium).

---
*Desarrollado para la optimización de operaciones en consultoría.*
