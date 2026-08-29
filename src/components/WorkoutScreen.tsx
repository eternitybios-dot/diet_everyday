import { MUSCLE_LABEL, MUSCLE_ORDER, STARTER_GYM, STARTER_HOME } from "../data/exercises";
import {
  lastSession,
  sessionCleared,
  workingWeight,
  dayVolume,
  setsOn,
  weightOnOrBefore,
} from "../lib/calc";
import { buzz, formatKg, formatNum, weekday, weekIds } from "../lib/format";
import {
  allExercises,
  lastSetFor,
  previousWorkoutDay,
  recentExerciseIds,
  uniqueExercisesOnDay,
} from "../lib/store";
import type { AppData, Exercise, ExKind, Muscle, Place, WorkoutSet } from "../types";
import { ExerciseArt } from "./ExercisePic";
import { WeekBars } from "./Charts";
import { DayBar } from "./DayBar";
import { Keypad } from "./Keypad";
import { useEffect, useMemo, useState } from "react";

type Props = {
  data: AppData;
  day: string;
  setDay: (d: string) => void;
  logSet: (s: Omit<WorkoutSet, "id" | "at">) => string;
  logSets: (s: Omit<WorkoutSet, "id" | "at">[]) => string[];
  removeSet: (id: string) => void;
  removeSets: (ids: string[]) => void;
  setPlace: (p: Place) => void;
  addExercise: (ex: Exercise) => void;
  onToast: (msg: string, undo?: () => void) => void;
  resumeId: string | null;
  onResumed: () => void;
};

type Filter = "recent" | Muscle;

