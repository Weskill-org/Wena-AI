import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

if (!API_KEY) {
  console.warn("VITE_GEMINI_API_KEY is not set in .env");
}

const genAI = new GoogleGenerativeAI(API_KEY || "");

export const geminiLessonService = {
  async generateLessonContent(topic: string, moduleContext: string, chapterContext: string) {
    try {
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

      const prompt = `
        You are an expert AI tutor. Create a comprehensive lesson on the topic: "${topic}".
        Context: This lesson is part of the module "${moduleContext}" and chapter "${chapterContext}".
        
        Please provide the content in valid Markdown format with the following structure:
        1. **Introduction**: Brief overview of the concept.
        2. **Key Concepts**: Detailed explanation with bullet points.
        3. **Code Examples**: Provide clear code snippets (if applicable to the topic) with explanations.
        4. **Real-world Application**: How this is used in practice.
        5. **Summary**: A quick wrap-up.
        
        Keep the tone encouraging and easy to understand for a beginner to intermediate learner.
      `;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      return response.text();
    } catch (error) {
      console.error("Error generating lesson content:", error);
      throw new Error("Failed to generate lesson content. Please try again.");
    }
  },

  async generateModuleSuggestions(persona: string) {
    try {
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
      const prompt = `
        Based on the following user persona, suggest 10 unique and engaging learning modules.
        Persona: "${persona}"

        Return the response as a JSON array of objects, where each object has:
        - "title": A catchy module title.
        - "description": A brief, exciting description (1-2 sentences).
        - "estimated_duration": Estimated hours to complete (number).
        - "credit_cost": Suggested credit cost (between 10-50).

        Example format:
        [
          { "title": "Advanced React Patterns", "description": "Master HOCs and Render Props.", "estimated_duration": 5, "credit_cost": 20 }
        ]
        Do not include markdown formatting like \`\`\`json. Just return the raw JSON string.
      `;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text().replace(/```json/g, '').replace(/```/g, '').trim();
      return JSON.parse(text);
    } catch (error) {
      console.error("Error generating module suggestions:", error);
      return [];
    }
  },

  async generateCurriculum(moduleTitle: string, persona: string) {
    try {
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
      const prompt = `
        Create a comprehensive curriculum for a learning module titled "${moduleTitle}".
        Target Audience Persona: "${persona}"

        The curriculum should take the learner from basics to advanced topics.
        Return the response as a JSON object with the following structure:
        {
          "chapters": [
            {
              "title": "Chapter Title",
              "description": "Chapter Description",
              "estimated_duration": 60, // minutes
              "lessons": [
                {
                  "title": "Lesson Title",
                  "content": "Lesson content summary (actual content will be generated later)"
                }
              ]
            }
          ]
        }
        
        Generate at least 3-5 chapters with 3-5 lessons each.
        Do not include markdown formatting like \`\`\`json. Just return the raw JSON string.
      `;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text().replace(/```json/g, '').replace(/```/g, '').trim();
      console.log("Raw Gemini Response for Curriculum:", text);

      const parsed = JSON.parse(text);

      if (!parsed.chapters || !Array.isArray(parsed.chapters)) {
        console.error("Invalid curriculum structure:", parsed);
        // Fallback structure
        return { chapters: [] };
      }

      return parsed;
    } catch (error) {
      console.error("Error generating curriculum:", error);
      throw new Error("Failed to generate curriculum");
    }
  }
};
