import React from "react";

// Streak thresholds and their visual config
// For daily: streak = number of consecutive days
// For weekly: streak = number of consecutive weeks  
// For monthly: streak = number of consecutive months
export type StreakUnit = "daily" | "weekly" | "monthly";

interface StreakConfig {
  icon: string;
  colorClass: string;
  label: string;
}

export function getStreakConfig(streak: number): StreakConfig {
  if (streak <= 0) return { icon: "🔥", colorClass: "text-muted-foreground", label: "" };
  if (streak < 7) return { icon: "🔥", colorClass: "text-destructive", label: "Rote Flamme" };
  if (streak < 14) return { icon: "🔥", colorClass: "text-amber-400", label: "Gelbe Flamme" };
  if (streak < 28) return { icon: "🔥", colorClass: "text-emerald-400", label: "Grüne Flamme" };
  if (streak < 42) return { icon: "🔥", colorClass: "text-blue-400", label: "Blaue Flamme" };
  if (streak < 56) return { icon: "🔥", colorClass: "text-violet-400", label: "Lila Flamme" };
  if (streak < 70) return { icon: "⭐", colorClass: "text-destructive", label: "Roter Stern" };
  if (streak < 84) return { icon: "⭐", colorClass: "text-amber-400", label: "Gelber Stern" };
  if (streak < 112) return { icon: "⭐", colorClass: "text-emerald-400", label: "Grüner Stern" };
  if (streak < 140) return { icon: "⭐", colorClass: "text-blue-400", label: "Blauer Stern" };
  if (streak < 168) return { icon: "⭐", colorClass: "text-violet-400", label: "Lila Stern" };
  return { icon: "⭐", colorClass: "text-amber-300", label: "Goldener Stern" };
}

interface StreakBadgeProps {
  streak: number;
  size?: "sm" | "md" | "lg";
  showCount?: boolean;
}

export function StreakBadge({ streak, size = "md", showCount = true }: StreakBadgeProps) {
  if (streak <= 0) return null;
  const config = getStreakConfig(streak);
  const sizeMap = { sm: "text-sm", md: "text-base", lg: "text-xl" };
  const countSize = { sm: "text-[9px]", md: "text-[10px]", lg: "text-xs" };

  return (
    <span className={`inline-flex items-center gap-0.5 font-semibold ${sizeMap[size]}`} title={config.label}>
      <span className={config.colorClass}>{config.icon}</span>
      {showCount && streak > 0 && (
        <span className={`${countSize[size]} ${config.colorClass} tabular-nums`}>{streak}</span>
      )}
    </span>
  );
}

export default StreakBadge;