export function WorkoutScreen({
  data,
  day,
  setDay,
  logSet,
  logSets,
  removeSet,
  removeSets,
  setPlace,
  addExercise,
  onToast,
  resumeId,
  onResumed,
}: Props) {
  const place = data.lastPlace;
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("recent");
  const [active, setActive] = useState<Exercise | null>(null);
  const [adding, setAdding] = useState(false);
  const [queue, setQueue] = useState<string[]>([]);

  const catalog = useMemo(() => allExercises(data), [data]);
  const recents = recentExerciseIds(data, place);
  const starters = place === "gym" ? STARTER_GYM : STARTER_HOME;
  const weekBars = useMemo(
    () =>
      weekIds(day).map((id) => ({
        label: weekday(id),
        value: dayVolume(
          setsOn(data.sets, id),
          weightOnOrBefore(data.weights, id, data.profile.weightKg),
        ),
        mark: id === day,
      })),
    [data.sets, data.weights, data.profile.weightKg, day],
  );
  const weekVol = weekBars.reduce((a, b) => a + b.value, 0);

  useEffect(() => {
    if (!resumeId) return;
    const ex = catalog.find((e) => e.id === resumeId);
    if (ex) setActive(ex);
    onResumed();
  }, [resumeId, catalog, onResumed]);

  const visible = useMemo(() => {
    const inPlace = catalog.filter((e) => e.place === place || e.place === "both");
    const text = q.trim();
    let list = inPlace;
    if (text) {
      list = inPlace.filter((e) => e.name.includes(text) || MUSCLE_LABEL[e.muscle].includes(text));
    } else if (filter === "recent") {
      const ids = recents.length ? recents : starters;
      const rank = new Map(ids.map((id, i) => [id, i]));
      list = inPlace
        .filter((e) => rank.has(e.id))
        .sort((a, b) => (rank.get(a.id) ?? 99) - (rank.get(b.id) ?? 99));
    } else {
      list = inPlace.filter((e) => e.muscle === filter);
    }
    return list;
  }, [catalog, filter, place, q, recents, starters]);

  const copyYesterday = () => {
    const prev = previousWorkoutDay(data, day);
    if (!prev) {
      onToast("前回の記録がまだない");
      return;
    }
    const uniq = uniqueExercisesOnDay(data, prev);
    const ids = uniq.map((s) => s.exerciseId);
    setQueue(ids);
    onToast(`${ids.length}種目を今日の順に置いた`);
    const first = catalog.find((e) => e.id === ids[0]);
    if (first) setActive(first);
  };

  return (
    <div className="screen">
      <div className="top">
        <h1>トレ</h1>
        <button className="ghost" onClick={() => setAdding(true)}>
          ＋種目
        </button>
      </div>
      <DayBar day={day} setDay={setDay} />

      <div className="seg">
        <button className={place === "gym" ? "on" : ""} onClick={() => setPlace("gym")}>
          ジム
        </button>
        <button className={place === "home" ? "on" : ""} onClick={() => setPlace("home")}>
          家
        </button>
      </div>

      <div className="toolbar">
        <input
          className="search"
          placeholder="種目を探す"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          enterKeyHint="search"
        />
        <button className="copy-btn" onClick={copyYesterday}>
          前回コピー
        </button>
      </div>

      {queue.length ? (
        <div className="queue">
          {queue.map((id) => {
            const ex = catalog.find((e) => e.id === id);
            if (!ex) return null;
            const done = data.sets.some((s) => s.day === day && s.exerciseId === id);
            return (
              <button key={id} className={`chip ${done ? "on" : ""}`} onClick={() => setActive(ex)}>
                {done ? "✓ " : ""}
                {ex.name}
              </button>
            );
          })}
        </div>
      ) : null}

      <div className="section-h">
        <span>今週の負荷</span>
        <span>{formatNum(weekVol)} kg · 自重は体重</span>
      </div>
      <WeekBars bars={weekBars} />

      <div className="chips">
        <button className={`chip ${filter === "recent" ? "on" : ""}`} onClick={() => setFilter("recent")}>
          {recents.length ? "最近" : "定番"}
        </button>
        {MUSCLE_ORDER.map((m) => (
          <button
            key={m}
            className={`chip ${filter === m ? "on" : ""}`}
            onClick={() => setFilter(m)}
          >
            {MUSCLE_LABEL[m]}
          </button>
        ))}
      </div>

      <div className="grid2">
        {visible.map((ex) => (
          <button key={ex.id} className="tile ex" onClick={() => setActive(ex)}>
            <ExerciseArt exercise={ex} />
            <b>{ex.name}</b>
            <span className="num">{tileLabel(data, ex.id, day)}</span>
          </button>
        ))}
      </div>
      {visible.length === 0 ? <div className="empty">該当なし。検索を変えるか＋種目で追加</div> : null}

      {active ? (
        <SetSheet
          exercise={active}
          data={data}
          day={day}
          place={place}
          logSet={logSet}
          logSets={logSets}
          removeSet={removeSet}
          removeSets={removeSets}
          onToast={onToast}
          onClose={() => setActive(null)}
        />
      ) : null}

      {adding ? (
        <AddExercise
          place={place}
          onClose={() => setAdding(false)}
          onAdd={(ex) => {
            addExercise(ex);
            setAdding(false);
            setActive(ex);
          }}
        />
      ) : null}
    </div>
  );
}

function lastLabel(s: WorkoutSet): string {
  if (s.kind === "cardio") return `${s.minutes ?? 0}分 ${s.kcal ? `· ${s.kcal}kcal` : ""}`;
  if (s.kind === "hold") return `${s.secs ?? 0}秒`;
  if (!s.weightKg) return `${s.reps ?? 0}回`;
  return `${formatKg(s.weightKg)}kg × ${s.reps ?? 0}`;
}

function tileLabel(data: AppData, exerciseId: string, day: string): string {
  const today = data.sets.filter((s) => s.day === day && s.exerciseId === exerciseId);
  const prev = lastSession(data.sets, exerciseId, day);
  const src = today.length ? today : prev;
  if (!src.length) return "未記録";
  const last = src[src.length - 1];
  if (last.kind === "cardio") return lastLabel(last);
  return src.length > 1 ? `${src.length}set ${lastLabel(last)}` : lastLabel(last);
}

function sessionPrev(session: WorkoutSet[]): string {
  if (!session.length) return "";
  const labels = session.map(lastLabel);
  const same = labels.every((x) => x === labels[0]);
  if (same) return `前回 ${session.length}セット · ${labels[0]}`;
  return `前回 ${labels.join(" / ")}`;
}

