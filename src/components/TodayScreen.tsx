import { useMemo, useRef, useState } from "react";
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
  thinDays,
  weekMuscleCover,
  weekSummary,
  weightOnOrBefore,
} from "../lib/calc";
import {
  addDays,
  bmi,
  bmr,
  dayId,
  daysAgoLabel,
  formatDay,
  formatKg,
  formatNum,
  weekday,
  weekIds,
} from "../lib/format";
import { allExercises, backupStale, exportJson, parseImport, recordCount } from "../lib/store";
import type { AppData, Goal, MealLog, Profile, Sex, Tab, WorkoutSet } from "../types";
import { Sparkline } from "./Charts";
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
  replaceData: (d: AppData) => void;
  markExported: () => void;
  onToast: (msg: string, undo?: () => void) => void;
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
  replaceData,
  markExported,
  onToast,
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
  const thin = thinDays(balance);

  const avg7 = avgWeight(data.weights, days7avg);
  const scaleG = scaleLossGrams(avg7 ?? weight, p.startWeightKg);

  const days30 = lastNDays(today, 30);
  const weightSeries = useMemo(
    () => days30.map((d) => weightOnOrBefore(data.weights, d, p.weightKg)),
    [days30, data.weights, p.weightKg],
  );
  const weightPoints = data.weights.filter((w) => days30.includes(w.day)).length;
  const first30 = weightSeries[0];
  const last30 = weightSeries[weightSeries.length - 1];

  const cover = weekMuscleCover(data, week, catalog);
  const tdee = Math.round(tdeeOf(p));
  const thisWeek = useMemo(() => weekSummary(data, week), [data, week]);
  const prevWeek = useMemo(() => weekSummary(data, weekIds(addDays(week[0], -7))), [data, week]);
  const isCurrentWeek = week.includes(today);
  const stale = backupStale(data);

  return (
    <div className="screen">
      <div className="top">
        <h1>トレ飯</h1>
        <button className="ghost" onClick={() => setSettings(true)}>
          設定
        </button>
      </div>
      <DayBar day={day} setDay={setDay} />

      {stale ? (
        <button className="notice" onClick={() => setSettings(true)}>
          バックアップ {daysAgoLabel(data.lastExportAt)} · 記録 {recordCount(data)}件。設定から書き出し
        </button>
      ) : null}

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
        <div className="loss-h">
          14日の目安
          {thin ? <em> · 薄い記録 {thin}日は収支から除外</em> : null}
        </div>
        <div className="loss-grid">
          <div>
            <div className="k">収支</div>
            <div className={`loss-g num ${estChange < 0 ? "down" : estChange > 0 ? "up" : ""}`}>
              {gramsLabel(estChange)}
            </div>
          </div>
          <div>
            <div className="k">体重計 · 7日平均</div>
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
      {weightPoints >= 2 ? (
        <div className="trend">
          <div className="section-h" style={{ margin: "0 2px 4px" }}>
            <span>体重 30日</span>
            <span>
              {formatKg(first30)} → {formatKg(last30)} kg
              {avg7 != null ? ` · 7日平均 ${formatKg(Math.round(avg7 * 10) / 10)}` : ""}
            </span>
          </div>
          <Sparkline values={weightSeries} height={56} zero={false} />
        </div>
      ) : null}

      <div className="week">
        <button className="wk-nav" onClick={() => setDay(addDays(week[0], -7))} aria-label="前の週">
          ‹
        </button>
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
        <button
          className="wk-nav"
          onClick={() => setDay(addDays(week[6], 1) > today ? today : addDays(week[6], 1))}
          disabled={isCurrentWeek}
          aria-label="次の週"
        >
          ›
        </button>
      </div>
      <div className="cover">
        <span className={cover.chest ? "on" : ""}>胸</span>
        <span className={cover.back ? "on" : ""}>背</span>
        <span className={cover.legs ? "on" : ""}>脚</span>
        <em>{isCurrentWeek ? "今週" : "この週"}1セット以上</em>
      </div>

      <div className="summary">
        <div className="section-h" style={{ margin: "0 0 6px" }}>
          <span>{isCurrentWeek ? "今週まとめ" : "この週のまとめ"}</span>
          <span>前週との差</span>
        </div>
        <div className="summary-grid">
          <Stat
            k="トレ"
            v={`${thisWeek.trainDays}日`}
            d={diffLabel(thisWeek.trainDays - prevWeek.trainDays, "日")}
          />
          <Stat
            k="負荷"
            v={`${formatNum(thisWeek.loadKg)}kg`}
            d={diffLabel(Math.round(thisWeek.loadKg - prevWeek.loadKg), "")}
            sub={`${thisWeek.sets}セット`}
          />
          <Stat
            k="平均kcal"
            v={thisWeek.avgKcal != null ? formatNum(thisWeek.avgKcal) : "—"}
            d={
              thisWeek.avgKcal != null && prevWeek.avgKcal != null
                ? diffLabel(Math.round(thisWeek.avgKcal - prevWeek.avgKcal), "")
                : ""
            }
            sub={thisWeek.loggedDays ? `${thisWeek.loggedDays}日分` : "記録なし"}
          />
          <Stat
            k="平均P"
            v={thisWeek.avgProtein != null ? `${Math.round(thisWeek.avgProtein)}g` : "—"}
            d={
              thisWeek.avgProtein != null && prevWeek.avgProtein != null
                ? diffLabel(Math.round(thisWeek.avgProtein - prevWeek.avgProtein), "g")
                : ""
            }
            sub={`目標 ${p.targetProtein}g`}
          />
          <Stat
            k="体重 週平均"
            v={thisWeek.avgWeight != null ? `${formatKg(Math.round(thisWeek.avgWeight * 10) / 10)}kg` : "—"}
            d={
              thisWeek.avgWeight != null && prevWeek.avgWeight != null
                ? diffLabel(Math.round((thisWeek.avgWeight - prevWeek.avgWeight) * 10) / 10, "kg", true)
                : ""
            }
            wide
          />
        </div>
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
            <button
              className="x minus"
              onClick={() => removeLastSet(g.id, day)}
              aria-label="最後のセットを削除"
              title="最後の1セットを消す"
            >
              −1
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
          replaceData={replaceData}
          markExported={markExported}
          onToast={onToast}
        />
      ) : null}
    </div>
  );
}

