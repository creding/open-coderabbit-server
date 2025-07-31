import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  GOOGLE_GENERATIVE_AI_API_KEY: z.string().min(1, { message: 'Google Generative AI API key is required.' }),
  AI_MODEL: z.string().min(1, { message: 'AI model name is required.' }),
});

export const env = envSchema.parse(process.env);