"use client";

type Status = "pass" | "warn" | "fail";

interface StatusIconProps {
  status: Status;
  size?: number;
}

export function StatusIcon({ status, size = 18 }: StatusIconProps) {
  if (status === "pass") {
    return (
      <svg width={size} height={size} viewBox="0 0 20 20" fill="none">
        <circle cx="10" cy="10" r="10" fill="#DCFCE7" />
        <path d="M6 10L8.5 12.5L14 7.5" stroke="#16A34A" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (status === "warn") {
    return (
      <svg width={size} height={size} viewBox="0 0 20 20" fill="none">
        <circle cx="10" cy="10" r="10" fill="#FEF3C7" />
        <path d="M10 6V11" stroke="#D97706" strokeWidth="2" strokeLinecap="round" />
        <circle cx="10" cy="14" r="1.2" fill="#D97706" />
      </svg>
    );
  }
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <circle cx="10" cy="10" r="10" fill="#FEE2E2" />
      <path d="M7 7L13 13M13 7L7 13" stroke="#DC2626" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
