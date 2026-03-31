import { GoogleGenAI, Type } from "@google/genai";

export async function analyzeCV(
  fileBase64: string,
  mimeType: string,
  profile: { title: string; field: string; experience: string; skills: string; professionalBackground: string; otherRequirements: string }
) {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  
  const requirements = `
    Job Title: ${profile.title}
    Field: ${profile.field}
    Required Experience: ${profile.experience}
    Required Skills: ${profile.skills}
    Professional Background: ${profile.professionalBackground}
    Other Requirements: ${profile.otherRequirements}
  `;

  const response = await ai.models.generateContent({
    model: "gemini-3.1-pro-preview",
    contents: [
      {
        inlineData: {
          data: fileBase64,
          mimeType: mimeType,
        }
      },
      `Analyze this CV against the following job requirements:\n${requirements}`
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          candidateName: { type: Type.STRING, description: "Name of the candidate" },
          score: { type: Type.NUMBER, description: "Fit score from 0 to 100 based on the requirements" },
          strengths: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Top 3-5 strengths matching the requirements" },
          summary: { type: Type.STRING, description: "A short 2-3 sentence summary of the candidate's fit" }
        },
      }
    }
  });

  return JSON.parse(response.text || '{}');
}
