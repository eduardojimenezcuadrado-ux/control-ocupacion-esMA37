import { GoogleGenAI } from "@google/genai";
import { AppState } from "../types";

/**
 * Service to generate AI insights for team occupancy and resource management
 */
export const getOccupancyInsights = async (
  state: AppState,
  periodId: string,
  isWeekly: boolean
): Promise<string> => {
  try {
    const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
    if (!apiKey) return "API Key no configurada.";

    const ai = new GoogleGenAI({ apiKey });

    // Prepare a summary of the current state for the AI
    const summary = {
      totalConsultants: state.consultants.length,
      activeProjects: state.projects.filter(p => p.active).length,
      assignmentsCount: state.assignments.length,
      period: periodId,
      view: isWeekly ? 'Semanal' : 'Mensual'
    };

    const prompt = `
    Eres un gestor de recursos (Resource Manager) experto. 
    Analiza el siguiente estado de ocupación del equipo:
    
    RESUMEN:
    ${JSON.stringify(summary, null, 2)}
    
    TAREA:
    Genera un informe breve (máx 200 palabras) sobre la salud de la ocupación del equipo para el periodo ${periodId}.
    Identifica posibles cuellos de botella, personas en bench o sobrecargas críticas.
    Responde en castellano con tono profesional y ejecutivo.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: prompt,
      config: {
        temperature: 0.5,
      }
    });

    return response.text || "No se pudo generar el análisis.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return `Error al conectar con la IA: ${(error as Error).message}`;
  }
};