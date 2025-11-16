// backend/classifyHealthNeed.mjs
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY
});

const HEALTH_NEED_LABELS = [
  "get_stronger",
  "injury_rehab",
  "heart_concern",
  "mental_health",
  "std_check",
  "general_checkup",
  "nutrition",
  "chronic_pain"
];

function extractJson(text) {
  const match = text.match(/\{[\s\S]*\}/);
  if (match) return match[0];
  return text.trim();
}

export async function classifyHealthNeed(message) {
  const systemPrompt = `
You classify user health messages into EXACTLY ONE of these labels:

- get_stronger
- injury_rehab
- heart_concern
- mental_health
- std_check
- general_checkup
- nutrition
- chronic_pain

Pick the one that fits best.
If unclear, choose general_checkup.

RESPOND WITH ONLY JSON LIKE:
{"need": "injury_rehab"}

NO extra text.
  `.trim();

  const userPrompt = `User message: "${message}"`;

  let response;
  try {
    response = await ai.models.generateContent({
      model: "gemini-2.0-flash-001", // or "gemini-2.5-flash" etc
      contents: [
        {
          role: "user",
          parts: [{ text: systemPrompt + "\n\n" + userPrompt }]
        }
      ]
    });
  } catch (e) {
    console.error("Gemini error:", e);
    return "general_checkup";
  }

  const text = response.text; // new SDK: response.text, not response.response.text()

  const jsonStr = extractJson(text);
  let obj;
  try {
    obj = JSON.parse(jsonStr);
  } catch {
    return "general_checkup";
  }

  if (!obj.need) return "general_checkup";
  if (!HEALTH_NEED_LABELS.includes(obj.need)) return "general_checkup";

  return obj.need;
}
