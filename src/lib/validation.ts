/** Validate backups before migration; never silently discard invalid records. */
type Row = Record<string, unknown>;
function object(value: unknown, label: string): Row {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`${label}の形式が不正です`);
  return value as Row;
}
function number(value: unknown, label: string, positive = false) {
  if (typeof value !== "number" || !Number.isFinite(value) || (positive ? value <= 0 : value < 0)) {
    throw new Error(`${label}は${positive ? "0より大きい" : "0以上の"}数値にしてください`);
  }
}
function text(value: unknown, label: string) {
  if (typeof value !== "string" || !value.trim()) throw new Error(`${label}がありません`);
}
function choice(value: unknown, values: string[], label: string) {
  if (typeof value !== "string" || !values.includes(value)) throw new Error(`${label}が不正です`);
}
export function validDay(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
}
export function validateBackup(value: unknown): void {
  const raw = object(value, "データ");
  if (raw.schemaVersion != null && raw.schemaVersion !== 1 && raw.schemaVersion !== 2) {
    throw new Error("このバージョンのバックアップには対応していません");
  }
  const profile = object(raw.profile, "プロフィール");
  for (const key of ["age", "heightCm", "weightKg", "startWeightKg", "activity", "targetKcal"]) {
    if (profile[key] != null) number(profile[key], key, true);
  }
  for (const key of ["targetProtein", "targetFat", "targetCarb"]) {
    if (profile[key] != null) number(profile[key], key);
  }
  if (profile.birthYear != null && (!Number.isInteger(profile.birthYear) || Number(profile.birthYear) < 1900 || Number(profile.birthYear) > new Date().getFullYear())) {
    throw new Error("生年が不正です");
  }
  if (profile.sex != null) choice(profile.sex, ["male", "female"], "性別");
  if (profile.goal != null) choice(profile.goal, ["cut", "maintain", "bulk"], "目標");
  if (raw.lastPlace != null) choice(raw.lastPlace, ["gym", "home"], "場所");
  if (raw.lastExportAt != null) number(raw.lastExportAt, "書き出し日時");
  if (!Array.isArray(raw.sets)) throw new Error("トレ飯の書き出しファイルではありません");
  for (const key of ["sets", "meals", "weights", "customFoods", "customExercises"]) {
    if (raw[key] == null) continue;
    if (!Array.isArray(raw[key])) throw new Error(`${key}の形式が不正です`);
    const seen = new Set<string>();
    for (const [i, value] of (raw[key] as unknown[]).entries()) {
      const label = `${key} ${i + 1}件目`, row = object(value, label);
      const id = key === "weights" ? row.day : row.id;
      text(id, `${label}のID`);
      if (seen.has(id as string)) throw new Error(`${label}のIDが重複しています`);
      seen.add(id as string);
      if (["sets", "meals", "weights"].includes(key) && !validDay(row.day)) throw new Error(`${label}の日付が不正です`);
      if (key === "weights") { number(row.kg, `${label}の体重`, true); continue; }
      text(row.name, `${label}の名前`);
      if (key === "sets" || key === "meals") number(row.at, `${label}の日時`);
      if (key === "sets") {
        text(row.exerciseId, `${label}の種目`);
        choice(row.place, ["gym", "home"], label);
        choice(row.kind, ["strength", "cardio", "hold"], label);
        const required = row.kind === "strength" ? "reps" : row.kind === "cardio" ? "minutes" : "secs";
        number(row[required], `${label}の${required}`);
        for (const k of ["weightKg", "reps", "minutes", "kcal", "secs"]) if (row[k] != null) number(row[k], label);
      }
      if (key === "meals" || key === "customFoods") {
        text(row.serving, `${label}の単位`);
        for (const k of ["kcal", "protein"]) number(row[k], `${label}の${k}`);
        for (const k of ["fat", "carb"]) if (row[k] != null) number(row[k], `${label}の${k}`);
        if (key === "meals") {
          choice(row.slot, ["breakfast", "lunch", "dinner", "snack"], label);
          if (row.qty != null) number(row.qty, `${label}の数量`, true);
          if (row.foodId != null) text(row.foodId, label);
        } else choice(row.cat, ["protein", "staple", "konbini", "out", "drink", "snack", "home"], label);
      }
      if (key === "customExercises") {
        choice(row.muscle, ["chest", "back", "shoulders", "arms", "legs", "core", "cardio", "full"], label);
        choice(row.kind, ["strength", "cardio", "hold"], label);
        choice(row.place, ["gym", "home", "both"], label);
        number(row.increment, label);
        for (const k of ["defaultWeight", "defaultReps", "defaultMin", "defaultSec", "kcalPerMin", "restSec"]) if (row[k] != null) number(row[k], label);
      }
    }
  }
}
