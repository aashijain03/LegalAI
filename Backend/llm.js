import { config } from "./config.js";

const HF_API_KEY = config.hfApiKey;
const HF_MODEL = config.hfModel;
const HF_FALLBACK_MODELS = config.hfFallbackModels;

export async function fetchWithRetry(url, options, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      return await fetch(url, options);
    } catch (err) {
      if (i === retries - 1) throw err;
      console.log(`Fetch failed, retrying... (${i + 1}/${retries})`);
      await new Promise((r) => setTimeout(r, 1000 * (i + 1)));
    }
  }
}

export function cleanAIResponse(text) {
  // Remove markdown code blocks if they exist
  let cleaned = text.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```[a-z]*\n/i, "");
    cleaned = cleaned.replace(/\n```$/i, "");
  }
  return cleaned.trim();
}

export async function callHuggingFaceChat(payload) {
  const models = [...new Set([HF_MODEL, ...HF_FALLBACK_MODELS])];
  let lastError = "";

  for (const model of models) {
    let response;
    try {
      response = await fetchWithRetry(
        "https://router.huggingface.co/v1/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${HF_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ...payload,
            model,
          }),
        }
      );
    } catch (err) {
      lastError = err.message || String(err);
      console.error(`Fetch exception for model ${model}:`, lastError);
      continue;
    }

    if (response.ok) {
      return response;
    }

    lastError = await response.text();
    console.error("HF API Error:", response.status, model, lastError);
  }

  throw new Error(lastError || "HF API failed");
}
