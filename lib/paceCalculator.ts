import { WALK_NORMAL_SPEED_MS } from "./routing";

export type PaceStatus = "onPace" | "slightlyBehind" | "behind" | "overdue";

export const PACE_MESSAGES: Record<PaceStatus, string> = {
  onPace:        "余裕を持って到着できます",
  slightlyBehind:"急ぎ気味で行きましょう",
  behind:        "急いでください！",
  overdue:       "設定時刻を過ぎています",
};

// 判定ロジック（徒歩標準速度 5 km/h 基準）:
//   必要速度 ≤ 標準速度 × 0.8  → 余裕（青）
//   必要速度 ≤ 標準速度 × 1.0  → 注意（黄）
//   必要速度 > 標準速度 × 1.0  → 急ぐ（赤）
export interface PaceResult {
  status: PaceStatus;
  remainingDistance: number; // メートル
  requiredSpeed: number;     // m/s
  currentSpeed: number;      // m/s
}

export function calculatePace(
  totalDistance: number,
  walkedDistance: number,
  arrivalTime: Date,
  currentSpeed: number
): PaceResult {
  const safeSpeed = Math.max(currentSpeed, 0);
  const remainingDistance = Math.max(totalDistance - walkedDistance, 0);
  const remainingTime = (arrivalTime.getTime() - Date.now()) / 1000;

  if (remainingTime <= 0) {
    return { status: "overdue", remainingDistance, requiredSpeed: 0, currentSpeed: safeSpeed };
  }

  const requiredSpeed = remainingDistance / remainingTime;

  let status: PaceStatus;
  if (requiredSpeed <= WALK_NORMAL_SPEED_MS * 0.8) {
    status = "onPace";
  } else if (requiredSpeed <= WALK_NORMAL_SPEED_MS) {
    status = "slightlyBehind";
  } else {
    status = "behind";
  }

  return { status, remainingDistance, requiredSpeed, currentSpeed: safeSpeed };
}

export function formatDistance(meters: number): string {
  return meters >= 1000
    ? `${(meters / 1000).toFixed(1)} km`
    : `${Math.round(meters)} m`;
}

export function formatSpeed(ms: number): string {
  return `${(ms * 3.6).toFixed(1)} km/h`;
}

export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  if (h > 0) return `${h}時間${m}分`;
  return `${m}分`;
}
