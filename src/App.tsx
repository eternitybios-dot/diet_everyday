import { useEffect, useState } from "react";
import { MealScreen } from "./components/MealScreen";
import { TodayScreen } from "./components/TodayScreen";
import { WorkoutScreen } from "./components/WorkoutScreen";
import { dayId, guessSlot } from "./lib/format";
import { useAppData } from "./lib/useAppData";
import { useRestTimer } from "./lib/useRestTimer";
import type { MealSlot, Tab, ToastAction } from "./types";

export default function App() {
  const store = useAppData();
  const rest = useRestTimer();
  const [tab, setTab] = useState<Tab>("today");
  const [day, setDay] = useState(dayId);
  const [slot, setSlot] = useState<MealSlot>(() => guessSlot());
  const [resumeId, setResumeId] = useState<string | null>(null);
  const [toast, setToast] = useState<{
    msg: string;
    undo?: () => void;
    actions?: ToastAction[];
  } | null>(null);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 5000);
    return () => window.clearTimeout(t);
  }, [toast]);

  const onToast = (msg: string, undo?: () => void, actions?: ToastAction[]) =>
    setToast({ msg, undo, actions });

  return (
    <div className="app">
      {tab === "today" ? (
        <TodayScreen
          data={store.data}
          day={day}
          setDay={setDay}
          setTab={setTab}
          removeLastSet={store.removeLastSet}
          removeMeal={store.removeMeal}
          scaleMeal={store.scaleMeal}
          updateMeal={store.updateMeal}
          logWeight={store.logWeight}
          updateProfile={store.updateProfile}
          replaceData={store.replaceData}
          markExported={store.markExported}
          onToast={onToast}
          onResumeExercise={(id) => {
            setResumeId(id);
            setTab("work");
          }}
        />
      ) : null}
      {tab === "work" ? (
        <WorkoutScreen
          data={store.data}
          day={day}
          setDay={setDay}
          logSet={store.logSet}
          logSets={store.logSets}
          removeSet={store.removeSet}
          removeSets={store.removeSets}
          setPlace={store.setPlace}
          addExercise={store.addExercise}
          removeExercise={store.removeExercise}
          onToast={onToast}
          resumeId={resumeId}
          onResumed={() => setResumeId(null)}
          rest={rest}
        />
      ) : null}
      {tab === "meal" ? (
        <MealScreen
          data={store.data}
          day={day}
          setDay={setDay}
          slot={slot}
          setSlot={setSlot}
          logMeal={store.logMeal}
          removeMeal={store.removeMeal}
          scaleMeal={store.scaleMeal}
          updateMeal={store.updateMeal}
          addFood={store.addFood}
          removeFood={store.removeFood}
          onToast={onToast}
        />
      ) : null}

      {rest.remaining > 0 ? (
        <button className={`rest-pill ${rest.remaining <= 5 ? "soon" : ""}`} onClick={rest.stop}>
          <i style={{ width: `${(rest.remaining / Math.max(1, rest.total)) * 100}%` }} />
          <span>休憩</span>
          <b className="num">
            {Math.floor(rest.remaining / 60)}:{String(rest.remaining % 60).padStart(2, "0")}
          </b>
          <em>×</em>
        </button>
      ) : null}

      {toast ? (
        <div className="toast">
          <span>{toast.msg}</span>
          <span className="toast-acts">
            {toast.actions?.map((a) => (
              <button
                key={a.label}
                onClick={() => {
                  a.run();
                  setToast(null);
                }}
              >
                {a.label}
              </button>
            ))}
            {toast.undo ? (
              <button
                onClick={() => {
                  toast.undo?.();
                  setToast(null);
                }}
              >
                取消
              </button>
            ) : null}
          </span>
        </div>
      ) : null}

      <nav className="nav">
        <button className={tab === "today" ? "on" : ""} onClick={() => setTab("today")}>
          今日
        </button>
        <button className={tab === "work" ? "on" : ""} onClick={() => setTab("work")}>
          トレ
        </button>
        <button className={tab === "meal" ? "on" : ""} onClick={() => setTab("meal")}>
          飯
        </button>
      </nav>
    </div>
  );
}
