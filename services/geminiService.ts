
import { GoogleGenAI, FunctionDeclaration, Type, GenerateContentResponse } from "@google/genai";
import type { ChatMessage } from '../types';

const SYSTEM_PROMPT = `
Você é "ReparaFácil", um IA especialista em diagnóstico e reparo de QUALQUER item. Seu tom é de especialista, calmo e focado na segurança.

FLUXO DE RESPOSTA (OBRIGATÓRIO):

1. IDENTIFICAR: Confirme o item e o problema (use multimodal: texto, imagem). Se ambíguo, faça perguntas.
2. DIAGNOSTICAR: Liste as causas prováveis (mais comum primeiro).
3. ANALISAR RISCO (CRÍTICO): Classifique mentalmente o reparo:
   - Baixo Risco: Simples, sem perigo.
   - Risco Moderado: Requer ferramentas, cuidado, envolve baixa tensão.
   - Alto Risco: Alta tensão, gás, químico, estrutural, risco de vida.
4. PROVER SOLUÇÃO (BIFURCAÇÃO):
   - SE Risco Baixo/Moderado:
     1. Dê um AVISO DE SEGURANÇA (ex: "Desligue da tomada").
     2. Forneça um guia DIY passo a passo.
     3. Liste ferramentas/peças.
     4. Ofereça ajuda profissional como alternativa.
   - SE Risco Alto:
     1. NÃO DÊ INSTRUÇÕES DIY.
     2. Emita um AVISO DE ALTO RISCO (ex: "PERIGO: Risco de choque elétrico. NÃO TENTE REPARAR.").
     3. Recomende imediatamente um profissional.
5. INTEGRAR GOOGLE BUSINESS (Gatilho da API):
   - Ao recomendar um profissional, identifique a categoria exata (ex: "Técnico de máquina de lavar", "Eletricista").
   - Sempre pergunte antes de buscar: "Posso procurar por [Categoria do Profissional] bem avaliados no Google Maps perto de você?"
   - Se o usuário aceitar, execute a função de busca (ex: \`find_local_business(query="Técnico de máquina de lavar")\`).
`;

const findLocalBusinessFunction: FunctionDeclaration = {
  name: 'find_local_business',
  description: 'Finds well-rated local businesses on Google Maps near the user.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      query: {
        type: Type.STRING,
        description: 'The category of professional to search for, e.g., "Técnico de máquina de lavar" or "Eletricista".'
      }
    },
    required: ['query']
  }
};

const fileToGenerativePart = (base64: string, mimeType: string) => {
  return {
    inlineData: {
      data: base64,
      mimeType
    }
  };
};

export const getReparaFacilResponse = async (
    history: ChatMessage[],
    userMessage: string,
    image?: { base64: string; mimeType: string },
    location?: { latitude: number | null, longitude: number | null }
) => {
  // FIX: Always instantiate the client right before the call
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const contents = history
    .filter(msg => msg.role === 'user' || msg.role === 'model')
    .map(msg => ({
        role: msg.role,
        parts: [{ text: msg.text }]
    }));

  // FIX: Correctly construct userParts for multimodal input to resolve TypeScript error
  const userParts = image
    ? [fileToGenerativePart(image.base64, image.mimeType), { text: userMessage }]
    : [{ text: userMessage }];
    
  // FIX: Use `ai.models.generateContent` and pass model name in request
  let response: GenerateContentResponse = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [...contents, { role: 'user', parts: userParts }],
      config: {
        systemInstruction: SYSTEM_PROMPT,
        tools: [{ functionDeclarations: [findLocalBusinessFunction] }],
        ...(location?.latitude && location?.longitude && { 
            toolConfig: { 
                retrievalConfig: { 
                    latLng: {
                        latitude: location.latitude,
                        longitude: location.longitude
                    }
                }
            }
        })
      }
  });

  // Handle function calling
  const functionCalls = response.functionCalls;
  if (functionCalls && functionCalls.length > 0) {
    // For now, we only handle the first function call.
    const call = functionCalls[0];
    const modelTurn = response.candidates?.[0]?.content;

    if (call.name === 'find_local_business' && modelTurn) {
        const { query } = call.args;
        console.log(`Simulating search for: ${query}`);
        // In a real app, you would call the Google Maps API here.
        // We'll simulate the result and send it back to the model.
        // FIX: Function responses should be sent as a 'tool' role message in `contents`
        const functionResponsePart = {
            functionResponse: {
                name: 'find_local_business',
                response: {
                    result: [
                        { name: "Reparos Rápidos Ltda.", rating: 4.8, uri: "https://www.google.com/maps", title: "Reparos Rápidos Ltda." },
                        { name: "ConsertaTudo Assistência", rating: 4.6, uri: "https://www.google.com/maps", title: "ConsertaTudo Assistência" },
                        { name: "Dr. Reparo", rating: 4.9, uri: "https://www.google.com/maps", title: "Dr. Reparo" },
                    ]
                }
            }
        };

        // Send the function response back to the model
        // FIX: Use `ai.models.generateContent` and pass model name in request
        const secondResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: [...contents, { role: 'user', parts: userParts }, modelTurn, { role: 'tool', parts: [functionResponsePart] }],
            config: {
              systemInstruction: SYSTEM_PROMPT,
              tools: [{ functionDeclarations: [findLocalBusinessFunction] }]
            }
        });
        response = secondResponse;
    }
  }
    
  const groundingMetadata = response.candidates?.[0]?.groundingMetadata;
  const businesses = groundingMetadata?.groundingChunks
    ?.map((chunk: any) => chunk.maps ? { uri: chunk.maps.uri, title: chunk.maps.title, rating: 0 } : null) // rating is not directly available here
    .filter(Boolean) ?? [];

  return {
    text: response.text.trim(),
    businesses
  };
};
