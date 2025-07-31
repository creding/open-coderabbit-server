import { z } from "zod";
import dotenv from "dotenv";

dotenv.config();

const envSchema = z.object({
  // Server configuration
  PORT: z.string().default("5353"),
  HOST: z.string().default("localhost"),
  SSL: z.string().default("false"),

  // AI configuration
  GOOGLE_GENERATIVE_AI_API_KEY: z
    .string()
    .min(1, "Google Generative AI API key is required."),
  AI_MODEL: z.string().default("gemini-2.5-flash"),

  // File validation
  MAX_FILE_SIZE: z.string().default("10485760"), // 10MB
  MAX_FILES_PER_REVIEW: z.string().default("50"),
  MAX_TOTAL_SIZE: z.string().default("52428800"), // 50MB

  // Rate limiting
  RATE_LIMIT_REQUESTS: z.string().default("10"),
  RATE_LIMIT_WINDOW_MS: z.string().default("60000"), // 1 minute

  // Performance
  REVIEW_TIMEOUT_MS: z.string().default("300000"), // 5 minutes

  // Logging
  LOG_LEVEL: z.string().default("info"),
  LOG_TO_FILE: z.string().default("false"),
});

export const env = envSchema.parse(process.env);