function diffLabel(d: number, unit: string, decimal = false): string {
  if (!d) return "±0";
  const n = decimal ? Math.abs(d).toFixed(1) : formatNum(Math.abs(d));
  return `${d > 0 ? "+" : "−"}${n}${unit}`;
}

function Stat({
  k,
  v,
  d,
  sub,
  wide,
}: {
  k: string;
  v: string;
  d: string;
  sub?: string;
  wide?: boolean;
}) {
  const tone = d.startsWith("+") ? "up" : d.startsWith("−") ? "down" : "";
  return (
    <div className={`stat ${wide ? "wide" : ""}`}>
      <div className="k">{k}</div>
      <div className="v num">{v}</div>
      <div className="d">
        <span className={`num ${tone}`}>{d}</span>
        {sub ? <em>{sub}</em> : null}
      </div>
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
  replaceData,
  markExported,
  onToast,
}: {
  profile: Profile;
  tdee: number;
  onClose: () => void;
  updateProfile: (p: Partial<Profile>) => void;
  data: AppData;
  replaceData: (d: AppData) => void;
  markExported: () => void;
  onToast: (msg: string, undo?: () => void) => void;
}) {
  const [pad, setPad] = useState<"kcal" | "p" | "w" | "h" | "start" | "birth" | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const b = Math.round(bmr(profile));
  const s = suggestTargets(profile);
  const pLow = Math.round(profile.weightKg * 1.6);
  const pHigh = Math.round(profile.weightKg * 2.2);

  const onImport = async (file: File | undefined) => {
    if (!file) return;
    try {
      const next = await parseImport(file);
      const before = data;
      replaceData(next);
      onToast(`${recordCount(next)}件を読み込んだ`, () => replaceData(before));
      onClose();
    } catch (e) {
      onToast(e instanceof Error ? e.message : "読み込めなかった");
    }
  };

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
          <span className="chip-gap" />
          {(["male", "female"] as Sex[]).map((sx) => (
            <button
              key={sx}
              className={`chip ${profile.sex === sx ? "on" : ""}`}
              onClick={() => updateProfile({ sex: sx })}
            >
              {sx === "male" ? "男性" : "女性"}
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
          <dt>年齢</dt>
          <dd>
            <button className="ghost" onClick={() => setPad("birth")}>
              {profile.age}歳{profile.birthYear ? ` · ${profile.birthYear}年生` : " · 生年を入れると自動"}
            </button>
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
          目安 {formatNum(s.targetKcal)}kcal · F{s.targetFat}g · C{s.targetCarb}g。P は体重×1.6〜2.2 = {pLow}〜{pHigh}g
          が現実的な範囲。収支は食事記録がある日だけ積み、目標の半分未満の日は記録漏れとして除外。
        </p>

        <div className="section-h" style={{ marginTop: 6 }}>
          <span>バックアップ</span>
          <span>最後の書き出し {daysAgoLabel(data.lastExportAt)}</span>
        </div>
        <p className="empty" style={{ paddingTop: 0 }}>
          記録はこの端末のブラウザにだけ保存されます。機種変更や履歴削除で消えるので、月に1回は書き出しを。
          ファイルは「ファイル」アプリや iCloud Drive に置くと安心です。
        </p>
        <div className="step2" style={{ marginBottom: 10 }}>
          <button
            className="copy-btn"
            onClick={() => {
              exportJson(data);
              markExported();
              onToast("書き出した · ファイルに保存して");
            }}
          >
            データを書き出す
          </button>
          <button className="copy-btn" onClick={() => fileRef.current?.click()}>
            データを読み込む
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={(e) => {
              void onImport(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
        </div>
        <p className="empty" style={{ paddingTop: 0 }}>
          読み込むと今の記録は置き換わります（直後の「取消」で戻せる）。ホーム画面に追加していない
          Safari は、しばらく開かないとデータを消すことがあります。
        </p>
        <button className="go" onClick={onClose}>
          閉じる
        </button>
      </div>
      {pad === "birth" ? (
        <Keypad
          title="生まれた年（西暦）"
          unit="年"
          initial={profile.birthYear ?? new Date().getFullYear() - profile.age}
          allowDecimal={false}
          onDone={(n) => {
            const y = Math.round(n);
            if (y >= 1900 && y <= new Date().getFullYear() - 10) updateProfile({ birthYear: y });
          }}
          onClose={() => setPad(null)}
        />
      ) : null}
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
