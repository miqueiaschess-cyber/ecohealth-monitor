import { GoogleGenAI, Type } from "@google/genai";
import { SurveyAnswers, AIAnalysisResult, RiskLevel, Language } from "../types";

// Helper to safely get API Key in both Local (Vite) and Online (Google IDX) environments
const getApiKey = () => {
  // Check import.meta.env (Vite standard)
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_KEY) {
    return import.meta.env.VITE_API_KEY;
  }
  // Check process.env (Fallback for some cloud editors)
  if (typeof process !== 'undefined' && process.env) {
    return process.env.VITE_API_KEY || process.env.API_KEY;
  }
  return '';
};

const langMap = {
  en: "English",
  pt: "Portuguese (Português do Brasil)",
  es: "Spanish (Español)"
};

export const validateFace = async (imageBase64: string): Promise<{ isValid: boolean; message?: string }> => {
  try {
    const key = getApiKey();
    if (!key) throw new Error("API Key not found in .env");
    const ai = new GoogleGenAI({ apiKey: key });

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: "image/jpeg",
              data: imageBase64.split(',')[1],
            },
          },
          {
            text: `Strict Face Detection Task.
            Analyze the image. Is there a REAL human face clearly visible and identifiable?
            - Reject walls, ceilings, dark images, partial faces, or objects.
            - Reject photos of screens or photos of photos if detected.
            
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

    const result = JSON.parse(response.text || "{}");
    return result as { isValid: boolean; message?: string };
  } catch (error) {
    console.error("Face Validation Error:", error);
    return { isValid: false, message: "AI Connection Error. Check Key." };
  }
};

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
      Technician Self-Reported Metrics (User Claims - 20% Weight):
      - Sleep Quality (1-5): ${survey.sleepQuality}
      - Energy Level: ${survey.energyLevel}/10
      - Focus Level: ${survey.focusLevel}/10
      - Motivation Level: ${survey.motivationLevel}/10
      - Feeling Safe/Confident: ${survey.feelingSafe}/10
    `;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: "image/jpeg",
              data: imageBase64.split(',')[1],
            },
          },
          {
            text: `Act as a Forensic Biometric Analyst. Perform a fatigue assessment.

            PRIORITY 0: ANTI-SPOOFING & EXPRESSION VALIDATION (Fail Fast)
            Before analyzing fatigue, you MUST validate the facial expression.
            Return 'riskLevel': 'INVALID' immediately if:
            1. Mouth is wide open (Yawning, screaming, or making faces).
            2. Tongue is sticking out.
            3. Extreme/Theatrical facial contortions (grimacing).
            4. Hands or objects are blocking eyes/mouth.
            5. The expression looks "acted" or "forced".
            
            **REQUIREMENT:** The user must have a NEUTRAL face or a naturally relaxed face for accurate biometric reading. 
            - Real fatigue shows in micro-expressions (drooping), not in exaggerated open-mouth poses.
            - If they are yawning widely, reject it and tell them to keep a neutral face for the scan.

            CRITICAL SCORING RULE (80/20 SPLIT):
            If the face is valid (Neutral/Natural), calculate risk using this formula:
            Final_Score = (Visual_Analysis_Score * 0.8) + (Survey_Score * 0.2)

            1. VISUAL ANALYSIS (The Truth - 80% Weight):
               Look for involuntary micro-expressions of fatigue on a NEUTRAL face:
               - Ptosis (drooping eyelids)
               - Heavy under-eye bags or dark circles
               - Lack of facial muscle tone (sagging)
               - Glassy eyes
               * If any of these are strongly present, the Visual_Analysis_Score is HIGH (80-100).

            2. SURVEY CONTEXT (Subjective - 20% Weight):
               ${surveyContext}

            3. OVERRIDE RULE:
               If Visual_Analysis_Score > 70 (Visible Exhaustion), the Final Risk MUST be HIGH, regardless of what the user claims in the survey. The camera does not lie.

            4. OUTPUT:
               - Generate 'explanation' in ${targetLang}. 
                 * IF INVALID: Explain clearly ("Please keep a neutral expression", "Do not open mouth wide").
                 * IF VALID: Start by describing the visual signs found.
               - Generate 'recommendation' in ${targetLang}.

            Return JSON matching the schema.`,
          },
        ],
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            fatigueLevel: { type: Type.NUMBER, description: "Calculated fatigue 0-100 based on the 80/20 rule." },
            riskLevel: { type: Type.STRING, enum: [RiskLevel.LOW, RiskLevel.MODERATE, RiskLevel.HIGH, RiskLevel.INVALID] },
            explanation: { type: Type.STRING, description: `Detailed assessment in ${targetLang}.` },
            recommendation: { type: Type.STRING, description: `Actionable recommendation in ${targetLang}.` },
          },
          required: ["fatigueLevel", "riskLevel", "explanation", "recommendation"],
        },
      },
    });

    const result = JSON.parse(response.text || "{}");
    return result as AIAnalysisResult;

  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    return {
      fatigueLevel: 0,
      riskLevel: RiskLevel.INVALID,
      explanation: lang === 'pt' ? "Erro na conexão com IA ou Chave de API inválida." : "AI Connection Error.",
      recommendation: lang === 'pt' ? "Tente novamente mais tarde." : "Try again.",
    };
  }
};