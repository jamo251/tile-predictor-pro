import { GoogleGenAI, Type } from '@google/genai';

const MODEL = 'gemini-3-flash-preview';
const MAX_RETRIES = 3;
const INITIAL_DELAY_MS = 2000;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

export async function analyzeBoardImage(
  apiKey: string,
  base64Image: string,
  mimeType: string,
  dimensions: { rows: number; cols: number },
  retryCount = 0
): Promise<{ row: number; col: number; value: number }[]> {
  const mime = ALLOWED_MIME.has(mimeType) ? mimeType : 'image/jpeg';
  const ai = new GoogleGenAI({ apiKey });

  const prompt = `
    Analyze this game board screenshot. It is a grid with approximately ${dimensions.rows} rows and ${dimensions.cols} columns.
    1. Identify the grid structure.
    2. Extract numeric score value from each tile.
    3. Return JSON object with 'tiles' array.
  `;

  try {
    const response = await ai.models.generateContent({
      model: MODEL,
      contents: {
        parts: [{ inlineData: { mimeType: mime, data: base64Image } }, { text: prompt }],
      },
      config: {
        responseMimeType: 'application/json',
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
                required: ['row', 'col', 'value'],
              },
            },
          },
          required: ['tiles'],
        },
      },
    });

    const text = response.text;
    if (!text) throw new Error('No response from AI');
    const cleanJson = text
      .trim()
      .replace(/^```json\n?/, '')
      .replace(/\n?```$/, '')
      .trim();
    const data = JSON.parse(cleanJson) as { tiles?: { row: number; col: number; value: number }[] };
    return data.tiles ?? [];
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    const status =
      error && typeof error === 'object' && 'status' in error
        ? (error as { status?: number }).status
        : undefined;
    const isRateLimit = msg.includes('429') || status === 429;
    if (isRateLimit && retryCount < MAX_RETRIES) {
      await sleep(INITIAL_DELAY_MS * Math.pow(2, retryCount));
      return analyzeBoardImage(apiKey, base64Image, mimeType, dimensions, retryCount + 1);
    }
    throw error;
  }
}
