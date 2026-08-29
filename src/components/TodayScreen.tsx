import { useMemo, useState } from "react";
import {
  ACTIVITY_OPTS,
  avgWeight,
  calorieBalanceByDay,
  cumulativeGrams,
  GOAL_LABEL,
  gramsLabel,
  intakeOn,
  lastNDays,
  scaleLossGrams,
  setsOn,
  suggestTargets,
  tdeeOf,
  weekMuscleCover,
} from "../lib/calc";
import {
  bmi,
  bmr,
  dayId,
  formatDay,
  formatKg,
  formatNum,
  weekday,
  weekIds,
} from "../lib/format";
import { allExercises, exportJson } from "../lib/store";
import type { AppData, Goal, MealLog, Profile, Tab, WorkoutSet } from "../types";
import { DayBar } from "./DayBar";
import { ExerciseArt } from "./ExercisePic";
import { Keypad } from "./Keypad";
import { MealEdit, MealRow } from "./MealEdit";

type Props = {
  data: AppData;
  day: string;
  setDay: (d: string) => void;
  setTab: (t: Tab) => void;
  removeLastSet: (exerciseId: string, day: string) => void;
  removeMeal: (id: string) => void;
  scaleMeal: (id: string, qty: number) => void;
  updateMeal: (id: string, patch: Partial<MealLog>) => void;
  logWeight: (day: string, kg: number) => void;
  updateProfile: (p: Partial<Profile>) => void;
  onResumeExercise: (id: string) => void;
};

