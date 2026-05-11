"use client";

interface ScoreRingProps {
  score: number;
  size?: number;
  strokeWidth?: number;
  showLabel?: boolean;
}

export function ScoreRing({
  score,
  size = 80,
  strokeWidth = 8,
  showLabel = true,
}: ScoreRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  const color =
    score >= 90
      ? "#22C55E"
      : score >= 75
      ? "#84CC16"
      : score >= 60
      ? "#F59E0B"
      : score >= 40
      ? "#F97316"
      : "#EF4444";

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        {/* Background track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#E5E7EB"
          strokeWidth={strokeWidth}
        />
        {/* Score arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{
            transition: "stroke-dashoffset 1s cubic-bezier(0.34, 1.56, 0.64, 1), stroke 0.3s ease",
          }}
        />
      </svg>
      {showLabel && (
        <div
          className="absolute flex flex-col items-center"
          style={{ fontSize: size < 60 ? "13px" : "18px" }}
        >
          <span style={{ fontWeight: 700, color, fontFamily: "var(--font-display)", lineHeight: 1 }}>
            {score}
          </span>
          {size >= 70 && (
            <span style={{ fontSize: "9px", color: "#9CA3AF", fontWeight: 500, letterSpacing: "0.05em" }}>
              SCORE
            </span>
          )}
        </div>
      )}
    </div>
  );
}
