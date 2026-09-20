import { useCallback, useEffect, useRef, useState } from "react";
import type { AppData, Exercise, Food, MealLog, Place, Profile, WorkoutSet } from "../types";
import { suggestTargets } from "./calc";
import { uid } from "./format";
import { ageFrom, loadData, saveData } from "./store";
import { withWeight } from "./records";

export function useAppData() {
  const [initial] = useState(loadData);
  const [data, setData] = useState<AppData>(initial.data);
  const [storageError, setStorageError] = useState(initial.error);
  const canSave = useRef(!initial.error);
  const lastSaved = useRef(initial.data);

  const persist = useCallback((next: AppData) => {
    if (!canSave.current) return;
    try {
      saveData(next);
      lastSaved.current = next;
      setStorageError(null);
    } catch {
      setStorageError("端末への保存に失敗しました。変更はこの画面にだけ残っています。閉じる前にデータを書き出してください。");
    }
  }, []);

  useEffect(() => {
    if (data !== lastSaved.current) persist(data);
  }, [data, persist]);

  const logSet = useCallback((set: Omit<WorkoutSet, "id" | "at">) => {
    const row: WorkoutSet = { ...set, id: uid(), at: Date.now() };
    setData((d) => ({
      ...d,
      lastPlace: row.place,
      sets: [...d.sets, row],
    }));
    return row.id;
  }, []);

  const logSets = useCallback((rows: Omit<WorkoutSet, "id" | "at">[]) => {
    if (!rows.length) return [] as string[];
    const stamped: WorkoutSet[] = rows.map((set, i) => ({
      ...set,
      id: uid(),
      at: Date.now() + i,
    }));
    setData((d) => ({
      ...d,
      lastPlace: stamped[stamped.length - 1].place,
      sets: [...d.sets, ...stamped],
    }));
    return stamped.map((s) => s.id);
  }, []);

  const removeSets = useCallback((ids: string[]) => {
    const drop = new Set(ids);
    setData((d) => ({ ...d, sets: d.sets.filter((s) => !drop.has(s.id)) }));
  }, []);

  const logMeal = useCallback((meal: Omit<MealLog, "id" | "at">) => {
    const row: MealLog = { ...meal, id: uid(), at: Date.now() };
    setData((d) => ({ ...d, meals: [...d.meals, row] }));
    return row.id;
  }, []);

  const removeSet = useCallback((id: string) => {
    setData((d) => ({ ...d, sets: d.sets.filter((s) => s.id !== id) }));
  }, []);

  const removeLastSet = useCallback((exerciseId: string, day: string) => {
    setData((d) => {
      const idx = [...d.sets]
        .map((s, i) => ({ s, i }))
        .reverse()
        .find((x) => x.s.exerciseId === exerciseId && x.s.day === day)?.i;
      if (idx == null) return d;
      return { ...d, sets: d.sets.filter((_, i) => i !== idx) };
    });
  }, []);

  const removeMeal = useCallback((id: string) => {
    setData((d) => ({ ...d, meals: d.meals.filter((m) => m.id !== id) }));
  }, []);

  const scaleMeal = useCallback((id: string, qty: number) => {
    setData((d) => ({
      ...d,
      meals: d.meals.map((m) => {
        if (m.id !== id) return m;
        const unit = m.qty || 1;
        const r = qty / unit;
        return {
          ...m,
          qty,
          kcal: Math.round(m.kcal * r),
          protein: Math.round(m.protein * r * 10) / 10,
          fat: Math.round(m.fat * r * 10) / 10,
          carb: Math.round(m.carb * r * 10) / 10,
        };
      }),
    }));
  }, []);

  const updateMeal = useCallback((id: string, patch: Partial<MealLog>) => {
    setData((d) => ({
      ...d,
      meals: d.meals.map((m) => (m.id === id ? { ...m, ...patch } : m)),
    }));
  }, []);

  const logWeight = useCallback((day: string, kg: number) => {
    setData((d) => withWeight(d, day, kg));
  }, []);

  const updateProfile = useCallback((p: Partial<Profile>) => {
    setData((d) => {
      const profile = { ...d.profile, ...p };
      if (p.birthYear != null) profile.age = ageFrom(p.birthYear, profile.age);
      if (
        p.goal != null ||
        p.activity != null ||
        p.weightKg != null ||
        p.birthYear != null ||
        p.sex != null ||
        p.heightCm != null
      ) {
        const s = suggestTargets(profile);
        profile.targetKcal = s.targetKcal;
        profile.targetFat = s.targetFat;
        profile.targetCarb = s.targetCarb;
        if (p.targetProtein == null) profile.targetProtein = s.targetProtein;
      }
      return { ...d, profile };
    });
  }, []);

  const addExercise = useCallback((ex: Exercise) => {
    setData((d) => ({ ...d, customExercises: [...d.customExercises, ex] }));
  }, []);

  const addFood = useCallback((food: Food) => {
    setData((d) => ({ ...d, customFoods: [food, ...d.customFoods] }));
  }, []);

  const setPlace = useCallback((place: Place) => {
    setData((d) => ({ ...d, lastPlace: place }));
  }, []);

  const removeExercise = useCallback((id: string) => {
    setData((d) => ({ ...d, customExercises: d.customExercises.filter((e) => e.id !== id) }));
  }, []);

  const removeFood = useCallback((id: string) => {
    setData((d) => ({ ...d, customFoods: d.customFoods.filter((f) => f.id !== id) }));
  }, []);

  const replaceData = useCallback((next: AppData) => {
    canSave.current = true;
    setData(next);
  }, []);

  const markExported = useCallback(() => {
    setData((d) => ({ ...d, lastExportAt: Date.now() }));
  }, []);

  return {
    data,
    storageError,
    recoveryRaw: initial.error ? initial.raw : null,
    retrySave: () => persist(data),
    canRetrySave: canSave.current,
    removeExercise,
    removeFood,
    replaceData,
    markExported,
    logSet,
    logSets,
    logMeal,
    removeSet,
    removeSets,
    removeLastSet,
    removeMeal,
    scaleMeal,
    updateMeal,
    logWeight,
    updateProfile,
    addExercise,
    addFood,
    setPlace,
  };
}