function SetSheet({
  exercise,
  data,
  day,
  place,
  logSet,
  logSets,
  removeSet,
  removeSets,
  onToast,
  onClose,
}: {
  exercise: Exercise;
  data: AppData;
  day: string;
  place: Place;
  logSet: Props["logSet"];
  logSets: Props["logSets"];
  removeSet: Props["removeSet"];
  removeSets: Props["removeSets"];
  onToast: Props["onToast"];
  onClose: () => void;
}) {
  const last = lastSetFor(data, exercise.id);
  const session = lastSession(data.sets, exercise.id, day);
  const workKg = workingWeight(session);
  const [weight, setWeight] = useState(
    workKg ?? last?.weightKg ?? exercise.defaultWeight ?? 0,
  );
  const [reps, setReps] = useState(last?.reps ?? exercise.defaultReps ?? 10);
  const [minutes, setMinutes] = useState(last?.minutes ?? exercise.defaultMin ?? 15);
  const [kcal, setKcal] = useState(last?.kcal ?? Math.round((exercise.defaultMin ?? 15) * 8));
  const [secs, setSecs] = useState(last?.secs ?? exercise.defaultSec ?? 45);
  const [pad, setPad] = useState<"weight" | "reps" | "min" | "kcal" | "sec" | null>(null);
  const [flash, setFlash] = useState(false);
  const [rest, setRest] = useState(0);

  const todaySets = data.sets.filter((s) => s.day === day && s.exerciseId === exercise.id);
  const lastCount = session.length ? Math.min(5, session.length) : 3;

  useEffect(() => {
    if (rest <= 0) return;
    const t = window.setInterval(() => setRest((n) => n - 1), 1000);
    return () => window.clearInterval(t);
  }, [rest]);

  const bodyweight = exercise.kind === "strength" && exercise.increment === 0;
  const inc = bodyweight ? 0 : exercise.increment || 2.5;

  const payload = (): Omit<WorkoutSet, "id" | "at"> => {
    const kind: ExKind = exercise.kind;
    return {
      day,
      exerciseId: exercise.id,
      name: exercise.name,
      place,
      kind,
      weightKg: kind === "strength" && !bodyweight ? weight : undefined,
      reps: kind === "strength" ? reps : undefined,
      minutes: kind === "cardio" ? minutes : undefined,
      kcal: kind === "cardio" ? kcal : undefined,
      secs: kind === "hold" ? secs : undefined,
    };
  };

  const commitOne = () => {
    const id = logSet(payload());
    void id;
    buzz(16);
    setFlash(true);
    window.setTimeout(() => setFlash(false), 280);
    if (exercise.kind !== "cardio") setRest(90);
  };

  const commitCount = (n: number) => {
    const add = n - todaySets.length;
    if (add <= 0) {
      onToast(`もう${todaySets.length}セットある`);
      return;
    }
    const ids = logSets(Array.from({ length: add }, () => payload()));
    buzz(16);
    setFlash(true);
    window.setTimeout(() => setFlash(false), 280);
    if (add === 1 && exercise.kind !== "cardio") setRest(90);
    else setRest(0);
    onToast(
      `${exercise.name} ${n}セット`,
      () => removeSets(ids),
    );
  };

  return (
    <div className="backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-h">
          <div className="sheet-title">
            <ExerciseArt exercise={exercise} />
            <h2>{exercise.name}</h2>
          </div>
          <button className="x" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="prev">
          {session.length
            ? sessionPrev(session)
            : last
              ? `前回 ${lastLabel(last)}`
              : bodyweight
                ? "自重 · 回数だけ記録"
                : "初回 · 数字をタップして変更"}
        </div>
        {session.length >= 2 && !bodyweight && sessionCleared(session, exercise.defaultReps ?? 10) ? (
          <button
            className="copy-btn"
            style={{ width: "100%", height: 40, marginBottom: 10 }}
            onClick={() => setWeight((w) => roundKg(w + inc, inc))}
          >
            前回クリア · +{formatKg(inc)}kg
          </button>
        ) : null}

        {exercise.kind === "strength" ? (
          <>
            {!bodyweight ? (
              <>
                <div className="bigval">
                  <button className="val num" onClick={() => setPad("weight")}>
                    {formatKg(weight)}
                  </button>
                  <span className="u">kg</span>
                </div>
                <div className="step">
                  <button onClick={() => setWeight((w) => Math.max(0, roundKg(w - inc * 2, inc)))}>
                    −{formatKg(inc * 2)}
                  </button>
                  <button onClick={() => setWeight((w) => Math.max(0, roundKg(w - inc, inc)))}>
                    −{formatKg(inc)}
                  </button>
                  <button onClick={() => setWeight((w) => roundKg(w + inc, inc))}>+{formatKg(inc)}</button>
                  <button onClick={() => setWeight((w) => roundKg(w + inc * 2, inc))}>
                    +{formatKg(inc * 2)}
                  </button>
                </div>
              </>
            ) : null}

            <div className="rep-chips">
              {(bodyweight ? [8, 10, 12, 15, 20] : [6, 8, 10, 12, 15]).map((n) => (
                <button key={n} className={reps === n ? "on" : ""} onClick={() => setReps(n)}>
                  {n}
                </button>
              ))}
            </div>
            <div className="rep-row">
              <button onClick={() => setReps((n) => Math.max(1, n - 1))}>−</button>
              <button className="num" onClick={() => setPad("reps")}>
                {reps} 回
              </button>
              <button onClick={() => setReps((n) => n + 1)}>+</button>
            </div>
          </>
        ) : null}

        {exercise.kind === "cardio" ? (
          <>
            <div className="rep-chips">
              {[10, 15, 20, 30, 40].map((n) => (
                <button
                  key={n}
                  className={minutes === n ? "on" : ""}
                  onClick={() => {
                    setMinutes(n);
                    setKcal(n * 8);
                  }}
                >
                  {n}分
                </button>
              ))}
            </div>
            <div className="rep-row">
              <button onClick={() => setMinutes((n) => Math.max(1, n - 1))}>−</button>
              <button className="num" onClick={() => setPad("min")}>
                {minutes} 分
              </button>
              <button onClick={() => setMinutes((n) => n + 1)}>+</button>
            </div>
            <div className="bigval">
              <button className="val num" onClick={() => setPad("kcal")}>
                {kcal}
              </button>
              <span className="u">kcal</span>
            </div>
            <div className="prev">マシン表示があればタップして上書き · 未入力は目安 {minutes * 8}kcal</div>
          </>
        ) : null}

        {exercise.kind === "hold" ? (
          <>
            <div className="rep-chips">
              {[20, 30, 45, 60, 90].map((n) => (
                <button key={n} className={secs === n ? "on" : ""} onClick={() => setSecs(n)}>
                  {n}
                </button>
              ))}
            </div>
            <div className="rep-row">
              <button onClick={() => setSecs((n) => Math.max(5, n - 5))}>−5</button>
              <button className="num" onClick={() => setPad("sec")}>
                {secs} 秒
              </button>
              <button onClick={() => setSecs((n) => n + 5)}>+5</button>
            </div>
          </>
        ) : null}

        {exercise.kind !== "cardio" ? (
          <>
            <div className="section-h" style={{ marginTop: 2 }}>
              <span>何セット？</span>
              <span>きょう {todaySets.length}</span>
            </div>
            <div className={`set-chips ${flash ? "flash" : ""}`}>
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  className={
                    todaySets.length === n ? "on" : lastCount === n && !todaySets.length ? "hint" : ""
                  }
                  onClick={() => commitCount(n)}
                >
                  {n}
                </button>
              ))}
            </div>
          </>
        ) : (
          <button className={`go ${flash ? "flash" : ""}`} onClick={commitOne}>
            記録
          </button>
        )}
        {rest > 0 ? (
          <div className="rest">
            休憩 <b className="num">{Math.floor(rest / 60)}:{String(rest % 60).padStart(2, "0")}</b>
          </div>
        ) : null}

        <div className="setlist">
          {todaySets.map((s, i) => (
            <div className="setline" key={s.id}>
              <b className="num">{i + 1}</b>
              <span className="num">{lastLabel(s)}</span>
              <button className="x" style={{ marginLeft: "auto" }} onClick={() => removeSet(s.id)}>
                ×
              </button>
            </div>
          ))}
        </div>
        <button className="ghost" style={{ width: "100%", marginTop: 8 }} onClick={onClose}>
          次の種目へ
        </button>
      </div>

      {pad === "weight" ? (
        <Keypad title="重量" unit="kg" initial={weight} onDone={setWeight} onClose={() => setPad(null)} />
      ) : null}
      {pad === "reps" ? (
        <Keypad
          title="回数"
          unit="回"
          initial={reps}
          allowDecimal={false}
          onDone={(n) => setReps(Math.max(1, Math.round(n)))}
          onClose={() => setPad(null)}
        />
      ) : null}
      {pad === "min" ? (
        <Keypad
          title="時間"
          unit="分"
          initial={minutes}
          allowDecimal={false}
          onDone={(n) => setMinutes(Math.max(1, Math.round(n)))}
          onClose={() => setPad(null)}
        />
      ) : null}
      {pad === "kcal" ? (
        <Keypad
          title="消費kcal"
          unit="kcal"
          initial={kcal}
          allowDecimal={false}
          onDone={(n) => setKcal(Math.max(0, Math.round(n)))}
          onClose={() => setPad(null)}
        />
      ) : null}
      {pad === "sec" ? (
        <Keypad
          title="秒"
          unit="秒"
          initial={secs}
          allowDecimal={false}
          onDone={(n) => setSecs(Math.max(1, Math.round(n)))}
          onClose={() => setPad(null)}
        />
      ) : null}
    </div>
  );
}

