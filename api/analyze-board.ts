import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { z } from 'zod';
import { analyzeBoardImage } from './lib/analyzeBoardCore.js';

/** ~3.5M base64 chars keeps JSON body under Vercel serverless limits (~4.5MB). */
const MAX_BASE64_CHARS = 3_500_000;

const mimeEnum = z.enum(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

const bodySchema = z.object({
  base64Image: z.string().min(1).max(MAX_BASE64_CHARS),
  mimeType: mimeEnum.optional(),
  dimensions: z.object({
    rows: z.number().int().min(1).max(20),
    cols: z.number().int().min(1).max(20),
  }),
});

let ratelimit: Ratelimit | null | undefined;

function getRatelimit(): Ratelimit | null {
  if (ratelimit !== undefined) return ratelimit;
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    ratelimit = null;
    return null;
  }
  const redis = Redis.fromEnv();
  ratelimit = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(30, '1 m'),
    prefix: 'tilepredict-api',
  });
  return ratelimit;
}

function parseAllowedOrigins(): string[] {
  return (process.env.ALLOWED_ORIGINS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function applyCors(req: VercelRequest, res: VercelResponse): void {
  const allowed = parseAllowedOrigins();
  if (allowed.length === 0) return;
  const origin = req.headers.origin;
  if (typeof origin === 'string' && allowed.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Vary', 'Origin');
  }
}

function clientIp(req: VercelRequest): string {
  const xf = req.headers['x-forwarded-for'];
  if (typeof xf === 'string') return xf.split(',')[0]?.trim() || 'unknown';
  if (Array.isArray(xf) && xf[0]) return xf[0].split(',')[0]?.trim() || 'unknown';
  return typeof req.socket?.remoteAddress === 'string' ? req.socket.remoteAddress : 'unknown';
}

function parseBody(req: VercelRequest): unknown {
  const b = req.body;
  if (b == null) return {};
  if (typeof b === 'object') return b;
  if (typeof b === 'string') {
    try {
      return JSON.parse(b);
    } catch {
      throw new SyntaxError('Invalid JSON');
    }
  }
  return {};
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<VercelResponse | void> {
  applyCors(req, res);

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    return res.status(503).json({ error: 'Service unavailable' });
  }

  let body: unknown;
  try {
    body = parseBody(req);
  } catch {
    return res.status(400).json({ error: 'Invalid JSON body' });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid request' });
  }

  const rl = getRatelimit();
  if (rl) {
    const { success } = await rl.limit(clientIp(req));
    if (!success) {
      return res.status(429).json({ error: 'Too many requests' });
    }
  }

  try {
    const mime = parsed.data.mimeType ?? 'image/jpeg';
    const tiles = await analyzeBoardImage(
      apiKey,
      parsed.data.base64Image,
      mime,
      parsed.data.dimensions
    );
    return res.status(200).json({ tiles });
  } catch {
    return res.status(502).json({ error: 'Analysis failed' });
  }
}
