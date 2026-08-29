import { useState } from "react";
import { slotLabel } from "../lib/format";
import type { MealLog, MealSlot } from "../types";
import { Keypad } from "./Keypad";

const SLOTS: MealSlot[] = ["breakfast", "lunch", "dinner", "snack"];

export function MealRow({
  meal,
  onEdit,
  onRemove,
}: {
  meal: MealLog;
  onEdit: () => void;
  onRemove: () => void;
}) {
  return (
    <div className="row">
      <button className="ttl" onClick={onEdit}>
        <b>
          {slotLabel(meal.slot)} {meal.name}
        </b>
        <span>
          {meal.serving}
          {meal.qty !== 1 ? ` ×${meal.qty}` : ""}
          {meal.protein ? ` · P${Math.round(meal.protein)}g` : ""}
        </span>
      </button>
      <span className="kcal num">{meal.kcal}</span>
      <button className="x" onClick={onRemove} aria-label="削除">
        ×
      </button>
    </div>
  );
}

export function MealEdit({
  meal,
  onClose,
  scaleMeal,
  updateMeal,
}: {
  meal: MealLog;
  onClose: () => void;
  scaleMeal: (id: string, qty: number) => void;
  updateMeal: (id: string, patch: Partial<MealLog>) => void;
}) {
  const [pad, setPad] = useState<"kcal" | "p" | null>(null);
  return (
    <div className="backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-h">
          <h2>{meal.name}</h2>
          <button className="x" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="chips">
          {SLOTS.map((s) => (
            <button
              key={s}
              className={`chip ${meal.slot === s ? "on" : ""}`}
              onClick={() => updateMeal(meal.id, { slot: s })}
            >
              {slotLabel(s)}
            </button>
          ))}
        </div>
        <div className="chips">
          {[0.5, 1, 1.5, 2].map((q) => (
            <button
              key={q}
              className={`chip ${meal.qty === q ? "on" : ""}`}
              onClick={() => scaleMeal(meal.id, q)}
            >
              ×{q}
            </button>
          ))}
        </div>
        <div className="rep-row">
          <button onClick={() => updateMeal(meal.id, { kcal: Math.max(0, meal.kcal - 50) })}>−50</button>
          <button className="num" onClick={() => setPad("kcal")}>
            {meal.kcal} kcal
          </button>
          <button onClick={() => updateMeal(meal.id, { kcal: meal.kcal + 50 })}>+50</button>
        </div>
        <div className="rep-row">
          <button
            onClick={() => updateMeal(meal.id, { protein: Math.max(0, Math.round(meal.protein - 5)) })}
          >
            P−
          </button>
          <button className="num" onClick={() => setPad("p")}>
            P {Math.round(meal.protein)}g
          </button>
          <button onClick={() => updateMeal(meal.id, { protein: Math.round(meal.protein + 5) })}>P+</button>
        </div>
        <button className="go" onClick={onClose}>
          完了
        </button>
      </div>
      {pad === "kcal" ? (
        <Keypad
          title="kcal"
          unit="kcal"
          initial={meal.kcal}
          allowDecimal={false}
          onDone={(n) => updateMeal(meal.id, { kcal: Math.round(n) })}
          onClose={() => setPad(null)}
        />
      ) : null}
      {pad === "p" ? (
        <Keypad
          title="たんぱく"
          unit="g"
          initial={meal.protein}
          allowDecimal={false}
          onDone={(n) => updateMeal(meal.id, { protein: Math.round(n) })}
          onClose={() => setPad(null)}
        />
      ) : null}
    </div>
  );
}