function roundKg(n: number, inc: number): number {
  if (!inc) return Math.max(0, n);
  return Math.max(0, Math.round(n / inc) * inc);
}

function AddExercise({
  place,
  onClose,
  onAdd,
}: {
  place: Place;
  onClose: () => void;
  onAdd: (ex: Exercise) => void;
}) {
  const [name, setName] = useState("");
  const [muscle, setMuscle] = useState<Muscle>(place === "home" ? "full" : "chest");
  const [kind, setKind] = useState<ExKind>("strength");
  const [bodyweight, setBodyweight] = useState(place === "home");

  return (
    <div className="backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-h">
          <h2>種目を足す</h2>
          <button className="x" onClick={onClose}>
            ×
          </button>
        </div>
        <input
          placeholder="名前"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
        />
        <div className="chips" style={{ marginTop: 10 }}>
          {MUSCLE_ORDER.map((m) => (
            <button key={m} className={`chip ${muscle === m ? "on" : ""}`} onClick={() => setMuscle(m)}>
              {MUSCLE_LABEL[m]}
            </button>
          ))}
        </div>
        <div className="chips">
          {(
            [
              ["strength", "回数"],
              ["cardio", "有酸素"],
              ["hold", "秒"],
            ] as const
          ).map(([k, label]) => (
            <button key={k} className={`chip ${kind === k ? "on" : ""}`} onClick={() => setKind(k)}>
              {label}
            </button>
          ))}
        </div>
        {kind === "strength" ? (
          <div className="chips">
            <button className={`chip ${bodyweight ? "on" : ""}`} onClick={() => setBodyweight(true)}>
              自重
            </button>
            <button className={`chip ${!bodyweight ? "on" : ""}`} onClick={() => setBodyweight(false)}>
              重り
            </button>
          </div>
        ) : null}
        <button
          className="go"
          onClick={() => {
            const n = name.trim();
            if (!n) return;
            const bw = kind === "strength" && bodyweight;
            onAdd({
              id: `c-${crypto.randomUUID()}`,
              name: n,
              muscle,
              kind,
              place,
              increment: kind === "strength" ? (bw ? 0 : 2.5) : 1,
              defaultWeight: kind === "strength" && !bw ? (place === "home" ? 10 : 20) : 0,
              defaultReps: 10,
              defaultMin: 15,
              defaultSec: 45,
            });
          }}
        >
          追加して記録
        </button>
      </div>
    </div>
  );
}
