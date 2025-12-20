import { GoogleGenerativeAI } from "@google/generative-ai";
import { supabase } from "@/integrations/supabase/client";

let cachedApiKey: string | null = null;

export const getGeminiApiKey = async (): Promise<string> => {
  if (cachedApiKey) return cachedApiKey;

  const { data, error } = await supabase.functions.invoke('get-gemini-key');
  
  if (error || !data?.apiKey) {
    console.error("Failed to get Gemini API key:", error);
    throw new Error("Failed to get Gemini API key");
  }

  cachedApiKey = data.apiKey;
  return data.apiKey;
};

export const clearGeminiKeyCache = () => {
  cachedApiKey = null;
};

export const sendMessageToGemini = async (message: string) => {
  try {
    const apiKey = await getGeminiApiKey();
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-native-audio-preview-09-2025" });
    const result = await model.generateContent(message);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error("Error sending message to Gemini:", error);
    throw error;
  }
};
