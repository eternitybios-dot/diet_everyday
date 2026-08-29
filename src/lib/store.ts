import { EXERCISES } from "../data/exercises";
import { FOODS } from "../data/foods";
import type { AppData, Exercise, Food, MealLog, Place, Profile, WorkoutSet } from "../types";
import { macrosFromEnergy, suggestTargets } from "./calc";
import { dayId } from "./format";

const KEY = "tremeshi-v2";
const OLD_KEY = "tremeshi-v1";

export const DEFAULT_PROFILE: Profile = {
  age: 38,
  sex: "male",
  heightCm: 173,
  weightKg: 72,
  startWeightKg: 72,
  activity: 1.55,
  goal: "cut",
  targetKcal: 2100,
  targetProtein: 140,
  targetFat: 72,
  targetCarb: 228,
};

const empty = (): AppData => ({
  schemaVersion: 2,
  profile: { ...DEFAULT_PROFILE },
  sets: [],
  meals: [],
  weights: [{ day: dayId(), kg: 72 }],
  customExercises: [],
  customFoods: [],
  lastPlace: "gym",
});

function migrateMeal(m: MealLog): MealLog {
  const fat = m.fat ?? macrosFromEnergy(m.kcal, m.protein).fat;
  const carb = m.carb ?? macrosFromEnergy(m.kcal, m.protein).carb;
  return { ...m, fat, carb, qty: m.qty || 1 };
}

function migrate(raw: Partial<AppData>): AppData {
  const base = empty();
  const profile = { ...DEFAULT_PROFILE, ...raw.profile };
  const suggested = suggestTargets(profile);
  return {
    ...base,
    ...raw,
    schemaVersion: 2,
    profile: {
      ...profile,
      startWeightKg: profile.startWeightKg ?? profile.weightKg ?? 72,
      goal: profile.goal ?? "cut",
      targetFat: profile.targetFat ?? suggested.targetFat,
      targetCarb: profile.targetCarb ?? suggested.targetCarb,
    },
    meals: (raw.meals ?? []).map(migrateMeal),
    customFoods: (raw.customFoods ?? []).map((f) => ({
      ...f,
      ...("fat" in f && f.fat != null ? {} : macrosFromEnergy(f.kcal, f.protein)),
    })),
  };
}

export function loadData(): AppData {
  try {
    const raw = localStorage.getItem(KEY) ?? localStorage.getItem(OLD_KEY);
    if (!raw) return empty();
    return migrate(JSON.parse(raw) as Partial<AppData>);
  } catch {
    return empty();
  }
}

export function saveData(data: AppData): void {
  localStorage.setItem(KEY, JSON.stringify(data));
}

export function exportJson(data: AppData): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `tremeshi-${dayId()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function allExercises(data: AppData): Exercise[] {
  return [...EXERCISES, ...data.customExercises];
}

export function allFoods(data: AppData): Food[] {
  return [...data.customFoods, ...FOODS];
}

export function lastSetFor(
  data: AppData,
  exerciseId: string,
): WorkoutSet | undefined {
  for (let i = data.sets.length - 1; i >= 0; i--) {
    if (data.sets[i].exerciseId === exerciseId) return data.sets[i];
  }
  return undefined;
}

export function recentExerciseIds(data: AppData, place: Place, limit = 12): string[] {
  const seen = new Set<string>();
  const ids: string[] = [];
  for (let i = data.sets.length - 1; i >= 0; i--) {
    const s = data.sets[i];
    if (s.place !== place) continue;
    if (seen.has(s.exerciseId)) continue;
    seen.add(s.exerciseId);
    ids.push(s.exerciseId);
    if (ids.length >= limit) break;
  }
  return ids;
}

export function recentFoods(data: AppData, limit = 10): Food[] {
  const catalog = allFoods(data);
  const seen = new Set<string>();
  const out: Food[] = [];
  for (let i = data.meals.length - 1; i >= 0; i--) {
    const m = data.meals[i];
    const key = m.foodId ?? m.name;
    if (seen.has(key)) continue;
    seen.add(key);
    const found = m.foodId ? catalog.find((f) => f.id === m.foodId) : undefined;
    out.push(
      found ?? {
        id: `recent-${key}`,
        name: m.name,
        serving: m.serving,
        kcal: Math.round(m.kcal / (m.qty || 1)),
        protein: Math.round(m.protein / (m.qty || 1)),
        fat: Math.round((m.fat / (m.qty || 1)) * 10) / 10,
        carb: Math.round((m.carb / (m.qty || 1)) * 10) / 10,
        cat: "home",
      },
    );
    if (out.length >= limit) break;
  }
  return out;
}

export function previousWorkoutDay(data: AppData, beforeDay: string): string | null {
  let prev: string | null = null;
  for (const s of data.sets) {
    if (s.day < beforeDay && (prev === null || s.day > prev)) prev = s.day;
  }
  return prev;
}

export function uniqueExercisesOnDay(data: AppData, day: string): WorkoutSet[] {
  const seen = new Set<string>();
  const out: WorkoutSet[] = [];
  for (const s of data.sets) {
    if (s.day !== day) continue;
    if (seen.has(s.exerciseId)) continue;
    seen.add(s.exerciseId);
    out.push(s);
  }
  return out;
}
