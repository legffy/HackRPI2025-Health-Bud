// backend/index.mjs
import "dotenv/config";
import express from "express";
import cors from "cors";
import { GoogleGenAI } from "@google/genai";
import { classifyHealthNeed } from "./classifyHealthNeed.mjs";

const ai = new GoogleGenAI({
  // GEMINI_API_KEY is read automatically if set in env, so this is optional,
  // but leaving it explicit is fine:
  apiKey: process.env.GEMINI_API_KEY,
});

const GOOGLE_PLACES_KEY = process.env.GOOGLE_PLACES_KEY;

const app = express();
const PORT = 8000;

app.use(cors());
app.use(express.json());

/* ---------- HELPER: healthNeed -> search queries ---------- */

const NEED_TO_QUERIES = {
  get_stronger: ["gym", "fitness center"],
  injury_rehab: ["physical therapy", "sports medicine clinic"],
  heart_concern: ["cardiologist", "heart clinic"],
  mental_health: ["therapist", "mental health clinic", "counseling center"],
  std_check: ["std clinic", "sti testing", "sexual health clinic"],
  general_checkup: ["primary care doctor", "family doctor", "community health clinic"],
  nutrition: ["dietitian", "nutritionist"],
  chronic_pain: ["pain management clinic", "pain specialist"],
};

function getQueriesForNeed(need) {
  return NEED_TO_QUERIES[need] || NEED_TO_QUERIES["general_checkup"];
}

/* ---------- HELPER: Google Places search ---------- */

async function searchPlaces(query, zip) {
  if (!GOOGLE_PLACES_KEY) {
    throw new Error("GOOGLE_PLACES_KEY is not set in environment");
  }

  const url = new URL(
    "https://maps.googleapis.com/maps/api/place/textsearch/json"
  );
  url.searchParams.set("query", `${query} near ${zip}`);
  url.searchParams.set("key", GOOGLE_PLACES_KEY);

  const res = await fetch(url.toString());
  if (!res.ok) {
    throw new Error("Google Places request failed: " + res.status);
  }

  const data = await res.json();
  return data.results || [];
}

/* ---------- SIMPLE CLASSIFY ENDPOINT (optional) ---------- */

app.post("/api/classify", async (req, res) => {
  const message = req.body.message || "";
  try {
    if (!message.trim()) {
      return res.status(400).json({ error: "Missing 'message' field" });
    }
    const need = await classifyHealthNeed(message);
    return res.json({ need });
  } catch (err) {
    console.error("Error in /api/classify:", err);
    return res.status(500).json({ error: "Classification failed" });
  }
});

/* ---------- MAIN HEALTH BUD CHAT ENDPOINT ---------- */

app.post("/prompt", async (req, res) => {
  const { name, age, weight, diet, goal, question, derivedStats } = req.body;

  if (!name || !age || !weight || !diet || !goal || !question || !derivedStats) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const { bmi, calories, sleep, water, energy } = derivedStats;

  const userPrompt = `
You are Bud, a retro RPG-style health companion.

Use the information below to answer the user's latest message.

=== USER PROFILE ===
Name: ${name}
Age: ${age}
Weight: ${weight}
Diet Type: ${diet}
Goal: ${goal}

=== HEALTH STATS ===
BMI: ${bmi.value} (${bmi.status})
Daily Calories Target: ${calories}
Recommended Sleep Range: ${sleep[0]} — ${sleep[1]} hours
Water Intake Goal: ${water}
Energy Level (0–1): ${energy}

=== QUESTION ===
${question}

INSTRUCTIONS:

1. If the question is clearly not about health (fitness, nutrition, sleep, stress, recovery, energy, or habits), and it is not just a greeting like "hi", "hello", or "what do you do?", then respond with exactly:
It appears what you're asking is not health related. Please provide a health-related question.

2. Otherwise:
- Start with ONE short sentence that reflects what the user is asking.
- Then give at most 5 short bullet points of advice.
- Each bullet should:
  - Reference at least one metric when useful (BMI status, energy level, calories, sleep, water, goal, etc.).
  - Briefly explain why the suggestion fits their goal.
- Keep the entire response under 180 words total.
- Avoid extreme, unsafe, or overly restrictive advice.
`.trim();

  try {
    const completion = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: userPrompt,
    });

    res.json({
      response: completion.text,
    });
  } catch (err) {
    console.error("Gemini API Error:", err);
    res.status(500).json({
      error: "Failed to get response",
      detail: err?.message ?? "Unknown Gemini error",
    });
  }
});

/* ---------- CLASSIFY + PLACES ENDPOINT ---------- */

app.post("/classifyHealthNeed", async (req, res) => {
  const { message, zip } = req.body;

  if (!message || !message.trim()) {
    return res.status(400).json({ error: "Missing 'message' field" });
  }

  const zipCode = zip || "12180";

  try {
    const need = await classifyHealthNeed(message);
    const queries = getQueriesForNeed(need);
    const primaryQuery = queries[0];

    const results = await searchPlaces(primaryQuery, zipCode);

    const places = results.slice(0, 5).map((place) => ({
      name: place.name,
      address: place.formatted_address,
      rating: place.rating,
      userRatingsTotal: place.user_ratings_total,
      placeId: place.place_id,
      types: place.types,
      mapsUrl: `https://www.google.com/maps/place/?q=place_id:${place.place_id}`,
    }));

    return res.json({ need, places, queryUsed: primaryQuery });
  } catch (err) {
    console.error("Error in /classifyHealthNeed:", err);
    return res.status(500).json({ error: "Failed to classify or fetch places" });
  }
});

/* ---------- START SERVER ---------- */

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
