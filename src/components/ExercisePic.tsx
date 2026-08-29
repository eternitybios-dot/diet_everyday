import type { ExKind, Exercise, Muscle } from "../types";

const FALLBACK: Record<string, string> = {
  chest: "fb-chest",
  back: "fb-back",
  shoulders: "fb-shoulders",
  arms: "fb-arms",
  legs: "fb-legs",
  core: "fb-core",
  cardio: "fb-cardio",
  full: "fb-full",
};

type PicProps = {
  exercise?: Pick<Exercise, "id" | "muscle" | "kind">;
  id?: string;
  muscle?: Muscle;
  kind?: ExKind;
};

export function ExerciseArt(props: PicProps) {
  return (
    <div className="ex-art" aria-hidden>
      <ExercisePic {...props} />
    </div>
  );
}

export function ExercisePic({ exercise, id, muscle, kind }: PicProps) {
  const eid = exercise?.id ?? id ?? "";
  const m = exercise?.muscle ?? muscle;
  const k = exercise?.kind ?? kind;
  const fallbackKey = k === "cardio" ? "cardio" : (m ?? "full");
  const art = `${import.meta.env.BASE_URL}ex/`;
  const fallback = `${art}${FALLBACK[fallbackKey] ?? "fb-full"}.jpg?v=b3`;
  const src = eid ? `${art}${eid}.jpg?v=b3` : fallback;

  return (
    <img
      className="ex-pic"
      alt=""
      src={src}
      decoding="async"
      draggable={false}
      onError={(e) => {
        const img = e.currentTarget;
        if (img.dataset.fb === "1") return;
        img.dataset.fb = "1";
        img.src = fallback;
      }}
    />
  );
}
