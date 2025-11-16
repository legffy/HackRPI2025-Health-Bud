"use client";
import React, { useState, useEffect, useMemo} from "react";


type HealthStatus = "green" | "yellow" | "red";

type StatsSnapshot = {
  user: UserStats;
  derived: DerivedStats;
};
type StatsPanelProps = {
  onStatusChange?: (status: HealthStatus) => void;
  onStatsChange?: (snapshot: StatsSnapshot) => void;
};

type UserStats = {
  name: string;
  age: number;
  weight: number; // lbs
  height: number; // inches
  diet: string;
  goal: string;
};

type UserStatsSelect = {
  name: boolean;
  age: boolean;
  weight: boolean;
  height: boolean;
  diet: boolean;
  goal: boolean;
};

type BMIInfo = {
  value: number;
  status: string; // "Underweight" | "Normal" | "Overweight" | ...
};

type DerivedStats = {
  bmi: BMIInfo;
  calories: number;
  sleep: [number, number];
  water: number;
  energy: number; // 0–1
};



function calculateBMI(weight: number, height: number): BMIInfo {
  if (height <= 0) {
    return { value: 0, status: "Unknown" };
  }

  const raw: number = (weight * 703) / (height * height);
  const value: number = Number(raw.toFixed(1));

  let status = "";
  if (value < 18.5) status = "Underweight";
  else if (value < 25) status = "Normal";
  else if (value < 30) status = "Overweight";
  else status = "Obese";

  return { status, value };
}

function calculateCalories(user: UserStats): number {
  let calories: number = user.weight * 13;
  const goalLower: string = user.goal.toLowerCase();

  if (goalLower.includes("bulk") || goalLower.includes("gain")) {
    calories += 300;
  } else if (goalLower.includes("cut") || goalLower.includes("lose")) {
    calories -= 300;
  }

  const dietLower: string = user.diet.toLowerCase();
  if (dietLower === "good") calories += 100;
  if (dietLower === "bad") calories -= 100;

  if (calories < 1400) calories = 1400;
  if (calories > 3500) calories = 3500;

  return Math.round(calories);
}

function calculateSleep(age: number): [number, number] {
  if (age <= 18) return [8, 10];
  if (age <= 25) return [7, 9];
  if (age <= 64) return [7, 9];
  return [7, 8];
}

function calculateWater(weightLbs: number): number {
  const ounces: number = weightLbs * 0.5;
  const liters: number = ounces * 0.0295735;
  return Number(liters.toFixed(1));
}

function calculateEnergy(user: UserStats): number {
  let energy: number = 0.5;

  const dietLower: string = user.diet.toLowerCase();
  if (dietLower === "good") energy += 0.3;
  if (dietLower === "ok") energy += 0.1;
  if (dietLower === "bad") energy -= 0.2;

  if (energy < 0) energy = 0;
  if (energy > 1) energy = 1;

  return Number(energy.toFixed(2));
}

function computeDerivedStats(user: UserStats): DerivedStats {
  const bmi: BMIInfo = calculateBMI(user.weight, user.height);
  const calories: number = calculateCalories(user);
  const sleep: [number, number] = calculateSleep(user.age);
  const water: number = calculateWater(user.weight);
  const energy: number = calculateEnergy(user);

  const derived: DerivedStats = {
    bmi,
    calories,
    sleep,
    water,
    energy,
  };


  return derived;
}
function computeHealthStatus(
  user: UserStats,
  derived: DerivedStats
): HealthStatus {
  let score: number = 0;

  // BMI contribution
  if (derived.bmi.status.toLowerCase() === "normal") score += 1;
  else if (
    derived.bmi.status.toLowerCase() === "overweight" ||
    derived.bmi.status.toLowerCase() === "underweight"
  )
    score += 0;
  else score -= 1; // obese

  // Diet contribution
  const diet: string = user.diet.toLowerCase();
  if (diet === "good") score += 1;
  else if (diet === "ok") score += 0;
  else if (diet === "bad") score -= 1;

  // Energy contribution
  if (derived.energy >= 0.7) score += 1;
  else if (derived.energy <= 0.4) score -= 1

  // Map score → status
  if (score >= 2) return "green";
  if (score <= -1) return "red";
  return "yellow";
}

