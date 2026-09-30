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
      <svg className="brand-art" viewBox="0 0 160 120" aria-hidden="true" focusable="false">
        <circle className="art-orbit" cx="119" cy="57" r="42" />
        <circle className="art-orbit-line" cx="119" cy="57" r="48" />
        <path className="art-sparkle art-sparkle--one" d="M145 8c1 7 3 9 9 10-6 1-8 3-9 10-1-7-3-9-9-10 6-1 8-3 9-10Z" />
        <path className="art-sparkle art-sparkle--two" d="M78 55c1 4 2 6 6 7-4 1-5 2-6 7-1-5-2-6-7-7 5-1 6-3 7-7Z" />
        <g className="food-steam">
          <path className="steam-one" d="M28 63c-6-7 6-9 0-17" />
          <path className="steam-two" d="M42 60c-6-7 6-9 0-17" />
        </g>
        <g className="food-bowl">
          <ellipse className="food-shadow" cx="47" cy="99" rx="29" ry="5" />
          <path className="bowl-body" d="M18 77h59c-3 19-14 28-30 28S21 96 18 77Z" />
          <ellipse className="bowl-rim" cx="47.5" cy="77" rx="29.5" ry="8" />
          <path className="food-leaf" d="M26 76c4-13 15-15 23-5-8 1-13 4-16 9 8-4 15-4 23 1-12 7-24 6-30-5Z" />
          <circle className="food-egg" cx="58" cy="73" r="8" />
          <circle className="food-yolk" cx="58" cy="73" r="3.5" />
          <path className="food-protein" d="M36 75c4-8 10-9 15-3l-5 7c-4 2-7 1-10-4Z" />
        </g>
        <ellipse className="mascot-shadow" cx="116" cy="105" rx="28" ry="5" />
        <g className="mascot">
          <path className="mascot-leg mascot-leg--left" d="M105 91c-2 7-5 10-10 12m27-12c2 7 5 10 10 12" />
          <path className="mascot-arm mascot-arm--left" d="M99 51c-8-4-13-11-18-21" />
          <path className="mascot-arm mascot-arm--right" d="M132 51c8-4 13-11 18-21" />
          <path className="mascot-body" d="M93 61c0-23 9-38 23-38s24 15 24 38v16c0 17-9 26-24 26S93 94 93 77V61Z" />
          <path className="mascot-belly" d="M100 76c2 13 7 19 16 19s15-6 17-19c-10 5-23 5-33 0Z" />
          <circle className="mascot-eye" cx="107" cy="62" r="2.2" />
          <circle className="mascot-eye" cx="125" cy="62" r="2.2" />
          <path className="mascot-smile" d="M110 70c3 4 8 4 11 0" />
          <circle className="mascot-cheek" cx="101" cy="69" r="3" />
          <circle className="mascot-cheek" cx="131" cy="69" r="3" />
        </g>
        <g className="barbell">
          <rect className="barbell-bar" x="79" y="25" width="62" height="6" rx="3" />
          <rect className="barbell-plate" x="71" y="17" width="8" height="22" rx="3" />
          <rect className="barbell-plate barbell-plate--inner" x="80" y="20" width="5" height="16" rx="2" />
          <rect className="barbell-plate" x="141" y="17" width="8" height="22" rx="3" />
          <rect className="barbell-plate barbell-plate--inner" x="135" y="20" width="5" height="16" rx="2" />
        </g>
      </svg>
    </div>
  );
}
