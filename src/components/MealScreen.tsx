import { useMemo, useState } from "react";
import { FOOD_CAT_LABEL, FOODS, QUICK_KCAL } from "../data/foods";
import { intakeOn, macrosFromEnergy } from "../lib/calc";
import { buzz, slotLabel, weekday, weekIds } from "../lib/format";
import { allFoods, recentFoods } from "../lib/store";
import type { AppData, Food, MealLog, MealSlot, ToastAction } from "../types";
import { WeekBars } from "./Charts";
import { DayBar } from "./DayBar";
import { Keypad } from "./Keypad";
import { MealEdit, MealRow } from "./MealEdit";

type Props = {
  data: AppData;
  day: string;
  setDay: (d: string) => void;
  slot: MealSlot;
  setSlot: (s: MealSlot) => void;
  logMeal: (m: Omit<MealLog, "id" | "at">) => string;
  removeMeal: (id: string) => void;
  scaleMeal: (id: string, qty: number) => void;
  updateMeal: (id: string, patch: Partial<MealLog>) => void;
  addFood: (f: Food) => void;
  onToast: (msg: string, undo?: () => void, actions?: ToastAction[]) => void;
};

type Cat = "recent" | Food["cat"];

const SLOTS: MealSlot[] = ["breakfast", "lunch", "dinner", "snack"];
const CATS: Food["cat"][] = ["protein", "staple", "home", "konbini", "out", "drink", "snack"];

export function MealScreen({
  data,
  day,
  setDay,
  slot,
  setSlot,
  logMeal,
  removeMeal,
  scaleMeal,
  updateMeal,
  addFood,
  onToast,
}: Props) {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<Cat>("recent");
  const [pad, setPad] = useState(false);
  const [named, setNamed] = useState(false);
  const [quickP, setQuickP] = useState(0);
  const [editId, setEditId] = useState<string | null>(null);

  const catalog = useMemo(() => allFoods(data), [data]);
  const recents = recentFoods(data);

  const visible = useMemo(() => {
    const text = q.trim();
    if (text) {
      return catalog.filter(
        (f) => f.name.includes(text) || f.serving.includes(text) || String(f.kcal).includes(text),
      );
    }
    if (cat === "recent") {
      if (!recents.length) return FOODS.slice(0, 12);
      const seen = new Set(recents.map((f) => f.id));
      const rest = FOODS.filter((f) => !seen.has(f.id)).slice(0, 10);
      return [...recents, ...rest];
    }
    return catalog.filter((f) => f.cat === cat);
  }, [catalog, cat, q, recents]);

  const log = (
    name: string,
    serving: string,
    kcal: number,
    protein: number,
    fat?: number,
    carb?: number,
    foodId?: string,
    qty = 1,
  ) => {
    const m = fat == null || carb == null ? macrosFromEnergy(kcal, protein) : { fat, carb };
    const totalKcal = Math.round(kcal * qty);
    const id = logMeal({
      day,
      slot,
      name,
      serving,
      kcal: totalKcal,
      protein: Math.round(protein * qty * 10) / 10,
      fat: Math.round(m.fat * qty * 10) / 10,
      carb: Math.round(m.carb * qty * 10) / 10,
      foodId,
      qty,
    });
    buzz(10);
    onToast(`${slotLabel(slot)} ${name} ${totalKcal}kcal`, () => removeMeal(id), [
      { label: "直す", run: () => setEditId(id) },
    ]);
  };

  const todayMeals = data.meals.filter((m) => m.day === day).sort((a, b) => b.at - a.at);
  const editing = todayMeals.find((m) => m.id === editId) ?? null;

  return (
    <div className="screen">
      <div className="top">
        <h1>飯</h1>
        <button className="ghost" onClick={() => setNamed(true)}>
          名前つき
        </button>
      </div>
      <DayBar day={day} setDay={setDay} />

      <div className="section-h">
        <span>今週のkcal</span>
        <span>線が目標 {data.profile.targetKcal}</span>
      </div>
      <WeekBars
        color="var(--orange)"
        goal={data.profile.targetKcal}
        bars={weekIds(day).map((id) => ({
          label: weekday(id),
          value: intakeOn(data.meals, id).kcal,
          mark: id === day,
        }))}
      />

      <div className="chips">
        {SLOTS.map((s) => (
          <button key={s} className={`chip ${slot === s ? "on" : ""}`} onClick={() => setSlot(s)}>
            {slotLabel(s)}
          </button>
        ))}
      </div>

      {todayMeals.length ? (
        <div className="meal-now">
          <div className="section-h">
            <span>いまの飯</span>
            <span>{todayMeals.length}件 · タップで直す</span>
          </div>
          {todayMeals.map((m) => (
            <MealRow
              key={m.id}
              meal={m}
              onEdit={() => setEditId(m.id)}
              onRemove={() => {
                removeMeal(m.id);
                if (editId === m.id) setEditId(null);
              }}
            />
          ))}
        </div>
      ) : null}

      <div className="section-h">
        <span>カロリー直打ち</span>
        <span>{quickP ? `P${quickP}gつき` : "Pなし"}</span>
      </div>
      <div className="chips">
        {[0, 15, 30].map((n) => (
          <button key={n} className={`chip ${quickP === n ? "on" : ""}`} onClick={() => setQuickP(n)}>
            P{n}
          </button>
        ))}
      </div>
      <div className="kcal-grid">
        {QUICK_KCAL.map((n) => (
          <button key={n} className="num" onClick={() => log("その他", `${n}kcal`, n, quickP)}>
            {n}
          </button>
        ))}
      </div>
      <button
        className="copy-btn"
        style={{ width: "100%", height: 44, marginBottom: 12 }}
        onClick={() => setPad(true)}
      >
        テンキーでkcal
      </button>

      <input
        placeholder="食品を探す"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        enterKeyHint="search"
        style={{ marginBottom: 10 }}
      />

      <div className="chips">
        <button className={`chip ${cat === "recent" ? "on" : ""}`} onClick={() => setCat("recent")}>
          {recents.length ? "最近" : "よく使う"}
        </button>
        {CATS.map((c) => (
          <button key={c} className={`chip ${cat === c ? "on" : ""}`} onClick={() => setCat(c)}>
            {FOOD_CAT_LABEL[c]}
          </button>
        ))}
      </div>

      <div className="grid2">
        {visible.map((f) => (
          <button
            key={f.id}
            className="tile"
            onClick={() => log(f.name, f.serving, f.kcal, f.protein, f.fat, f.carb, f.id)}
          >
            <b>{f.name}</b>
            <span>
              {f.serving} · <span className="kcal num">{f.kcal}kcal</span>
              {f.protein ? ` P${Math.round(f.protein)}` : ""}
            </span>
          </button>
        ))}
      </div>
      {visible.length === 0 ? <div className="empty">見つからない。テンキーか名前つきで追加</div> : null}

      {pad ? (
        <Keypad
          title={`${slotLabel(slot)}のkcal`}
          unit="kcal"
          initial={300}
          allowDecimal={false}
          onDone={(n) => log("その他", `${Math.round(n)}kcal`, Math.round(n), quickP)}
          onClose={() => setPad(false)}
        />
      ) : null}

      {named ? (
        <NamedMeal
          slot={slot}
          onClose={() => setNamed(false)}
          onSave={(food) => {
            addFood(food);
            log(food.name, food.serving, food.kcal, food.protein, food.fat, food.carb, food.id);
            setNamed(false);
          }}
        />
      ) : null}

      {editing ? (
        <MealEdit
          meal={editing}
          onClose={() => setEditId(null)}
          scaleMeal={scaleMeal}
          updateMeal={updateMeal}
        />
      ) : null}
    </div>
  );
}

