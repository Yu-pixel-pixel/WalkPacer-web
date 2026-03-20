export type PaceStatus = "onPace" | "slightlyBehind" | "behind" | "overdue";

export const PACE_MESSAGES: Record<PaceStatus, string> = {
  onPace: "このペースで間に合います",
  slightlyBehind: "少し早歩きしましょう",
  behind: "急ぎましょう！",
  overdue: "設定時刻を過ぎています",
};

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
  if (safeSpeed >= requiredSpeed) {
    status = "onPace";
  } else if (safeSpeed >= requiredSpeed * 0.8) {
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
