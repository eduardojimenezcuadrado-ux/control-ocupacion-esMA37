import { GoogleGenAI } from "@google/genai";
import { AppState, Consultant, Assignment, Project } from "../types";

// Model cascade order: start with newest, fallback to older stable models
const MODEL_CASCADE = [
  'gemini-2.5-flash-preview-05-20',
  'gemini-2.0-flash',
  'gemini-1.5-flash',
  'gemini-1.5-pro',
];

export interface AIRecommendation {
  id: string;
  title: string;
  description: string;
  impact: string;
  type: 'optimization' | 'alert' | 'opportunity';
}

/**
 * Try to generate content with model cascade fallback
 */
async function generateWithCascade(
  ai: GoogleGenAI,
  prompt: string
): Promise<string> {
  let lastError: Error | null = null;

  for (const model of MODEL_CASCADE) {
    try {
      console.log(`🤖 Trying model: ${model}`);
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          temperature: 0.3,
          maxOutputTokens: 1024,
        }
      });
      console.log(`✅ Success with model: ${model}`);
      return response.text || '';
    } catch (error: any) {
      console.warn(`⚠️ Model ${model} failed:`, error.message);
      lastError = error;
      // Continue to next model
    }
  }

  throw lastError || new Error('All models failed');
}

/**
 * Prepare occupancy data summary for AI analysis
 */
function prepareDataSummary(
  state: AppState,
  periodId: string,
  isWeekly: boolean
): string {
  const capacity = isWeekly
    ? state.settings.standardWeeklyCapacity
    : state.settings.standardMonthlyCapacity;

  const periodAssignments = state.assignments.filter(
    a => a.period === periodId && a.isWeekly === isWeekly
  );
  const periodAbsences = state.absences.filter(
    a => a.period === periodId && a.isWeekly === isWeekly
  );

  // Calculate hours per consultant
  const consultantHours: Record<string, { confirmed: number; tentative: number; absence: number; name: string; role: string }> = {};

  state.consultants.forEach(c => {
    consultantHours[c.id] = { confirmed: 0, tentative: 0, absence: 0, name: c.name, role: c.role };
  });

  periodAssignments.forEach(a => {
    if (consultantHours[a.consultantId]) {
      if (a.status === 'Confirmada') {
        consultantHours[a.consultantId].confirmed += a.hours;
      } else {
        consultantHours[a.consultantId].tentative += a.hours;
      }
    }
  });

  periodAbsences.forEach(a => {
    if (consultantHours[a.consultantId]) {
      consultantHours[a.consultantId].absence += a.hours;
    }
  });

  // Build summary
  const consultantSummary = Object.entries(consultantHours).map(([id, data]) => {
    const total = data.confirmed + data.tentative + data.absence;
    const availabilityThreshold = isWeekly ? state.settings.availableWeeklyThreshold : state.settings.availableMonthlyThreshold;
    const status = total > capacity ? 'SOBRECARGA' : total < availabilityThreshold ? 'DISPONIBLE' : 'OK';
    return `- ${data.name} (${data.role}): ${data.confirmed}h confirmadas, ${data.tentative}h tentativas, ${data.absence}h ausencias. Total: ${total}h. Estado: ${status}`;
  }).join('\n');

  const projectSummary = state.projects
    .filter(p => p.active)
    .map(p => `- ${p.name} (${p.type}${p.client ? `, Cliente: ${p.client}` : ''})`)
    .join('\n');

  return `
PERIODO: ${periodId} (${isWeekly ? 'Semanal' : 'Mensual'})
CAPACIDAD ESTÁNDAR: ${capacity}h
UMB_DISPONIBILIDAD: ${isWeekly ? state.settings.availableWeeklyThreshold : state.settings.availableMonthlyThreshold}h

CONSULTORES Y OCUPACIÓN:
${consultantSummary}

PROYECTOS ACTIVOS:
${projectSummary}
`;
}

/**
 * Generate AI-powered recommendations for resource optimization
 */
export async function generateRecommendations(
  apiKey: string,
  state: AppState,
  periodId: string,
  isWeekly: boolean
): Promise<AIRecommendation[]> {
  if (!apiKey) {
    throw new Error('API Key no configurada');
  }

  const ai = new GoogleGenAI({ apiKey });
  const dataSummary = prepareDataSummary(state, periodId, isWeekly);

  const prompt = `
Eres un Resource Manager experto en consultoría. Analiza los siguientes datos de ocupación del equipo:

${dataSummary}

TAREA: Genera exactamente 3 recomendaciones de optimización. Sé específico con nombres reales de los datos proporcionados.

Responde ÚNICAMENTE con un array JSON válido, sin texto adicional ni markdown:
[
  {
    "id": "1",
    "title": "Título breve y accionable (máx 50 caracteres)",
    "description": "Descripción en 1 línea con nombres específicos",
    "impact": "Impacto cuantificado (ej: Libera 20h, Reduce riesgo)",
    "type": "optimization"
  }
]

Tipos válidos: "optimization" (redistribuir carga), "alert" (riesgo/sobrecarga), "opportunity" (consultor disponible).
`;

  try {
    const responseText = await generateWithCascade(ai, prompt);

    // Clean the response - remove markdown code blocks if present
    let cleanedText = responseText.trim();
    if (cleanedText.startsWith('```')) {
      cleanedText = cleanedText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
    }

    const recommendations: AIRecommendation[] = JSON.parse(cleanedText);
    return recommendations.slice(0, 3); // Ensure max 3 recommendations
  } catch (error: any) {
    console.error('Error generating recommendations:', error);
    throw new Error(`Error al generar recomendaciones: ${error.message}`);
  }
}

/**
 * Legacy function for general insights (kept for compatibility)
 */
export const getOccupancyInsights = async (
  state: AppState,
  periodId: string,
  isWeekly: boolean
): Promise<string> => {
  try {
    const apiKey = state.settings.geminiApiKey;
    if (!apiKey) return "API Key no configurada en Ajustes.";

    const ai = new GoogleGenAI({ apiKey });
    const dataSummary = prepareDataSummary(state, periodId, isWeekly);

    const prompt = `
Eres un Resource Manager experto. Analiza estos datos de ocupación:

${dataSummary}

Genera un informe ejecutivo breve (máx 150 palabras) sobre la salud del equipo.
Identifica riesgos y oportunidades. Responde en castellano profesional.
`;

    const response = await generateWithCascade(ai, prompt);
    return response || "No se pudo generar el análisis.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return `Error al conectar con la IA: ${(error as Error).message}`;
  }
};