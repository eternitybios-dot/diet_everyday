import { addDays, dayId, formatDay } from "../lib/format";

export function DayBar({ day, setDay }: { day: string; setDay: (d: string) => void }) {
  const today = dayId();
  const yest = addDays(today, -1);
  return (
    <div className="daybar">
      <button className={day === yest ? "on" : ""} onClick={() => setDay(yest)}>
        昨日
      </button>
      <span>{formatDay(day)}</span>
      <button className={day === today ? "on" : ""} onClick={() => setDay(today)}>
        今日
      </button>
    </div>
  );
}