export default function StatsPanel({ onStatusChange, onStatsChange }: StatsPanelProps) {
  const [userstats, changeStats] = useState<UserStats>({
    name: "",
    age: 20,
    weight: 150,
    height: 70,
    diet: "",
    goal: "",
  });

  const [userstatsSelect, changeUserSelect] = useState<UserStatsSelect>({
    name: false,
    age: false,
    weight: false,
    height: false,
    diet: false,
    goal: false,
  });
const derivedstats: DerivedStats = useMemo(
  (): DerivedStats => computeDerivedStats(userstats),
  [userstats]
);

const status: HealthStatus = useMemo(
  (): HealthStatus => computeHealthStatus(userstats, derivedstats),
  [userstats, derivedstats]
);

useEffect((): void => {
  if (onStatusChange) {
    onStatusChange(status);
  }
  if (onStatsChange) {
    onStatsChange({
      user: userstats,
      derived: derivedstats,
    });
  }
}, [status, userstats, derivedstats, onStatusChange, onStatsChange]);

  const clickedForm = (event: React.MouseEvent<HTMLButtonElement>): void => {
    const field = event.currentTarget.name as keyof UserStatsSelect;
    changeUserSelect(
      (prev: UserStatsSelect): UserStatsSelect => ({
        ...prev,
        [field]: true,
      })
    );
  };

  const handleTextChange = (field: keyof UserStats, value: string): void => {
    changeStats(
      (prev: UserStats): UserStats => ({
        ...prev,
        [field]: value,
      })
    );
  };

  const handleNumberChange = (field: keyof UserStats, value: string): void => {
    const num: number = Number(value);
    changeStats(
      (prev: UserStats): UserStats => ({
        ...prev,
        [field]: Number.isNaN(num) ? prev[field] : num,
      })
    );
  };

  const handleDietChange = (
    event: React.ChangeEvent<HTMLSelectElement>
  ): void => {
    const value: string = event.currentTarget.value;
    changeStats(
      (prev: UserStats): UserStats => ({
        ...prev,
        diet: value,
      })
    );
    changeUserSelect(
      (prev: UserStatsSelect): UserStatsSelect => ({
        ...prev,
        diet: false,
      })
    );
  };

  const closeField = (field: keyof UserStatsSelect): void => {
    changeUserSelect(
      (prev: UserStatsSelect): UserStatsSelect => ({
        ...prev,
        [field]: false,
      })
    );
  };

  const totalBars: number = 6;
  const filledBars: number = Math.round(derivedstats.energy * totalBars);
  const energyBar: string = Array.from({ length: totalBars })
    .map((_, i): string => (i < filledBars ? "█" : "░"))
    .join("");

  return (
    <div className="flex items-center justify-center border-4 h-fit border-white w-full">
      {/* Left: User stats editable panel */}
      <div className="w-full max-w-sm bg-black p-4 h-full text-2xl space-y-2">
        {/* NAME */}
        {userstatsSelect.name ? (
          <div className="flex items-center justify-between">
            <label className="mr-2">Name:</label>
            <input
              value={userstats.name}
              type="text"
              name="name"
              className="bg-black  text-white px-2 w-40"
              onChange={(e): void => handleTextChange("name", e.target.value)}
              onBlur={(): void => closeField("name")}
            />
          </div>
        ) : (
          <button
            name="name"
            onClick={clickedForm}
            className="flex items-center justify-between w-full text-left"
          >
            <span>Name:</span>
            <span>{userstats.name || "—"}</span>
          </button>
        )}

        {/* AGE */}
        {userstatsSelect.age ? (
          <div className="flex items-center justify-between">
            <label className="mr-2">Age:</label>
            <input
              value={userstats.age}
              type="number"
              name="age"
              className="bg-black border border-white text-white px-2 w-20"
              onChange={(e): void => handleNumberChange("age", e.target.value)}
              onBlur={(): void => closeField("age")}
            />
            <img
              src="/Pixel Art/hourglass sand timer.gif"
              className="h-10 w-10"
              alt=""
            />
          </div>
        ) : (
          <button
            name="age"
            onClick={clickedForm}
            className="flex items-center justify-between w-full text-left"
          >
            <span>Age:</span>
            <span>{userstats.age}</span>
            <img
              src="/Pixel Art/hourglass sand timer.gif"
              className="h-10 w-10"
              alt=""
            />
          </button>
        )}

        {/* WEIGHT */}
        {userstatsSelect.weight ? (
          <div className="flex items-center justify-between">
            <label className="mr-2">Weight (lbs):</label>
            <input
              value={userstats.weight}
              type="number"
              name="weight"
              className="bg-black border border-white text-white px-2 w-24"
              onChange={(e): void =>
                handleNumberChange("weight", e.target.value)
              }
              onBlur={(): void => closeField("weight")}
            />
            <img
              src="/Pixel Art/Dumbbell-1.png.png"
              className="h-10 w-10"
              alt=""
            />
          </div>
        ) : (
          <button
            name="weight"
            onClick={clickedForm}
            className="flex items-center justify-between w-full text-left"
          >
            <span>Weight (lbs):</span>
            <span>{userstats.weight}</span>
            <img
              src="/Pixel Art/Dumbbell-1.png.png"
              className="h-10 w-10"
              alt=""
            />
          </button>
        )}

        {/* HEIGHT */}
        {userstatsSelect.height ? (
          <div className="flex items-center justify-between">
            <label className="mr-2">Height (in):</label>
            <input
              value={userstats.height}
              type="number"
              name="height"
              className="bg-black border border-white text-white px-2 w-24"
              onChange={(e): void =>
                handleNumberChange("height", e.target.value)
              }
              onBlur={(): void => closeField("height")}
            />
          </div>
        ) : (
          <button
            name="height"
            onClick={clickedForm}
            className="flex items-center justify-between w-full text-left"
          >
            <span>Height (in):</span>
            <span>{userstats.height}</span>
          </button>
        )}

        {/* DIET */}
        {userstatsSelect.diet ? (
          <div className="flex items-center justify-between">
            <label className="mr-2">Diet:</label>
            <select
              name="diet"
              className="bg-black border border-white text-white px-2 w-24"
              value={userstats.diet || ""}
              onChange={handleDietChange}
            >
              <option value="" disabled>
                Select…
              </option>
              <option value="good">Good</option>
              <option value="ok">Ok</option>
              <option value="bad">Bad</option>
            </select>
            <img
              src="/Pixel Art/Pizza-1.png.png"
              className="h-10 w-10"
              alt=""
            />
          </div>
        ) : (
          <button
            name="diet"
            onClick={clickedForm}
            className="flex items-center justify-between w-full text-left"
          >
            <span>Diet:</span>
            <span>{userstats.diet || "—"}</span>
            <img
              src="/Pixel Art/Pizza-1.png.png"
              className="h-10 w-10"
              alt=""
            />
          </button>
        )}

        {/* GOAL */}
        {userstatsSelect.goal ? (
          <div className="flex items-center justify-between">
            <label className="mr-2">Goal:</label>
            <input
              value={userstats.goal}
              type="text"
              name="goal"
              className="bg-black border border-white text-white px-2 w-30"
              onChange={(e): void => handleTextChange("goal", e.target.value)}
              onBlur={(): void => closeField("goal")}
            />
            <img
              src="/Pixel Art/Lightbulb (Goal)-1.png.png"
              className="h-10 w-10"
              alt=""
            />
          </div>
        ) : (
          <button
            name="goal"
            onClick={clickedForm}
            className="flex items-center justify-between w-full text-left"
          >
            <span>Goal:</span>
            <span>{userstats.goal || "—"}</span>
            <img
              src="/Pixel Art/Lightbulb (Goal)-1.png.png"
              className="h-10 w-10"
              alt=""
            />
          </button>
        )}
      </div>

      {/* Right: derived health summary panel */}
      <div className="w-full max-w-sm border-x-2 h-full border-white bg-black p-4 text-xl space-y-2">
        <div>
          <div className="flex">
            BMI: {derivedstats.bmi.value} ({derivedstats.bmi.status}){" "}
            <img
              src="/Pixel Art/BMI Scale-1.png.png"
              className="w-10 h-10"
              alt=""
            />{" "}
          </div>
        </div>
        <div className="flex">
          <span>Daily Calories: {derivedstats.calories} kcal </span>
          <img
            src="/Pixel Art/Fire (Calorie)-1.png.png"
            className="h-10 w-10"
          />
        </div>
        <div className="flex">
          <span>
            Sleep Target: {derivedstats.sleep[0]}–{derivedstats.sleep[1]} hrs{" "}
          </span>
          <img src="/Pixel Art/Sleep-1.png.png" className="h-10 w-10" />
        </div>
        <div className="flex">
          <span>Water Goal: {derivedstats.water} L </span>
          <img src="/Pixel Art/Water-1.png.png" className="h-10 w-10" />
        </div>
        <div className="mt-2 flex">
          Energy:
          <span className="ml-2">{energyBar} </span>
          <img src="/Pixel Art/Energy-1.png.png" className="h-10 w-10" alt="" />
        </div>
      </div>
    </div>
  );
}
