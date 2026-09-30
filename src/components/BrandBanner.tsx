type BannerVariant = "today" | "work" | "meal";

const COPY: Record<BannerVariant, { eyebrow: string; title: string }> = {
  today: { eyebrow: "TRAIN · EAT · REPEAT", title: "積み上げた分だけ、強くなる。" },
  work: { eyebrow: "TODAY'S TRAINING", title: "あと1セット、昨日を超える。" },
  meal: { eyebrow: "FUEL YOUR DAY", title: "食事も、トレーニングの一部。" },
};

export function BrandBanner({ variant }: { variant: BannerVariant }) {
  const copy = COPY[variant];

  return (
    <div className={"brand-banner brand-banner--" + variant}>
      <div className="brand-copy">
        <span className="brand-kicker">{copy.eyebrow}</span>
        <strong>{copy.title}</strong>
      </div>
      <img className="brand-art" src={import.meta.env.BASE_URL + "brand-mascot.png"} alt="" aria-hidden="true" draggable={false} decoding="async" />
    </div>
  );
}
