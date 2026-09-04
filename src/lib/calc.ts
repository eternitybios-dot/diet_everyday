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
/** 摂取が目標の半分未満の日は「夜を記録し忘れた」可能性が高いので、累計から外す。 */
export const THIN_RATIO = 0.5;

export type BalancePoint = {
  day: string;
  deficitKcal: number;
  eaten: number;
  logged: boolean;
  /** 記録はあるが薄すぎて信用できない日 */
  thin: boolean;
  grams: number;
};

export function calorieBalanceByDay(data: AppData, days: string[]): BalancePoint[] {
  const today = dayId();
  return days.map((day) => {
    const eaten = intakeOn(data.meals, day).kcal;
    const logged = eaten > 0 || data.meals.some((m) => m.day === day);
    if (!logged) {
      return { day, deficitKcal: 0, eaten: 0, logged: false, thin: false, grams: 0 };
    }
    const kg = weightOnOrBefore(data.weights, day, data.profile.weightKg);
    const tdee = tdeeOf({ ...data.profile, weightKg: kg });
    const deficitKcal = tdee - eaten;
    // きょうはまだ食べ終わっていないので薄い判定をしない
    const thin = day !== today && eaten < data.profile.targetKcal * THIN_RATIO;
    return { day, deficitKcal, eaten, logged: true, thin, grams: kcalToGrams(deficitKcal) };
  });
}

export function cumulativeGrams(points: BalancePoint[]): number {
  return points.reduce((a, p) => a + (p.logged && !p.thin ? p.grams : 0), 0);
}

export function thinDays(points: BalancePoint[]): number {
  return points.filter((p) => p.thin).length;
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

/** 自重は回数で伸ばす。前回の最小回数 +2 を次の目標にする。 */
export function nextBodyweightReps(session: WorkoutSet[]): number | undefined {
  const reps = session.filter((s) => s.kind === "strength").map((s) => s.reps ?? 0);
  if (reps.length < 2) return undefined;
  return Math.min(...reps) + 2;
}

export function weekStats(
  sets: WorkoutSet[],
  days: string[],
): { days: number; sets: number } {
  const inWeek = sets.filter((s) => days.includes(s.day));
  return { days: new Set(inWeek.map((s) => s.day)).size, sets: inWeek.length };
}

const LONG_REST_IDS = new Set([
  "g-squat",
  "g-smith-squat",
  "g-deadlift",
  "g-rdl",
  "g-leg-press",
  "g-hip-thrust",
  "g-smith-bench",
]);

/** 種目に合う休憩秒。重い複合種目は長め、自重・体幹は短め。 */
export function defaultRestSec(ex: Exercise): number {
  if (ex.restSec) return ex.restSec;
  if (ex.kind !== "strength") return 45;
  if (LONG_REST_IDS.has(ex.id)) return 120;
  if (ex.increment === 0 || ex.muscle === "core") return 60;
  return 90;
}

export function cardioKcal(ex: Exercise, minutes: number): number {
  return Math.round(minutes * (ex.kcalPerMin ?? 8));
}

export type WeekSummary = {
  trainDays: number;
  sets: number;
  loadKg: number;
  avgKcal: number | null;
  avgProtein: number | null;
  loggedDays: number;
  avgWeight: number | null;
};

export function weekSummary(data: AppData, days: string[]): WeekSummary {
  const stats = weekStats(data.sets, days);
  const loadKg = days.reduce(
    (a, id) =>
      a + dayVolume(setsOn(data.sets, id), weightOnOrBefore(data.weights, id, data.profile.weightKg)),
    0,
  );
  const logged = days
    .map((d) => intakeOn(data.meals, d))
    .filter((x, i) => x.kcal > 0 || data.meals.some((m) => m.day === days[i]));
  const avgKcal = logged.length ? logged.reduce((a, x) => a + x.kcal, 0) / logged.length : null;
  const avgProtein = logged.length
    ? logged.reduce((a, x) => a + x.protein, 0) / logged.length
    : null;
  return {
    trainDays: stats.days,
    sets: stats.sets,
    loadKg,
    avgKcal,
    avgProtein,
    loggedDays: logged.length,
    avgWeight: avgWeight(data.weights, days),
  };
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
