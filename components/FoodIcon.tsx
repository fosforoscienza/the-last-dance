type Props = { food: "hotdog" | "fries" | "donut"; className?: string };

export default function FoodIcon({ food, className }: Props) {
  if (food === "hotdog") {
    return (
      <svg viewBox="0 0 100 100" className={className} aria-hidden>
        <g transform="rotate(-20 50 50)">
          <rect x="8" y="46" width="84" height="26" rx="13" fill="#E3A857" />
          <rect x="4" y="38" width="92" height="20" rx="10" fill="#A8382B" />
          <path d="M14 46 q6 -6 12 0 t12 0 t12 0 t12 0 t12 0 t12 0" fill="none" stroke="#FFD23F" strokeWidth="4" strokeLinecap="round" />
          <rect x="8" y="52" width="84" height="22" rx="11" fill="#F0BE70" />
          <path d="M12 60 h76" stroke="#D99A4A" strokeWidth="3" strokeLinecap="round" />
        </g>
      </svg>
    );
  }
  if (food === "fries") {
    return (
      <svg viewBox="0 0 100 100" className={className} aria-hidden>
        <g fill="#FFD23F" stroke="#E0A800" strokeWidth="1.5">
          <rect x="28" y="12" width="8" height="46" rx="2" transform="rotate(-10 32 35)" />
          <rect x="38" y="6" width="8" height="50" rx="2" transform="rotate(-4 42 30)" />
          <rect x="48" y="8" width="8" height="50" rx="2" />
          <rect x="58" y="6" width="8" height="50" rx="2" transform="rotate(5 62 30)" />
          <rect x="66" y="14" width="8" height="44" rx="2" transform="rotate(11 70 35)" />
        </g>
        <path d="M22 40 L78 40 L70 94 L30 94 Z" fill="#C62828" />
        <path d="M22 40 L78 40 L76 52 Q50 62 24 52 Z" fill="#E53935" />
        <path d="M44 66 l6 -8 l6 8 l-6 8z" fill="#FFF3D6" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden>
      <ellipse cx="50" cy="58" rx="40" ry="30" fill="#D98E3A" />
      <ellipse cx="50" cy="52" rx="38" ry="26" fill="#EDAA55" />
      <path d="M22 50 q28 -22 56 0" fill="none" stroke="#FFF6E5" strokeWidth="3" strokeDasharray="2 6" strokeLinecap="round" />
      <ellipse cx="50" cy="40" rx="30" ry="12" fill="#F7E3C4" opacity=".9" />
      <circle cx="40" cy="38" r="1.8" fill="#fff" />
      <circle cx="52" cy="35" r="1.8" fill="#fff" />
      <circle cx="61" cy="41" r="1.8" fill="#fff" />
      <circle cx="46" cy="44" r="1.8" fill="#fff" />
      <path d="M44 62 q6 10 12 0" fill="#B3263A" />
    </svg>
  );
}