function NamedMeal({
  slot,
  onClose,
  onSave,
}: {
  slot: MealSlot;
  onClose: () => void;
  onSave: (f: Food) => void;
}) {
  const [name, setName] = useState("");
  const [kcal, setKcal] = useState(300);
  const [protein, setProtein] = useState(0);
  const [pad, setPad] = useState<"kcal" | "p" | null>(null);

  return (
    <div className="backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-h">
          <h2>{slotLabel(slot)} · 名前つき</h2>
          <button className="x" onClick={onClose}>
            ×
          </button>
        </div>
        <input
          placeholder="例 鶏とブロッコリー"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
        />
        <div className="kcal-grid" style={{ marginTop: 12 }}>
          {QUICK_KCAL.map((n) => (
            <button key={n} className="num" onClick={() => setKcal(n)}>
              {n}
            </button>
          ))}
        </div>
        <div className="rep-row">
          <button onClick={() => setKcal((n) => Math.max(0, n - 50))}>−50</button>
          <button className="num" onClick={() => setPad("kcal")}>
            {kcal} kcal
          </button>
          <button onClick={() => setKcal((n) => n + 50)}>+50</button>
        </div>
        <div className="rep-row">
          <button onClick={() => setProtein((n) => Math.max(0, n - 5))}>P−</button>
          <button className="num" onClick={() => setPad("p")}>
            P {protein}g
          </button>
          <button onClick={() => setProtein((n) => n + 5)}>P+</button>
        </div>
        <button
          className="go"
          onClick={() => {
            onSave({
              id: `cf-${crypto.randomUUID()}`,
              name: name.trim() || "その他",
              serving: "1",
              kcal,
              protein,
              cat: "home",
              ...macrosFromEnergy(kcal, protein),
            });
          }}
        >
          記録
        </button>
      </div>
      {pad === "kcal" ? (
        <Keypad
          title="kcal"
          unit="kcal"
          initial={kcal}
          allowDecimal={false}
          onDone={(n) => setKcal(Math.round(n))}
          onClose={() => setPad(null)}
        />
      ) : null}
      {pad === "p" ? (
        <Keypad
          title="たんぱく"
          unit="g"
          initial={protein}
          allowDecimal={false}
          onDone={(n) => setProtein(Math.round(n))}
          onClose={() => setPad(null)}
        />
      ) : null}
    </div>
  );
}
