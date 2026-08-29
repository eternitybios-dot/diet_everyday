import type { MealSlot, Profile } from "../types";
import { bmr as bmrCalc, tdeeOf } from "./calc";

export function dayId(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const da = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${da}`;
}

export function addDays(id: string, n: number): string {
  const [y, m, d] = id.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + n);
  return dayId(dt);
}

export function weekIds(anchor: string): string[] {
  const [y, m, d] = anchor.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  const day = dt.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const monday = new Date(dt);
  monday.setDate(dt.getDate() + mondayOffset);
  return Array.from({ length: 7 }, (_, i) => {
    const x = new Date(monday);
    x.setDate(monday.getDate() + i);
    return dayId(x);
  });
}

const WEEK = ["日", "月", "火", "水", "木", "金", "土"];

export function formatDay(id: string): string {
  const [y, m, d] = id.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  return `${m}/${d}（${WEEK[dt.getDay()]}）`;
}

export function weekday(id: string): string {
  const [y, m, d] = id.split("-").map(Number);
  return WEEK[new Date(y, m - 1, d).getDay()];
}

export function bmr(p: Profile): number {
  return bmrCalc(p);
}

export function tdee(p: Profile): number {
  return tdeeOf(p);
}

export function bmi(p: Profile): number {
  const m = p.heightCm / 100;
  return p.weightKg / (m * m);
}

export function formatKg(n: number): string {
  if (Number.isInteger(n)) return String(n);
  return n.toFixed(n * 10 === Math.round(n * 10) ? 1 : 1);
}

export function formatNum(n: number): string {
  return Math.round(n).toLocaleString("ja-JP");
}

export function guessSlot(d = new Date()): MealSlot {
  const h = d.getHours();
  if (h >= 5 && h < 10) return "breakfast";
  if (h >= 10 && h < 15) return "lunch";
  if (h >= 15 && h < 17) return "snack";
  if (h >= 17 && h < 22) return "dinner";
  return "snack";
}

export function slotLabel(s: MealSlot): string {
  return { breakfast: "朝", lunch: "昼", dinner: "夜", snack: "間食" }[s];
}

export function buzz(ms = 12): void {
  try {
    navigator.vibrate?.(ms);
  } catch {
    /* ignore */
  }
}

export function uid(): string {
  return crypto.randomUUID();
}

export function parseKeypad(raw: string): number {
  const n = Number(raw);
  return Number.isFinite(n) ? n : 0;
}
