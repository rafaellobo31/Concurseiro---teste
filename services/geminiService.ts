import { GoogleGenAI } from "@google/genai";

const getAI = () => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error("VITE_GEMINI_API_KEY não definida");
  }

  return new GoogleGenAI({ apiKey });
};

export const generateContent = async (prompt: string) => {
  try {
    const ai = getAI();

    const model = ai.getGenerativeModel({
      model: "gemini-1.5-flash",
    });

    const result = await model.generateContent(prompt);

    return result.response.text();
  } catch (error) {
    console.error("Erro ao gerar conteúdo com Gemini:", error);
    throw error;
  }
};
