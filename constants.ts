import { z } from "zod";
import dotenv from "dotenv";

dotenv.config();

const envSchema = z.object({
  PORT: z.string().default("5353"),
  HOST: z.string().default("localhost"),
  SSL: z.string().default("false"),
  GOOGLE_GENERATIVE_AI_API_KEY: z
    .string()
    .min(1, "Google Generative AI API key is required."),
  AI_MODEL: z.string().default("gemini-2.5-flash"),
});

export const env = envSchema.parse(process.env);
