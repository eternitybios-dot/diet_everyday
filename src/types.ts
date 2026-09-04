export type Sex = "male" | "female";
export type Place = "gym" | "home";
export type Muscle =
  | "chest"
  | "back"
  | "shoulders"
  | "arms"
  | "legs"
  | "core"
  | "cardio"
  | "full";
export type ExKind = "strength" | "cardio" | "hold";
export type MealSlot = "breakfast" | "lunch" | "dinner" | "snack";
export type Tab = "today" | "work" | "meal";
export type Goal = "cut" | "maintain" | "bulk";

export type Profile = {
  age: number;
  birthYear?: number;
  sex: Sex;
  heightCm: number;
  weightKg: number;
  startWeightKg: number;
  activity: number;
  goal: Goal;
  targetKcal: number;
  targetProtein: number;
  targetFat: number;
  targetCarb: number;
};

export type Exercise = {
  id: string;
  name: string;
  muscle: Muscle;
  kind: ExKind;
  place: Place | "both";
  increment: number;
  defaultWeight?: number;
  defaultReps?: number;
  defaultMin?: number;
  defaultSec?: number;
  /** 有酸素 1分あたりの消費目安。未設定は 8。 */
  kcalPerMin?: number;
  /** セット間の休憩秒。未設定は種目から推定。 */
  restSec?: number;
};

export type Food = {
  id: string;
  name: string;
  serving: string;
  kcal: number;
  protein: number;
  fat: number;
  carb: number;
  cat: "protein" | "staple" | "konbini" | "out" | "drink" | "snack" | "home";
};

export type WorkoutSet = {
  id: string;
  day: string;
  at: number;
  exerciseId: string;
  name: string;
  place: Place;
  kind: ExKind;
  weightKg?: number;
  reps?: number;
  minutes?: number;
  kcal?: number;
  secs?: number;
};

export type MealLog = {
  id: string;
  day: string;
  at: number;
  slot: MealSlot;
  name: string;
  serving: string;
  kcal: number;
  protein: number;
  fat: number;
  carb: number;
  foodId?: string;
  qty: number;
};

export type WeightLog = {
  day: string;
  kg: number;
};

export type AppData = {
  schemaVersion: number;
  profile: Profile;
  sets: WorkoutSet[];
  meals: MealLog[];
  weights: WeightLog[];
  customExercises: Exercise[];
  customFoods: Food[];
  lastPlace: Place;
  lastExportAt?: number;
};

export type ToastAction = {
  label: string;
  run: () => void;
};
