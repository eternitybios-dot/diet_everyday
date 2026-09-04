import type { Exercise } from "../types";

export const MUSCLE_LABEL: Record<Exercise["muscle"], string> = {
  chest: "胸",
  back: "背中",
  shoulders: "肩",
  arms: "腕",
  legs: "脚",
  core: "体幹",
  cardio: "有酸素",
  full: "全身",
};

export const MUSCLE_ORDER: Exercise["muscle"][] = [
  "chest",
  "back",
  "shoulders",
  "arms",
  "legs",
  "core",
  "cardio",
  "full",
];

const gym = (
  id: string,
  name: string,
  muscle: Exercise["muscle"],
  extra: Partial<Exercise> = {},
): Exercise => ({
  id,
  name,
  muscle,
  kind: extra.kind ?? "strength",
  place: extra.place ?? "gym",
  increment: extra.increment ?? 5,
  defaultWeight: extra.defaultWeight,
  defaultReps: extra.defaultReps ?? 10,
  defaultMin: extra.defaultMin,
  defaultSec: extra.defaultSec,
  kcalPerMin: extra.kcalPerMin,
  restSec: extra.restSec,
});

/** 自重で回数が伸びたら、次に移る難しい種目。 */
export const NEXT_STEP: Record<string, string> = {
  "h-knee-push": "h-pushup",
  "h-pushup": "h-diamond",
  "h-bw-squat": "h-split-squat",
  "h-lunge": "h-split-squat",
  "h-split-squat": "h-jump-squat",
  "h-glute-bridge": "h-split-squat",
  "h-inv-row": "h-pullup",
  "h-crunch": "h-leg-raise",
  "h-band-row": "h-inv-row",
};