export function TodayScreen({
  data,
  day,
  setDay,
  setTab,
  removeLastSet,
  removeMeal,
  scaleMeal,
  updateMeal,
  logWeight,
  updateProfile,
  onResumeExercise,
}: Props) {
  const [settings, setSettings] = useState(false);
  const [weightPad, setWeightPad] = useState(false);
  const [editMeal, setEditMeal] = useState<MealLog | null>(null);
  const today = dayId();
  const week = weekIds(day);
  const p = data.profile;
  const catalog = allExercises(data);

  const sets = setsOn(data.sets, day);
  const meals = data.meals.filter((m) => m.day === day);
  const eaten = intakeOn(data.meals, day);
  const remain = p.targetKcal - eaten.kcal;
  const over = remain < 0;
  const pct = Math.min(100, (eaten.kcal / Math.max(1, p.targetKcal)) * 100);

  const grouped = useMemo(() => groupSets(sets), [sets]);
  const weight = data.weights.find((w) => w.day === day)?.kg ?? p.weightKg;

  const days14 = lastNDays(today, 14);
  const days7avg = lastNDays(today, 7);
  const balance = calorieBalanceByDay(data, days14);
  const cumGrams = cumulativeGrams(balance);
  const estChange = -cumGrams;

  const avg7 = avgWeight(data.weights, days7avg);
  const scaleG = scaleLossGrams(avg7 ?? weight, p.startWeightKg);

  const cover = weekMuscleCover(data, week, catalog);
  const tdee = Math.round(tdeeOf(p));

  return (
    <div className="screen">
      <div className="top">
        <h1>トレ飯</h1>
        <button className="ghost" onClick={() => setSettings(true)}>
          設定
        </button>
      </div>
      <DayBar day={day} setDay={setDay} />

      <div className="hero">
        <div className="remain">
          <div className="lbl">{day === today ? "食事の残り" : `${formatDay(day)} 食事の残り`}</div>
          <div className={`val num ${over ? "over" : ""}`}>
            {over ? `+${formatNum(Math.abs(remain))}` : formatNum(remain)}
          </div>
          <div className="unit">{over ? "超過 kcal" : "kcal"} · 目標 {formatNum(p.targetKcal)}</div>
          <div className="bar">
            <i className={over ? "over" : ""} style={{ width: `${Math.min(100, pct)}%` }} />
          </div>
        </div>
        <div className="macros">
          <Pfc k="P" n={eaten.protein} t={p.targetProtein} />
          <Pfc k="F" n={eaten.fat} t={p.targetFat} />
          <Pfc k="C" n={eaten.carb} t={p.targetCarb} />
        </div>
      </div>

      <div className="loss-card">
        <div className="loss-h">きょうの目安</div>
        <div className="loss-grid">
          <div>
            <div className="k">収支</div>
            <div className={`loss-g num ${estChange < 0 ? "down" : estChange > 0 ? "up" : ""}`}>
              {gramsLabel(estChange)}
            </div>
          </div>
          <div>
            <div className="k">体重計</div>
            <div className={`loss-g num ${scaleG < 0 ? "down" : scaleG > 0 ? "up" : ""}`}>
              {gramsLabel(scaleG)}
            </div>
          </div>
        </div>
      </div>

      <button className="weight-btn" onClick={() => setWeightPad(true)}>
        <span>体重</span>
        <b className="num">{formatKg(weight)} kg</b>
      </button>

      <div className="week">
        {week.map((id) => {
          const hasW = data.sets.some((s) => s.day === id);
          const hasM = data.meals.some((m) => m.day === id);
          const [, , d] = id.split("-");
          return (
            <button key={id} className={id === day ? "on" : ""} onClick={() => setDay(id)}>
              <span className="wd">{weekday(id)}</span>
              <span className="dn num">{Number(d)}</span>
              <span className="dots">
                <i className={hasW ? "w" : ""} />
                <i className={hasM ? "m" : ""} />
              </span>
            </button>
          );
        })}
      </div>
      <div className="cover">
        <span className={cover.chest ? "on" : ""}>胸</span>
        <span className={cover.back ? "on" : ""}>背</span>
        <span className={cover.legs ? "on" : ""}>脚</span>
        <em>今週1セット以上</em>
      </div>

      <div className="quick2">
        <button onClick={() => setTab("work")}>＋ トレ</button>
        <button className="meal" onClick={() => setTab("meal")}>
          ＋ 飯
        </button>
      </div>

      <div className="section-h" style={{ marginTop: 4 }}>
        <span>きょうのトレ</span>
        <span>
          {grouped.length}種目 {sets.length}セット
        </span>
      </div>
      {grouped.length === 0 ? (
        <div className="empty">まだない。ジムのマシン名をタップするだけ</div>
      ) : (
        grouped.map((g) => {
          const ex = catalog.find((e) => e.id === g.id);
          return (
          <div className="row" key={g.id}>
            <ExerciseArt id={g.id} muscle={ex?.muscle} kind={ex?.kind} />
            <button className="ttl" onClick={() => onResumeExercise(g.id)}>
              <b>{g.name}</b>
              <span className="num">{g.detail}</span>
            </button>
            <button className="x" onClick={() => removeLastSet(g.id, day)} aria-label="最後のセットを削除">
              ×
            </button>
          </div>
          );
        })
      )}

      <div className="section-h" style={{ marginTop: 16 }}>
        <span>きょうの飯</span>
        <span>{formatNum(eaten.kcal)} kcal</span>
      </div>
      {meals.length === 0 ? (
        <div className="empty">まだない。よく食べるものを1タップ</div>
      ) : (
        meals.map((m) => (
          <MealRow
            key={m.id}
            meal={m}
            onEdit={() => setEditMeal(m)}
            onRemove={() => removeMeal(m.id)}
          />
        ))
      )}

      {editMeal ? (
        <MealEdit
          meal={meals.find((m) => m.id === editMeal.id) ?? editMeal}
          onClose={() => setEditMeal(null)}
          scaleMeal={scaleMeal}
          updateMeal={updateMeal}
        />
      ) : null}

      {weightPad ? (
        <Keypad
          title="体重"
          unit="kg"
          initial={weight}
          onDone={(n) => logWeight(day, n)}
          onClose={() => setWeightPad(false)}
        />
      ) : null}

      {settings ? (
        <Settings
          profile={p}
          tdee={tdee}
          onClose={() => setSettings(false)}
          updateProfile={updateProfile}
          data={data}
        />
      ) : null}
    </div>
  );
}

function Pfc({ k, n, t }: { k: string; n: number; t: number }) {
  return (
    <div className="macro">
      <span className="k">{k}</span>
      <span className="v num">
        {Math.round(n)}
        <em>/ {t}g</em>
      </span>
    </div>
  );
}

function groupSets(sets: WorkoutSet[]) {
  const order: { id: string; name: string; ids: string[]; parts: string[] }[] = [];
  const map = new Map<string, (typeof order)[0]>();
  for (const s of sets) {
    let g = map.get(s.exerciseId);
    if (!g) {
      g = { id: s.exerciseId, name: s.name, ids: [], parts: [] };
      map.set(s.exerciseId, g);
      order.push(g);
    }
    g.ids.push(s.id);
    if (s.kind === "cardio") g.parts.push(`${s.minutes}分 ${s.kcal ?? 0}kcal`);
    else if (s.kind === "hold") g.parts.push(`${s.secs}秒`);
    else if (!s.weightKg) g.parts.push(`${s.reps}回`);
    else g.parts.push(`${s.weightKg}×${s.reps}`);
  }
  return order.map((g) => ({
    ...g,
    detail: `${g.ids.length}set  ${g.parts.join(" / ")}`,
  }));
}

