import { GoogleGenAI, Type } from "@google/genai";
import { GridDimensions, TileData } from "../types";
import { analytics } from "./analyticsService";

const MAX_RETRIES = 3;
const INITIAL_DELAY = 2000; // 2 seconds

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const processImage = async (
  base64Image: string,
  dimensions: GridDimensions,
  apiKey: string,
  retryCount = 0
): Promise<TileData[]> => {
  const ai = new GoogleGenAI({ apiKey });

  const prompt = `
    Analyze this game board screenshot. It is a grid with approximately ${dimensions.rows} rows and ${dimensions.cols} columns.
    
    Your task:
    1. Identify the grid structure.
    2. Extract the numeric score value from each visible tile.
    3. Return a JSON object containing a list of tiles.
    
    Rules:
    - Row 0 is the top row.
    - Col 0 is the left-most column.
    - Ignore empty cells or cells where the number is illegible.
    - Values are typically between 100 and 1000.
    - If you are unsure of a number, omit that specific tile.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: "image/jpeg",
              data: base64Image,
            },
          },
          {
            text: prompt,
          },
        ],
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            tiles: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  row: { type: Type.INTEGER },
                  col: { type: Type.INTEGER },
                  value: { type: Type.INTEGER },
                },
                required: ["row", "col", "value"],
              },
            },
          },
          required: ["tiles"]
        },
      },
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");

    const cleanJson = text.replace(/^```json\n?/, '').replace(/\n?```$/, '').trim();
    const data = JSON.parse(cleanJson);
    return data.tiles || [];
  } catch (error: any) {
    const isRateLimit = error?.message?.includes('429') || error?.status === 429 || error?.message?.includes('RESOURCE_EXHAUSTED');
    
    if (isRateLimit) {
      analytics.trackEvent('Gemini Rate Limit Hit', { attempt: retryCount, status: error?.status });
      
      if (retryCount < MAX_RETRIES) {
        const delay = INITIAL_DELAY * Math.pow(2, retryCount);
        console.warn(`Rate limit hit. Retrying in ${delay}ms... (Attempt ${retryCount + 1}/${MAX_RETRIES})`);
        await sleep(delay);
        return processImage(base64Image, dimensions, apiKey, retryCount + 1);
      }
    }

    analytics.trackEvent('Gemini Analysis Error', { 
      message: error?.message, 
      status: error?.status,
      isRateLimit 
    });
    
    console.error("Gemini Analysis Error:", error);
    throw error;
  }
};

export const geminiService = {
  processImage,
};