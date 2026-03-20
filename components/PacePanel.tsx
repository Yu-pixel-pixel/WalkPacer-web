"use client";

import { PaceResult, PACE_MESSAGES, formatDistance, formatSpeed } from "@/lib/paceCalculator";
import { SearchResult } from "@/lib/routing";
import { useState, useRef } from "react";

interface SetupProps {
  destination: [number, number] | null;
  arrivalTime: string;
  onArrivalTimeChange: (v: string) => void;
  onStart: () => void;
  isLoading: boolean;
  onSelectResult: (r: SearchResult) => void;
}

interface NavigatingProps {
  pace: PaceResult;
  totalDistance: number;
  onStop: () => void;
}

// ナビ中パネル
export function NavigatingPanel({ pace, totalDistance, onStop }: NavigatingProps) {
  const walked = totalDistance - pace.remainingDistance;
  const progress = totalDistance > 0 ? Math.min(walked / totalDistance, 1) : 0;

  const bg: Record<string, string> = {
    onPace: "bg-blue-500",
    slightlyBehind: "bg-yellow-400",
    behind: "bg-red-500",
    overdue: "bg-red-500",
  };
  const textLight = pace.status === "slightlyBehind" ? "text-gray-800" : "text-white";

  return (
    <div className={`flex flex-col h-full ${bg[pace.status]} transition-colors duration-500 px-5 pt-4 pb-safe`}>
      {/* ペースメッセージ */}
      <p className={`text-xl font-bold text-center ${textLight}`}>
        {PACE_MESSAGES[pace.status]}
      </p>

      {/* 進捗バー */}
      <div className="mt-3">
        <div className="h-2 rounded-full bg-white/30 overflow-hidden">
          <div
            className="h-full rounded-full bg-white/80 transition-all duration-500"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
        <div className={`flex justify-between text-xs mt-1 ${textLight} opacity-75`}>
          <span>出発</span>
          <span>{Math.round(progress * 100)}%</span>
          <span>目的地</span>
        </div>
      </div>

      {/* 情報カード */}
      <div className={`mt-3 grid grid-cols-2 gap-2 rounded-xl overflow-hidden bg-white/15`}>
        <InfoCell icon="🚶" label="残り距離" value={formatDistance(pace.remainingDistance)} light={textLight} />
        <InfoCell icon="⏱" label="必要速度" value={formatSpeed(pace.requiredSpeed)} light={textLight} />
        <InfoCell icon="📍" label="歩いた距離" value={formatDistance(walked)} light={textLight} />
        <InfoCell icon="💨" label="現在速度" value={formatSpeed(pace.currentSpeed)} light={textLight} />
      </div>

      <div className="flex-1" />

      {/* 停止ボタン */}
      <button
        onClick={onStop}
        className="w-full py-3.5 rounded-2xl bg-black/30 text-white font-semibold text-base active:scale-95 transition-transform"
      >
        ⏹ 停止
      </button>
    </div>
  );
}

function InfoCell({ icon, label, value, light }: { icon: string; label: string; value: string; light: string }) {
  return (
    <div className={`flex flex-col items-center py-2 ${light}`}>
      <span className="text-xs opacity-70">{icon} {label}</span>
      <span className="font-bold text-base">{value}</span>
    </div>
  );
}

// 設定パネル
export function SetupPanel({
  destination,
  arrivalTime,
  onArrivalTimeChange,
  onStart,
  isLoading,
  onSelectResult,
}: SetupProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleQueryChange = (v: string) => {
    setQuery(v);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    if (!v.trim()) { setResults([]); return; }

    searchTimerRef.current = setTimeout(async () => {
      const { searchPlaces } = await import("@/lib/routing");
      const res = await searchPlaces(v);
      setResults(res);
    }, 500);
  };

  const handleSelect = (r: SearchResult) => {
    onSelectResult(r);
    setQuery(r.name);
    setResults([]);
  };

  return (
    <div className="flex flex-col h-full bg-gray-50 px-5 pt-4 pb-safe gap-3">
      {/* 検索バー */}
      <div className="relative">
        <div className="flex items-center gap-2 bg-white rounded-xl px-3 py-2.5 shadow-sm border border-gray-200">
          <span className="text-gray-400">🔍</span>
          <input
            type="text"
            placeholder="目的地を検索（例: 渋谷駅）"
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            className="flex-1 outline-none text-sm text-gray-800 placeholder-gray-400 bg-transparent"
          />
          {query && (
            <button onClick={() => { setQuery(""); setResults([]); }} className="text-gray-400 text-lg leading-none">×</button>
          )}
        </div>

        {/* 検索結果 */}
        {results.length > 0 && (
          <div className="absolute top-full left-0 right-0 z-10 mt-1 bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden max-h-48 overflow-y-auto">
            {results.map((r, i) => (
              <button
                key={i}
                onClick={() => handleSelect(r)}
                className="w-full text-left px-4 py-2.5 hover:bg-gray-50 border-b border-gray-100 last:border-0"
              >
                <p className="text-sm font-medium text-gray-800 truncate">{r.name}</p>
                <p className="text-xs text-gray-400 truncate">{r.address}</p>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 目的地状態 */}
      {destination ? (
        <p className="text-sm text-green-600 font-medium flex items-center gap-1">
          <span>✅</span> 目的地が設定されました
        </p>
      ) : (
        <p className="text-xs text-gray-400 text-center">
          地図をタップするか上で検索して目的地を設定してください
        </p>
      )}

      {/* 到着希望時刻 */}
      <div className="flex items-center justify-between bg-white rounded-xl px-4 py-3 shadow-sm border border-gray-200">
        <span className="text-sm text-gray-600">到着希望時刻</span>
        <input
          type="time"
          value={arrivalTime}
          onChange={(e) => onArrivalTimeChange(e.target.value)}
          className="text-sm font-semibold text-gray-800 outline-none"
        />
      </div>

      <div className="flex-1" />

      {/* スタートボタン */}
      {destination && (
        <button
          onClick={onStart}
          disabled={isLoading}
          className="w-full py-3.5 rounded-2xl bg-blue-500 text-white font-semibold text-base disabled:opacity-60 active:scale-95 transition-transform"
        >
          {isLoading ? "経路を取得中..." : "▶ スタート"}
        </button>
      )}
    </div>
  );
}
