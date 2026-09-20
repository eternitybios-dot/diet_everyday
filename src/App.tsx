import { useEffect, useState } from "react";
import { MealScreen } from "./components/MealScreen";
import { TodayScreen } from "./components/TodayScreen";
import { WorkoutScreen } from "./components/WorkoutScreen";
import { dayId, guessSlot } from "./lib/format";
import { useAppData } from "./lib/useAppData";
import { useRestTimer } from "./lib/useRestTimer";
import { downloadJson, exportJson } from "./lib/store";
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
      {store.storageError ? (
        <aside className="storage-alert" role="alert">
          <strong>記録の保存を確認してください</strong>
          <p>{store.storageError}</p>
          <div className="chips">
            <button className="chip" onClick={() => exportJson(store.data)}>画面の記録を書き出す</button>
            {store.recoveryRaw != null ? <button className="chip" onClick={() => downloadJson(store.recoveryRaw!, "tremeshi-recovery.json")}>元データを救出</button> : null}
            {store.canRetrySave ? <button className="chip" onClick={store.retrySave}>保存を再試行</button> : null}
          </div>
        </aside>
      ) : null}
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
        <div className="toast" role="status" aria-live="polite">
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

      <nav className="nav" aria-label="メインナビゲーション">
        <button aria-current={tab === "today" ? "page" : undefined} className={tab === "today" ? "on" : ""} onClick={() => setTab("today")}>
          今日
        </button>
        <button aria-current={tab === "work" ? "page" : undefined} className={tab === "work" ? "on" : ""} onClick={() => setTab("work")}>
          トレ
        </button>
        <button aria-current={tab === "meal" ? "page" : undefined} className={tab === "meal" ? "on" : ""} onClick={() => setTab("meal")}>
          飯
        </button>
      </nav>
    </div>
  );
}