function Settings({
  profile,
  tdee,
  onClose,
  updateProfile,
  data,
}: {
  profile: Profile;
  tdee: number;
  onClose: () => void;
  updateProfile: (p: Partial<Profile>) => void;
  data: AppData;
}) {
  const [pad, setPad] = useState<"kcal" | "p" | "w" | "h" | "start" | null>(null);
  const b = Math.round(bmr(profile));
  const s = suggestTargets(profile);

  return (
    <div className="backdrop" onClick={onClose}>
      <div className="sheet settings" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-h">
          <h2>プロフィール</h2>
          <button className="x" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="chips" style={{ marginBottom: 12 }}>
          {(["cut", "maintain", "bulk"] as Goal[]).map((g) => (
            <button
              key={g}
              className={`chip ${profile.goal === g ? "on" : ""}`}
              onClick={() => updateProfile({ goal: g })}
            >
              {GOAL_LABEL[g]}
            </button>
          ))}
        </div>
        <div className="chips" style={{ marginBottom: 12 }}>
          {ACTIVITY_OPTS.map((a) => (
            <button
              key={a.v}
              className={`chip ${profile.activity === a.v ? "on" : ""}`}
              onClick={() => updateProfile({ activity: a.v })}
            >
              活動{a.label}
            </button>
          ))}
        </div>
        <div className="stats">
          <div>
            <div className="k">基礎代謝</div>
            <div className="v num">{formatNum(b)}</div>
          </div>
          <div>
            <div className="k">消費目安</div>
            <div className="v num">{formatNum(tdee)}</div>
          </div>
          <div>
            <div className="k">BMI</div>
            <div className="v num">{bmi(profile).toFixed(1)}</div>
          </div>
        </div>
        <dl>
          <dt>性別 / 年齢</dt>
          <dd>
            男性 · {profile.age}歳
          </dd>
          <dt>身長</dt>
          <dd>
            <button className="ghost" onClick={() => setPad("h")}>
              {profile.heightCm} cm
            </button>
          </dd>
          <dt>体重</dt>
          <dd>
            <button className="ghost" onClick={() => setPad("w")}>
              {formatKg(profile.weightKg)} kg
            </button>
          </dd>
          <dt>開始体重</dt>
          <dd>
            <button className="ghost" onClick={() => setPad("start")}>
              {formatKg(profile.startWeightKg)} kg
            </button>
          </dd>
          <dt>目標kcal</dt>
          <dd>
            <button className="ghost" onClick={() => setPad("kcal")}>
              {formatNum(profile.targetKcal)}
            </button>
          </dd>
          <dt>目標P</dt>
          <dd>
            <button className="ghost" onClick={() => setPad("p")}>
              {profile.targetProtein} g
            </button>
          </dd>
        </dl>
        <p className="empty" style={{ paddingTop: 0 }}>
          目安 {formatNum(s.targetKcal)}kcal · F{s.targetFat}g · C{s.targetCarb}g。減量グラムは食事記録がある日の収支だけ積む。
        </p>
        <p className="empty" style={{ paddingTop: 0 }}>
          スマホでは共有ボタンから「ホーム画面に追加」すると、ジムでもアプリのように開けます。記録はこの端末のブラウザに保存されます。
        </p>
        <button className="copy-btn" style={{ width: "100%", height: 44, marginBottom: 10 }} onClick={() => exportJson(data)}>
          データを書き出す
        </button>
        <button className="go" onClick={onClose}>
          閉じる
        </button>
      </div>
      {pad === "kcal" ? (
        <Keypad
          title="目標kcal"
          unit="kcal"
          initial={profile.targetKcal}
          allowDecimal={false}
          onDone={(n) => updateProfile({ targetKcal: Math.round(n) })}
          onClose={() => setPad(null)}
        />
      ) : null}
      {pad === "p" ? (
        <Keypad
          title="目標たんぱく"
          unit="g"
          initial={profile.targetProtein}
          allowDecimal={false}
          onDone={(n) => updateProfile({ targetProtein: Math.round(n) })}
          onClose={() => setPad(null)}
        />
      ) : null}
      {pad === "w" ? (
        <Keypad
          title="体重"
          unit="kg"
          initial={profile.weightKg}
          onDone={(n) => updateProfile({ weightKg: n })}
          onClose={() => setPad(null)}
        />
      ) : null}
      {pad === "start" ? (
        <Keypad
          title="開始体重"
          unit="kg"
          initial={profile.startWeightKg}
          onDone={(n) => updateProfile({ startWeightKg: n })}
          onClose={() => setPad(null)}
        />
      ) : null}
      {pad === "h" ? (
        <Keypad
          title="身長"
          unit="cm"
          initial={profile.heightCm}
          allowDecimal={false}
          onDone={(n) => updateProfile({ heightCm: Math.round(n) })}
          onClose={() => setPad(null)}
        />
      ) : null}
    </div>
  );
}
