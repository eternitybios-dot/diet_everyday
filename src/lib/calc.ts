import type { AppData, Exercise, Goal, MealLog, Profile, WeightLog, WorkoutSet } from "../types";

function dayId(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const da = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${da}`;
}

function addDays(id: string, n: number): string {
  const [y, m, d] = id.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + n);
  return dayId(dt);
}

/** 体脂肪1kg ≒ 7,700kcal。目安計算専用。 */
export const KCAL_PER_KG_FAT = 7700;

export function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

export function macrosFromEnergy(kcal: number, protein: number): { fat: number; carb: number } {
  const rest = Math.max(0, kcal - protein * 4);
  if (protein * 4 > kcal * 0.4) {
    return { fat: round1(rest / 9), carb: 0 };
  }
  const fat = round1((rest * 0.1) / 9);
  const carb = round1(Math.max(0, rest - fat * 9) / 4);
  return { fat, carb };
}

export function bmr(p: Pick<Profile, "age" | "sex" | "heightCm" | "weightKg">): number {
  const s = p.sex === "male" ? 5 : -161;
  return 10 * p.weightKg + 6.25 * p.heightCm - 5 * p.age + s;
}

export function tdeeOf(p: Pick<Profile, "age" | "sex" | "heightCm" | "weightKg" | "activity">): number {
  return bmr(p) * p.activity;
}

export function suggestTargets(
  p: Pick<Profile, "age" | "sex" | "heightCm" | "weightKg" | "activity" | "goal" | "targetProtein">,
): { targetKcal: number; targetProtein: number; targetFat: number; targetCarb: number } {
  const t = tdeeOf(p);
  const basal = bmr(p);
  let targetKcal = Math.round(t);
  if (p.goal === "cut") targetKcal = Math.round(Math.max(basal + 200, t - 400));
  if (p.goal === "bulk") targetKcal = Math.round(t + 250);
  const targetProtein = p.targetProtein || Math.round(p.weightKg * 2);
  const targetFat = Math.round(p.weightKg * 1);
  const carbKcal = targetKcal - targetProtein * 4 - targetFat * 9;
  const targetCarb = Math.max(0, Math.round(carbKcal / 4));
  return { targetKcal, targetProtein, targetFat, targetCarb };
}

export function kcalToGrams(kcal: number): number {
  return Math.round(kcal / (KCAL_PER_KG_FAT / 1000));
}

export function gramsLabel(g: number): string {
  const sign = g > 0 ? "+" : g < 0 ? "−" : "";
  return `${sign}${Math.abs(g).toLocaleString("ja-JP")} g`;
}

export function lastNDays(end: string, n: number): string[] {
  return Array.from({ length: n }, (_, i) => addDays(end, -(n - 1 - i)));
}

export function mealsOn(meals: MealLog[], day: string): MealLog[] {
  return meals.filter((m) => m.day === day);
}

export function intakeOn(meals: MealLog[], day: string): {
  kcal: number;
  protein: number;
  fat: number;
  carb: number;
} {
  return mealsOn(meals, day).reduce(
    (a, m) => ({
      kcal: a.kcal + m.kcal,
      protein: a.protein + m.protein,
      fat: a.fat + m.fat,
      carb: a.carb + m.carb,
    }),
    { kcal: 0, protein: 0, fat: 0, carb: 0 },
  );
}

export function weightOnOrBefore(weights: WeightLog[], day: string, fallback: number): number {
  let best: WeightLog | undefined;
  for (const w of weights) {
    if (w.day <= day && (!best || w.day > best.day)) best = w;
  }
  return best?.kg ?? fallback;
}

export function avgWeight(weights: WeightLog[], days: string[]): number | null {
  const vals = days
    .map((d) => weights.find((w) => w.day === d)?.kg)
    .filter((n): n is number => n != null);
  if (!vals.length) return null;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

export function scaleLossGrams(avgKg: number, startKg: number): number {
  return Math.round((avgKg - startKg) * 1000);
}

/**
 * 記録のある日だけ TDEE − 摂取 を積む。未記録日は0食扱いしない（過大な減量になる）。
 * 有酸素kcalはTDEEに含めない（活動係数と二重計上になるため）。
 */
export function calorieBalanceByDay(
  data: AppData,
  days: string[],
): { day: string; deficitKcal: number; eaten: number; logged: boolean; grams: number }[] {
  return days.map((day) => {
    const eaten = intakeOn(data.meals, day).kcal;
    const logged = eaten > 0 || data.meals.some((m) => m.day === day);
    if (!logged) {
      return { day, deficitKcal: 0, eaten: 0, logged: false, grams: 0 };
    }
    const kg = weightOnOrBefore(data.weights, day, data.profile.weightKg);
    const tdee = tdeeOf({ ...data.profile, weightKg: kg });
    const deficitKcal = tdee - eaten;
    return { day, deficitKcal, eaten, logged: true, grams: kcalToGrams(deficitKcal) };
  });
}

export function cumulativeGrams(points: { grams: number; logged: boolean }[]): number {
  return points.reduce((a, p) => a + (p.logged ? p.grams : 0), 0);
}

export function setsOn(sets: WorkoutSet[], day: string): WorkoutSet[] {
  return sets.filter((s) => s.day === day);
}

/** 自重種目は重量が空なので、その日の体重 × 回数で負荷を積む。 */
export function setLoadKg(set: WorkoutSet, bodyKg: number): number {
  if (set.kind !== "strength") return 0;
  if (set.weightKg && set.weightKg > 0) return set.weightKg;
  return (set.reps ?? 0) > 0 ? bodyKg : 0;
}

export function dayVolume(sets: WorkoutSet[], bodyKg = 0): number {
  return sets.reduce((a, s) => a + setLoadKg(s, bodyKg) * (s.reps || 0), 0);
}

export function lastSession(sets: WorkoutSet[], exerciseId: string, beforeDay: string): WorkoutSet[] {
  let day: string | null = null;
  for (const s of sets) {
    if (s.exerciseId !== exerciseId || s.day >= beforeDay) continue;
    if (!day || s.day > day) day = s.day;
  }
  if (!day) return [];
  return sets.filter((s) => s.exerciseId === exerciseId && s.day === day);
}

export function workingWeight(session: WorkoutSet[]): number | undefined {
  const weights = session.map((s) => s.weightKg).filter((n): n is number => n != null && n > 0);
  if (!weights.length) return undefined;
  return Math.max(...weights);
}

export function sessionCleared(session: WorkoutSet[], targetReps: number): boolean {
  const work = session.filter((s) => s.kind === "strength");
  if (work.length < 2) return false;
  return work.every((s) => (s.reps ?? 0) >= targetReps);
}

export function weekMuscleCover(
  data: AppData,
  days: string[],
  catalog: Exercise[],
): { chest: boolean; back: boolean; legs: boolean } {
  const ids = new Set(
    data.sets.filter((s) => days.includes(s.day)).map((s) => s.exerciseId),
  );
  const muscles = new Set(
    catalog.filter((e) => ids.has(e.id)).map((e) => e.muscle),
  );
  return {
    chest: muscles.has("chest"),
    back: muscles.has("back"),
    legs: muscles.has("legs"),
  };
}

export const GOAL_LABEL: Record<Goal, string> = {
  cut: "減量",
  maintain: "維持",
  bulk: "増量",
};

export const ACTIVITY_OPTS = [
  { v: 1.2, label: "低" },
  { v: 1.375, label: "軽" },
  { v: 1.55, label: "中" },
  { v: 1.725, label: "高" },
] as const;

export function firstLoggedDay(data: AppData): string {
  const days = [
    ...data.meals.map((m) => m.day),
    ...data.sets.map((s) => s.day),
    ...data.weights.map((w) => w.day),
  ].sort();
  return days[0] ?? dayId();
}
