import { GoogleGenAI, Type } from "@google/genai";
import { SurveyAnswers, AIAnalysisResult, RiskLevel, Language } from "../types";

// -------------------------
// GET API KEY - CORRIGIDO PARA USAR A CONVENÇÃO VITE
// -------------------------
const getApiKey = (): string => {
  // Padronizamos para usar 'VITE_GEMINI_API_KEY' ou 'VITE_API_KEY'
  // No Vercel, a chave PRECISA ser prefixada com VITE_
  const apiKey = (import.meta.env?.VITE_GEMINI_API_KEY || import.meta.env?.VITE_API_KEY);
  
  if (!apiKey) {
    // Log de erro útil, que pode aparecer nos logs de build/runtime do Vercel
    console.error("ERRO: Variável de ambiente da Gemini API (VITE_GEMINI_API_KEY) não encontrada.");
  }
  
  // Retorna a chave encontrada ou uma string vazia se não encontrar (para forçar o throw abaixo)
  return apiKey || "";
};

// -------------------------
// MAPA DE LÍNGUAS
// -------------------------
const langMap = {
  en: "English",
  pt: "Portuguese (Português do Brasil)",
  es: "Spanish (Español)"
};

// -------------------------
// 1) VALIDAÇÃO DE ROSTO
// -------------------------
export const validateFace = async (
  imageBase64: string
): Promise<{ isValid: boolean; message?: string }> => {
  try {
    const key = getApiKey();
    // Este erro será disparado se a chave não for encontrada
    if (!key) throw new Error("API Key not found."); 

    const ai = new GoogleGenAI({ apiKey: key });

    // ... (restante do código da função validateFace é o mesmo) ...
    // Seu código original:
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: "image/jpeg",
              data: imageBase64.split(",")[1],
            },
          },
          {
            text: `Strict Face Detection Task.
              Analyze the image. Is there a REAL human face clearly visible and identifiable?
              Reject:
              - walls, objects, dark images
              - partial faces
              - photos of screens or printed photos
              
              Return JSON: { "isValid": boolean, "message": string }`
          },
        ],
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            isValid: { type: Type.BOOLEAN },
            message: { type: Type.STRING }
          },
          required: ["isValid"]
        }
      }
    });

    return JSON.parse(response.text || "{}");

  } catch (error) {
    console.error("Face Validation Error:", error);
    return { isValid: false, message: "AI Connection Error. Check Key." };
  }
};

// -------------------------
// 2) ANÁLISE DE FADIGA
// -------------------------
export const analyzeFatigue = async (
  imageBase64: string,
  survey: SurveyAnswers,
  lang: Language
): Promise<AIAnalysisResult> => {
  try {
    const key = getApiKey();
    // Este erro será disparado se a chave não for encontrada
    if (!key) throw new Error("API Key not found."); 

    const ai = new GoogleGenAI({ apiKey: key });
    const targetLang = langMap[lang];

    const surveyContext = `
      Technician Self-Reported Metrics (20% Weight):
      - Sleep Quality: ${survey.sleepQuality}/5
      - Energy: ${survey.energyLevel}/10
      - Focus: ${survey.focusLevel}/10
      - Motivation: ${survey.motivationLevel}/10
      - Feeling Safe: ${survey.feelingSafe}/10
    `;

    // ... (restante do código da função analyzeFatigue é o mesmo) ...
    // Seu código original:
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: "image/jpeg",
              data: imageBase64.split(",")[1],
            },
          },
          {
            text: `
              You are a biometric fatigue analyst.

              Reject immediately if:
              - Mouth wide open
              - Hands covering face
              - Exaggerated expressions
              - Tongue out
              - Acting intentionally

              Scoring Rule:
              FinalScore = (VisualFatigue * 0.8) + (SurveyScore * 0.2)

              Visual signs:
              - Droopy eyelids
              - Dark circles
              - Low muscle tone
              - Glassy eyes

              OVERRIDE:
              If VisualFatigue > 70 → riskLevel = HIGH.

              Output JSON in ${targetLang}:
              { fatigueLevel, riskLevel, explanation, recommendation }
            `
          }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            fatigueLevel: { type: Type.NUMBER },
            riskLevel: {
              type: Type.STRING,
              enum: [RiskLevel.LOW, RiskLevel.MODERATE, RiskLevel.HIGH, RiskLevel.INVALID]
            },
            explanation: { type: Type.STRING },
            recommendation: { type: Type.STRING }
          },
          required: ["fatigueLevel", "riskLevel", "explanation", "recommendation"]
        }
      }
    });

    return JSON.parse(response.text || "{}");

  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    return {
      fatigueLevel: 0,
      riskLevel: RiskLevel.INVALID,
      explanation:
        lang === "pt"
          ? "Erro na conexão com IA ou chave inválida."
          : "AI connection error.",
      recommendation:
        lang === "pt"
          ? "Tente novamente mais tarde."
          : "Try again later.",
    };
  }
};
