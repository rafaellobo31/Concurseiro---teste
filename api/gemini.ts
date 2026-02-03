
import { GoogleGenAI } from "@google/genai";

export const config = {
  runtime: 'edge',
};

/**
 * Handler da API Gemini para Vercel (Edge Runtime)
 * Centraliza as chamadas à IA no backend para segurança e estabilidade.
 */
export default async function handler(req: Request) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Método não permitido' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const { model, contents, config: aiConfig } = await req.json();

    if (!process.env.API_KEY) {
      throw new Error("Chave de API (process.env.API_KEY) não configurada no servidor.");
    }

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    // Executa a chamada ao Gemini 3
    const response = await ai.models.generateContent({
      model: model || 'gemini-3-flash-preview',
      contents,
      config: aiConfig
    });

    // Extraímos os dados necessários para o frontend, incluindo o texto e metadados de grounding
    const output = {
      text: response.text,
      candidates: response.candidates,
      usageMetadata: (response as any).usageMetadata
    };

    return new Response(JSON.stringify(output), {
      status: 200,
      headers: { 
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store'
      }
    });

  } catch (error: any) {
    console.error("Erro na API Gemini Route:", error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Erro interno no processamento da IA',
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
