import { useCallback, useEffect, useRef, useState } from "react";
import { buzz } from "./format";

export type RestTimer = {
  /** 残り秒。0 なら停止中。 */
  remaining: number;
  total: number;
  start: (sec: number) => void;
  stop: () => void;
};

/**
 * 終了時刻を持つので、シートを閉じても画面を離れても進み続ける。
 * 終わったら長めに振動して知らせる。
 */
export function useRestTimer(): RestTimer {
  const [endAt, setEndAt] = useState<number | null>(null);
  const [total, setTotal] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const buzzed = useRef(false);

  useEffect(() => {
    if (endAt == null) return;
    const t = window.setInterval(() => setNow(Date.now()), 500);
    return () => window.clearInterval(t);
  }, [endAt]);

  const remaining = endAt == null ? 0 : Math.max(0, Math.ceil((endAt - now) / 1000));

  useEffect(() => {
    if (endAt == null) return;
    if (remaining > 0) {
      buzzed.current = false;
      return;
    }
    if (!buzzed.current) {
      buzzed.current = true;
      buzz([200, 100, 200, 100, 400]);
    }
    const t = window.setTimeout(() => setEndAt(null), 1500);
    return () => window.clearTimeout(t);
  }, [remaining, endAt]);

  const start = useCallback((sec: number) => {
    buzzed.current = false;
    setTotal(sec);
    setNow(Date.now());
    setEndAt(Date.now() + sec * 1000);
  }, []);

  const stop = useCallback(() => setEndAt(null), []);

  return { remaining, total, start, stop };
}