/** エニタイムフィットネスでよくあるマシン＋フリー。店舗差はあるが、入力は名前タップだけ。 */
export const EXERCISES: Exercise[] = [
  gym("g-chest-press", "チェストプレス", "chest", { defaultWeight: 40 }),
  gym("g-pec-fly", "ペックフライ", "chest", { defaultWeight: 25 }),
  gym("g-incline-press", "インクラインプレス", "chest", { defaultWeight: 35 }),
  gym("g-cable-cross", "ケーブルクロス", "chest", { defaultWeight: 15, increment: 2.5 }),
  gym("g-smith-bench", "スミス ベンチ", "chest", { defaultWeight: 40 }),
  gym("g-db-press", "ダンベルプレス", "chest", {
    place: "both",
    defaultWeight: 18,
    increment: 2,
  }),
  gym("g-db-fly", "ダンベルフライ", "chest", {
    place: "both",
    defaultWeight: 10,
    increment: 2,
  }),

  gym("g-lat-pulldown", "ラットプルダウン", "back", { defaultWeight: 40 }),
  gym("g-seated-row", "シーテッドロー", "back", { defaultWeight: 40 }),
  gym("g-one-arm-row", "ワンハンドロー", "back", { defaultWeight: 20, increment: 2.5 }),
  gym("g-assist-chin", "アシストチン（補助kg）", "back", { defaultWeight: 30 }),
  gym("g-straight-arm", "ストレートアームプル", "back", { defaultWeight: 20, increment: 2.5 }),
  gym("g-face-pull", "フェイスプル", "back", { defaultWeight: 12.5, increment: 2.5 }),
  gym("g-back-ext", "バックエクステンション", "back", { defaultWeight: 30 }),
  gym("g-deadlift", "デッドリフト", "back", { place: "both", defaultWeight: 60, increment: 5 }),
  gym("g-db-row", "ダンベルロー", "back", { place: "both", defaultWeight: 16, increment: 2 }),

  gym("g-shoulder-press", "ショルダープレス", "shoulders", { defaultWeight: 25 }),
  gym("g-lateral-cable", "サイドレイズ ケーブル", "shoulders", {
    defaultWeight: 7.5,
    increment: 2.5,
  }),
  gym("g-lateral-db", "サイドレイズ ダンベル", "shoulders", {
    place: "both",
    defaultWeight: 6,
    increment: 1,
  }),
  gym("g-rear-delt", "リアデルト", "shoulders", { defaultWeight: 20 }),
  gym("g-upright-row", "アップライトロー", "shoulders", { defaultWeight: 20 }),
  gym("g-shrug", "シュラッグ", "shoulders", { defaultWeight: 30, increment: 2 }),

  gym("g-arm-curl", "アームカール", "arms", { defaultWeight: 20 }),
  gym("g-pressdown", "プレスダウン", "arms", { defaultWeight: 20, increment: 2.5 }),
  gym("g-tri-ext", "トライセプスEXT", "arms", { defaultWeight: 20 }),
  gym("g-db-curl", "ダンベルカール", "arms", { place: "both", defaultWeight: 8, increment: 1 }),
  gym("g-hammer", "ハンマーカール", "arms", { place: "both", defaultWeight: 10, increment: 2 }),
  gym("g-assist-dip", "アシストディップ（補助kg）", "arms", { defaultWeight: 30 }),

  gym("g-leg-press", "レッグプレス", "legs", { defaultWeight: 80, increment: 10 }),
  gym("g-leg-ext", "レッグエクステンション", "legs", { defaultWeight: 40 }),
  gym("g-leg-curl-seat", "シーテッドレッグカール", "legs", { defaultWeight: 30 }),
  gym("g-leg-curl-lie", "ライイングレッグカール", "legs", { defaultWeight: 30 }),
  gym("g-abduction", "ヒップアブダクション", "legs", { defaultWeight: 40 }),
  gym("g-adduction", "ヒップアダクション", "legs", { defaultWeight: 40 }),
  gym("g-calf", "カーフレイズ", "legs", { defaultWeight: 40, place: "both" }),
  gym("g-hip-thrust", "ヒップスラスト", "legs", { defaultWeight: 40 }),
  gym("g-smith-squat", "スミス スクワット", "legs", { defaultWeight: 40 }),
  gym("g-squat", "スクワット", "legs", { place: "both", defaultWeight: 40, increment: 5 }),
  gym("g-lunge", "ランジ", "legs", { place: "gym", defaultWeight: 10, increment: 2 }),
  gym("h-lunge", "自重ランジ", "legs", {
    place: "home",
    defaultReps: 12,
    defaultWeight: 0,
    increment: 0,
  }),
  gym("g-rdl", "ルーマニアンDL", "legs", { place: "both", defaultWeight: 40, increment: 5 }),

  gym("g-abdominal", "アブドミナル", "core", { defaultWeight: 25 }),
  gym("g-torso-rot", "トーソローテーション", "core", { defaultWeight: 20 }),
  gym("g-cable-crunch", "ケーブルクランチ", "core", { defaultWeight: 20, increment: 2.5 }),
  gym("g-plank", "プランク", "core", {
    place: "both",
    kind: "hold",
    defaultSec: 45,
    increment: 5,
  }),

  gym("g-treadmill", "トレッドミル", "cardio", { kind: "cardio", defaultMin: 20, kcalPerMin: 9 }),
  gym("g-cross", "クロストレーナー", "cardio", { kind: "cardio", defaultMin: 20, kcalPerMin: 8 }),
  gym("g-bike", "エアロバイク", "cardio", { kind: "cardio", defaultMin: 15, kcalPerMin: 7 }),
  gym("g-recumbent", "リカンベントバイク", "cardio", {
    kind: "cardio",
    defaultMin: 15,
    kcalPerMin: 6,
  }),
  gym("g-row", "ローイング", "cardio", { kind: "cardio", defaultMin: 10, kcalPerMin: 10 }),
  gym("g-stair", "ステアクライマー", "cardio", { kind: "cardio", defaultMin: 10, kcalPerMin: 10 }),
  gym("g-wattbike", "Wattbike", "cardio", { kind: "cardio", defaultMin: 10, kcalPerMin: 10 }),

  gym("h-pushup", "腕立て伏せ", "chest", {
    place: "home",
    defaultReps: 15,
    defaultWeight: 0,
    increment: 0,
  }),
  gym("h-knee-push", "膝つき腕立て", "chest", {
    place: "home",
    defaultReps: 12,
    defaultWeight: 0,
    increment: 0,
  }),
  gym("h-diamond", "ダイヤモンド腕立て", "chest", {
    place: "home",
    defaultReps: 10,
    defaultWeight: 0,
    increment: 0,
  }),
  gym("h-pike", "パイクプッシュアップ", "shoulders", {
    place: "home",
    defaultReps: 10,
    defaultWeight: 0,
    increment: 0,
  }),
  gym("h-pullup", "懸垂", "back", {
    place: "home",
    defaultReps: 6,
    defaultWeight: 0,
    increment: 0,
  }),
  gym("h-inv-row", "インバーテッドロー", "back", {
    place: "home",
    defaultReps: 10,
    defaultWeight: 0,
    increment: 0,
  }),
  gym("h-bw-squat", "自重スクワット", "legs", {
    place: "home",
    defaultReps: 20,
    defaultWeight: 0,
    increment: 0,
  }),
  gym("h-jump-squat", "ジャンプスクワット", "legs", {
    place: "home",
    defaultReps: 12,
    defaultWeight: 0,
    increment: 0,
  }),
  gym("h-split-squat", "ブルガリアンスクワット", "legs", {
    place: "home",
    defaultReps: 10,
    defaultWeight: 0,
    increment: 0,
  }),
  gym("h-glute-bridge", "ヒップリフト", "legs", {
    place: "home",
    defaultReps: 15,
    defaultWeight: 0,
    increment: 0,
  }),
  gym("h-crunch", "クランチ", "core", {
    place: "home",
    defaultReps: 20,
    defaultWeight: 0,
    increment: 0,
  }),
  gym("h-leg-raise", "レッグレイズ", "core", {
    place: "home",
    defaultReps: 12,
    defaultWeight: 0,
    increment: 0,
  }),
  gym("h-side-plank", "サイドプランク", "core", {
    place: "home",
    kind: "hold",
    defaultSec: 30,
    increment: 5,
  }),
  gym("h-mountain", "マウンテンクライマー", "full", {
    place: "home",
    defaultReps: 20,
    defaultWeight: 0,
    increment: 0,
  }),
  gym("h-burpee", "バーピー", "full", {
    place: "home",
    defaultReps: 10,
    defaultWeight: 0,
    increment: 0,
  }),
  gym("h-jacks", "ジャンピングジャック", "cardio", {
    place: "home",
    kind: "cardio",
    defaultMin: 5,
    kcalPerMin: 8,
  }),
  gym("h-wall-sit", "ウォールシット", "legs", {
    place: "home",
    kind: "hold",
    defaultSec: 40,
    increment: 5,
  }),
  gym("h-db-shoulder", "ダンベルショルダー", "shoulders", {
    place: "home",
    defaultWeight: 8,
    increment: 1,
  }),
  gym("h-goblet", "ゴブレットスクワット", "legs", {
    place: "home",
    defaultWeight: 12,
    increment: 2,
  }),
  gym("h-band-row", "バンドロー", "back", {
    place: "home",
    defaultReps: 15,
    defaultWeight: 0,
    increment: 0,
  }),
  gym("h-band-pull", "バンドプルapart", "shoulders", {
    place: "home",
    defaultReps: 15,
    defaultWeight: 0,
    increment: 0,
  }),
];

export const STARTER_GYM = [
  "g-chest-press",
  "g-lat-pulldown",
  "g-shoulder-press",
  "g-seated-row",
  "g-leg-press",
  "g-leg-ext",
  "g-pec-fly",
  "g-abdominal",
  "g-treadmill",
  "g-bike",
];

export const STARTER_HOME = [
  "h-pushup",
  "h-bw-squat",
  "h-glute-bridge",
  "g-plank",
  "h-crunch",
  "g-db-press",
  "g-db-row",
  "h-lunge",
  "h-pullup",
  "h-mountain",
];
