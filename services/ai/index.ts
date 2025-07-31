import { env } from "../../constants";
import { AiProvider } from "./types";
import { GoogleProvider } from "./google";
import { OpenAiProvider } from "./openai";
import { OpenRouterProvider } from "./openrouter";

let aiProvider: AiProvider;

export function getAiProvider(): AiProvider {
  if (aiProvider) {
    return aiProvider;
  }

  switch (env.AI_PROVIDER) {
    case "google":
      aiProvider = new GoogleProvider();
      break;
    case "openai":
      aiProvider = new OpenAiProvider();
      break;
    case "openrouter":
      aiProvider = new OpenRouterProvider();
      break;
    default:
      throw new Error(`Unsupported AI provider: ${env.AI_PROVIDER}`);
  }

  return aiProvider;
}
