import type { AppData } from "../types";
import { validDay } from "./validation";

/** Backdated entries must not change the current profile weight. */
export function withWeight(data: AppData, day: string, kg: number): AppData {
  if (!validDay(day) || !Number.isFinite(kg) || kg <= 0) return data;
  const weights = [...data.weights.filter((w) => w.day !== day), { day, kg }].sort((a, b) => a.day.localeCompare(b.day));
  return { ...data, weights, profile: { ...data.profile, weightKg: weights[weights.length - 1].kg } };
}
