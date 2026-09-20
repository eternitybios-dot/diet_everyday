import { EXERCISES } from "../data/exercises";
import { FOODS } from "../data/foods";
import type { AppData, Exercise, Food, MealLog, Place, Profile, WorkoutSet } from "../types";
import { macrosFromEnergy, suggestTargets } from "./calc";
import { dayId } from "./format";
import { validateBackup } from "./validation";

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
  weights: [],
  customExercises: [],
  customFoods: [],
  lastPlace: "gym",
});

function migrateMeal(m: MealLog): MealLog {
  const fat = m.fat ?? macrosFromEnergy(m.kcal, m.protein).fat;
  const carb = m.carb ?? macrosFromEnergy(m.kcal, m.protein).carb;
  return { ...m, fat, carb, qty: m.qty || 1 };
}

/** 生年が入っていれば年齢は毎年自動で進む。誕生日不明なので年差のみ。 */
export function ageFrom(birthYear: number | undefined, fallback: number): number {
  if (!birthYear) return fallback;
  return Math.max(10, new Date().getFullYear() - birthYear);
}

function migrate(raw: Partial<AppData>): AppData {
  const base = empty();
  const profile = { ...DEFAULT_PROFILE, ...raw.profile };
  profile.age = ageFrom(profile.birthYear, profile.age);
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
    sets: Array.isArray(raw.sets) ? raw.sets : [],
    weights: Array.isArray(raw.weights) ? raw.weights : [],
    customExercises: Array.isArray(raw.customExercises) ? raw.customExercises : [],
    meals: (Array.isArray(raw.meals) ? raw.meals : []).map(migrateMeal),
    customFoods: (Array.isArray(raw.customFoods) ? raw.customFoods : []).map((f) => ({
      ...f,
      fat: f.fat ?? macrosFromEnergy(f.kcal, f.protein).fat,
      carb: f.carb ?? macrosFromEnergy(f.kcal, f.protein).carb,
    })),
  };
}

export type LoadResult = { data: AppData; error: string | null; raw: string | null };

export function loadData(): LoadResult {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(KEY) ?? localStorage.getItem(OLD_KEY);
    if (raw == null) return { data: empty(), error: null, raw };
    const parsed: unknown = JSON.parse(raw);
    validateBackup(parsed);
    return { data: migrate(parsed as Partial<AppData>), error: null, raw };
  } catch {
    return { data: empty(), raw, error: "保存済みの記録を読み込めませんでした。元のデータを保護するため自動保存を停止しています。バックアップを確認してから設定で読み込んでください。" };
  }
}

export function saveData(data: AppData): void {
  localStorage.setItem(KEY, JSON.stringify(data));
}

export function exportJson(data: AppData): void {
  downloadJson(JSON.stringify(data, null, 2), `tremeshi-${dayId()}.json`);
}

export function downloadJson(text: string, filename: string): void {
  const blob = new Blob([text], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

/** 書き出した JSON を読み戻す。形が違えば例外。 */
export async function parseImport(file: File): Promise<AppData> {
  if (file.size > 10 * 1024 * 1024) throw new Error("10MB以下のバックアップを選んでください");
  const text = await file.text();
  const raw: unknown = JSON.parse(text);
  validateBackup(raw);
  return migrate(raw as Partial<AppData>);
}

export function recordCount(data: AppData): number {
  return data.sets.length + data.meals.length + data.weights.length;
}

/** バックアップが古い（または一度もない）のに記録が溜まっているか。 */
export function backupStale(data: AppData, now = Date.now()): boolean {
  if (recordCount(data) < 20) return false;
  const last = data.lastExportAt ?? 0;
  return now - last > 14 * 24 * 60 * 60 * 1000;
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
