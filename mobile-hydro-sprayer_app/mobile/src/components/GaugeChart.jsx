// Lightweight dependency-free semicircle gauge, 0-100%.
export default function GaugeChart({ value = 0, size = 140 }) {
  const clamped = Math.max(0, Math.min(100, value ?? 0));
  const radius = size / 2 - 10;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = Math.PI * radius; // half circle
  const offset = circumference - (clamped / 100) * circumference;

  const color = clamped < 30 ? "#DC2626" : clamped < 60 ? "#F59E0B" : "#3B7A57";

  return (
    <svg width={size} height={size / 2 + 20} viewBox={`0 0 ${size} ${size / 2 + 20}`}>
      <path
        d={`M 10 ${cy} A ${radius} ${radius} 0 0 1 ${size - 10} ${cy}`}
        fill="none"
        stroke="#E5E7EB"
        strokeWidth="12"
        strokeLinecap="round"
      />
      <path
        d={`M 10 ${cy} A ${radius} ${radius} 0 0 1 ${size - 10} ${cy}`}
        fill="none"
        stroke={color}
        strokeWidth="12"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        style={{ transition: "stroke-dashoffset 0.6s ease" }}
      />
      <text x={cx} y={cy - 4} textAnchor="middle" className="fill-gray-800" fontSize="22" fontWeight="700">
        {value === null || value === undefined ? "--" : `${Math.round(clamped)}%`}
      </text>
    </svg>
  );
}
