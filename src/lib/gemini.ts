import { supabase } from "@/integrations/supabase/client";

export const sendMessageToGemini = async (message: string, model: string = "gemini-2.5-flash-native-audio-preview-09-2025") => {
  try {
    const { data, error } = await supabase.functions.invoke('get-gemini-key', {
      body: { message, model, mode: 'chat' }
    });

    if (error) {
      console.error("Supabase function error:", error);
      throw new Error("Failed to communicate with Gemini.");
    }

    if (!data?.generatedText) {
      console.error("No generated text in response:", data);
      throw new Error("Empty response from Gemini.");
    }

    return data.generatedText;
  } catch (error) {
    console.error("Error sending message to Gemini:", error);
    throw error;
  }
};
