import { useState } from "react";
import { parseKeypad } from "../lib/format";

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "⌫"] as const;

type Props = {
  title: string;
  unit?: string;
  initial: number;
  allowDecimal?: boolean;
  min?: number;
  onDone: (n: number) => void;
  onClose: () => void;
};

export function Keypad({ title, unit, initial, allowDecimal = true, min = 0, onDone, onClose }: Props) {
  const start = allowDecimal ? String(initial) : String(Math.round(initial));
  const [raw, setRaw] = useState(start === "0" ? "" : start);
  const valid = parseKeypad(raw || "0") >= min;

  const tap = (k: string) => {
    if (k === "⌫") {
      setRaw((s) => s.slice(0, -1));
      return;
    }
    if (k === "." && (!allowDecimal || raw.includes("."))) return;
    setRaw((s) => {
      if (s === "0" && k !== ".") return k;
      if (s.length >= 7) return s;
      return s + k;
    });
  };

  return (
    <div
      className="backdrop"
      onClick={(e) => {
        e.stopPropagation();
        onClose();
      }}
    >
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-h">
          <h2>{title}</h2>
          <button className="x" onClick={onClose} aria-label="閉じる">
            ×
          </button>
        </div>
        <div className="bigval">
          <span className="val num">{raw || "0"}</span>
          {unit ? <span className="u">{unit}</span> : null}
        </div>
        <div className="pad" style={{ marginBottom: 12 }}>
          {KEYS.map((k) => (
            <button key={k} onClick={() => tap(k)} disabled={k === "." && !allowDecimal} aria-label={k === "⌫" ? "1文字削除" : undefined}>
              {k}
            </button>
          ))}
        </div>
        {!valid ? <p role="status">{min}{unit}以上で入力してください。</p> : null}
        <button
          className="go"
          disabled={!valid}
          onClick={() => {
            onDone(parseKeypad(raw || "0"));
            onClose();
          }}
        >
          決定
        </button>
      </div>
    </div>
  );
}
