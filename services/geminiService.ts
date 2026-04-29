import { GoogleGenAI, Type } from "@google/genai";
import { GridDimensions, TileData } from "../types";

const MAX_RETRIES = 3;
const INITIAL_DELAY = 2000;

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const processImage = async (
  base64Image: string,
  dimensions: GridDimensions,
  retryCount = 0
): Promise<TileData[]> => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      'Missing VITE_GEMINI_API_KEY. Copy .env.example to .env.local and set your key.'
    );
  }
  const ai = new GoogleGenAI({ apiKey });

  const prompt = `
    Analyze this game board screenshot. It is a grid with approximately ${dimensions.rows} rows and ${dimensions.cols} columns.
    1. Identify the grid structure.
    2. Extract numeric score value from each tile.
    3. Return JSON object with 'tiles' array.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: { parts: [{ inlineData: { mimeType: "image/jpeg", data: base64Image } }, { text: prompt }] },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            tiles: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: { row: { type: Type.INTEGER }, col: { type: Type.INTEGER }, value: { type: Type.INTEGER } },
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
    const cleanJson = text.trim().replace(/^```json\n?/, '').replace(/\n?```$/, '').trim();
    const data = JSON.parse(cleanJson);
    return data.tiles || [];
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    const status =
      error && typeof error === 'object' && 'status' in error
        ? (error as { status?: number }).status
        : undefined;
    const isRateLimit = msg.includes('429') || status === 429;
    if (isRateLimit && retryCount < MAX_RETRIES) {
      await sleep(INITIAL_DELAY * Math.pow(2, retryCount));
      return processImage(base64Image, dimensions, retryCount + 1);
    }
    throw error;
  }
};

export const geminiService = { processImage };