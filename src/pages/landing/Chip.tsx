export default function Chip() {
  return (
    <svg className="card-chip" viewBox="0 0 48 38" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <defs>
        <linearGradient id="chipGold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fcebb6" />
          <stop offset="0.45" stopColor="#e0c277" />
          <stop offset="1" stopColor="#a8842f" />
        </linearGradient>
        <clipPath id="chipClip">
          <rect x="0" y="0" width="48" height="38" rx="7" />
        </clipPath>
      </defs>
      <g clipPath="url(#chipClip)">
        <rect width="48" height="38" fill="url(#chipGold)" />
        <g stroke="#6b4a14" strokeOpacity="0.5" strokeWidth="1.4" fill="none">
          <line x1="-1" y1="12.5" x2="49" y2="12.5" />
          <line x1="-1" y1="25.5" x2="49" y2="25.5" />
          <line x1="16" y1="-1" x2="16" y2="39" />
          <line x1="32" y1="-1" x2="32" y2="39" />
        </g>
        <rect x="18" y="13" width="12" height="12" rx="2.5" fill="#d2a849" stroke="#6b4a14" strokeOpacity="0.5" strokeWidth="1.2" />
      </g>
      <rect x="0.6" y="0.6" width="46.8" height="36.8" rx="6.4" fill="none" stroke="#fff" strokeOpacity="0.4" strokeWidth="1" />
    </svg>
  )
}
