import { GoogleGenAI, Type } from "@google/genai";
import { SurveyAnswers, AIAnalysisResult, RiskLevel, Language } from "../types";

// -------------------------
// GET API KEY (Vercel / Local / IDX)
// -------------------------
const getApiKey = () => {
  // 1. Vercel → process.env
  if (typeof process !== "undefined" && process.env.GEMINI_API_KEY) {
    return process.env.GEMINI_API_KEY;
  }

  // 2. Vite local → import.meta.env
  if (typeof import.meta !== "undefined" && import.meta.env?.GEMINI_API_KEY) {
    return import.meta.env.GEMINI_API_KEY;
  }

  // 3. Fallback
  return "";
};

const langMap = {
  en: "English",
  pt: "Portuguese (Português do Brasil)",
  es: "Spanish (Español)"
};

// -------------------------
// FACE VALIDATION
// -------------------------
export const validateFace = async (
  imageBase64: string
): Promise<{ isValid: boolean; message?: string }> => {
  try {
    const key = getApiKey();
    if (!key) throw new Error("API Key not found.");

    const ai = new GoogleGenAI({ apiKey: key });

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

  } catch (err) {
    console.error("Face Validation Error:", err);
    return {
      isValid: false,
      message: "AI Connection Error. Check Key."
    };
  }
};

// -------------------------
// FATIGUE ANALYSIS
// -------------------------
export const analyzeFatigue = async (
  imageBase64: string,
  survey: SurveyAnswers,
  lang: Language
): Promise<AIAnalysisResult> => {
  try {
    const key = getApiKey();
    if (!key) throw new Error("API Key not found.");

    const ai = new GoogleGenAI({ apiKey: key });
    const targetLang = langMap[lang];

    const surveyContext = `
User Self-Reported Metrics (20% Weight):
- Sleep Quality: ${survey.sleepQuality}
- Energy: ${survey.energyLevel}/10
- Focus: ${survey.focusLevel}/10
- Motivation: ${survey.motivationLevel}/10
- Feeling Safe: ${survey.feelingSafe}/10
`;

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
            text: `Act as a biometric fatigue analyst.

Return JSON with:
fatigueLevel, riskLevel, explanation, recommendation.

If face expression is exaggerated (yawn, tongue out, hands blocking),
return { "riskLevel": "INVALID" }`
          }
        ]
      },

      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            fatigueLevel: { type: Type.NUMBER },
            riskLevel: { type: Type.STRING, enum: [
              RiskLevel.LOW,
              RiskLevel.MODERATE,
              RiskLevel.HIGH,
              RiskLevel.INVALID
            ]},
            explanation: { type: Type.STRING },
            recommendation: { type: Type.STRING },
          },
          required: ["fatigueLevel", "riskLevel", "explanation", "recommendation"]
        }
      }
    });

    return JSON.parse(response.text || "{}");

  } catch (err) {
    console.error("Gemini Analysis Error:", err);
    return {
      fatigueLevel: 0,
      riskLevel: RiskLevel.INVALID,
      explanation: "AI Connection Error or Invalid API Key.",
      recommendation: "Try again later."
    };
  }
};
