import "dotenv/config";
import express from "express";
import cors from "cors";
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

const app = express();
const PORT = 8000;

app.use(cors());
app.use(express.json());

app.post("/prompt", async (req, res) => {
  const {
    name,
    age,
    weight,
    diet,
    goal,
    question,
    derivedStats,
  } = req.body;

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
`;


  try {
    const completion = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: userPrompt,
    });
    console.log("userPrompt:", userPrompt);
    res.json({
      response: completion.text,
    });
  } catch (err) {
    console.error("Gemini API Error:", err?.response?.data || err);
    res.status(500).json({
      error: "Failed to get response",
      detail: err?.message ?? "Unknown Gemini error",
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
