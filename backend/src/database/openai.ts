import dotenv from "dotenv";
import path from "path";

// Load env from ROOT (Standardization)
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

export const openaiConfig = {
  apiKey: process.env.MAIA_API_KEY || process.env.OPENAI_API_KEY || "",
  modelName: process.env.MODEL_OPENAI || process.env.MODEL_GEMINI || "gemini-2.5-flash",
  visionModelName: process.env.MODEL_GEMINI || process.env.MODEL_OPENAI || "gemini-2.5-flash",
  baseURL: process.env.OPENAI_BASE_URL || process.env.MAIA_BASE_URL || "https://api.maiarouter.ai/v1", // Default to Maia
};
