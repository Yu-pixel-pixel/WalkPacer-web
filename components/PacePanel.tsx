"use client";

import { PaceResult, PACE_MESSAGES, formatDistance, formatSpeed } from "@/lib/paceCalculator";
import { SearchResult, TransportMode, TRANSPORT_LABELS } from "@/lib/routing";
import { useState, useRef } from "react";

interface SetupProps {
  destination: [number, number] | null;
  arrivalTime: string;
  transportMode: TransportMode;
  onArrivalTimeChange: (v: string) => void;
  onTransportModeChange: (m: TransportMode) => void;
  onStart: () => void;
  isLoading: boolean;
  onSelectResult: (r: SearchResult) => void;
}

interface NavigatingProps {
  pace: PaceResult;
  totalDistance: number;
  transportMode: TransportMode;
  onStop: () => void;
}

const MODES: TransportMode[] = ["foot", "bike", "car", "train"];

// ナビ中パネル
export function NavigatingPanel({ pace, totalDistance, transportMode, onStop }: NavigatingProps) {
  const walked = totalDistance - pace.remainingDistance;
  const progress = totalDistance > 0 ? Math.min(walked / totalDistance, 1) : 0;

  const bgColor: Record<string, string> = {
    onPace: "bg-blue-500",
    slightlyBehind: "bg-yellow-400",
    behind: "bg-red-500",
    overdue: "bg-red-500",
  };
  const isDark = pace.status !== "slightlyBehind";
  const textClass = isDark ? "text-white" : "text-gray-800";
  const { icon } = TRANSPORT_LABELS[transportMode];

  return (
    <div className={`flex flex-col h-full ${bgColor[pace.status]} transition-colors duration-500 px-5 pt-4 pb-6`}>
      {/* ペースメッセージ */}
      <p className={`text-xl font-bold text-center ${textClass}`}>
        {icon} {PACE_MESSAGES[pace.status]}
      </p>

      {/* 進捗バー */}
      <div className="mt-3">
        <div className="h-2 rounded-full bg-white/30 overflow-hidden">
          <div
            className="h-full rounded-full bg-white/80 transition-all duration-500"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
        <div className={`flex justify-between text-xs mt-1 ${textClass} opacity-75`}>
          <span>出発</span>
          <span>{Math.round(progress * 100)}%</span>
          <span>目的地</span>
        </div>
      </div>

      {/* 情報グリッド */}
      <div className="mt-3 grid grid-cols-2 gap-2">
        <InfoCard label="残り距離"   value={formatDistance(pace.remainingDistance)} isDark={isDark} />
        <InfoCard label="必要速度"   value={formatSpeed(pace.requiredSpeed)}         isDark={isDark} />
        <InfoCard label="移動距離"   value={formatDistance(walked)}                  isDark={isDark} />
        <InfoCard label="現在速度"   value={formatSpeed(pace.currentSpeed)}          isDark={isDark} />
      </div>

      <div className="flex-1" />

      <button
        onClick={onStop}
        className={`w-full py-3.5 rounded-2xl font-semibold text-base active:scale-95 transition-transform ${isDark ? "bg-black/25 text-white" : "bg-black/15 text-gray-800"}`}
      >
        ⏹ 停止
      </button>
    </div>
  );
}

function InfoCard({ label, value, isDark }: { label: string; value: string; isDark: boolean }) {
  const base = isDark ? "bg-white/15 text-white" : "bg-black/10 text-gray-800";
  return (
    <div className={`${base} rounded-xl py-2.5 flex flex-col items-center`}>
      <span className="text-xs opacity-70">{label}</span>
      <span className="font-bold text-base">{value}</span>
    </div>
  );
}

// 設定パネル
export function SetupPanel({
  destination,
  arrivalTime,
  transportMode,
  onArrivalTimeChange,
  onTransportModeChange,
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
      setResults(await searchPlaces(v));
    }, 500);
  };

  const handleSelect = (r: SearchResult) => {
    onSelectResult(r);
    setQuery(r.name);
    setResults([]);
  };

  return (
    <div className="flex flex-col h-full bg-gray-50 px-4 pt-4 pb-6 gap-3">

      {/* 移動手段セレクター */}
      <div className="grid grid-cols-4 gap-1.5 bg-gray-200 rounded-xl p-1">
        {MODES.map((m) => {
          const { label, icon } = TRANSPORT_LABELS[m];
          const active = m === transportMode;
          return (
            <button
              key={m}
              onClick={() => onTransportModeChange(m)}
              className={`flex flex-col items-center py-1.5 rounded-lg text-xs font-medium transition-all ${
                active
                  ? "bg-white text-blue-600 shadow-sm"
                  : "text-gray-500"
              }`}
            >
              <span className="text-lg leading-none">{icon}</span>
              <span className="mt-0.5">{label}</span>
            </button>
          );
        })}
      </div>

      {/* 電車注意書き */}
      {transportMode === "train" && (
        <p className="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2 text-center">
          電車は道路ルートを参考表示します（概算）
        </p>
      )}

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
        {results.length > 0 && (
          <div className="absolute top-full left-0 right-0 z-10 mt-1 bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden max-h-40 overflow-y-auto">
            {results.map((r, i) => (
              <button key={i} onClick={() => handleSelect(r)} className="w-full text-left px-4 py-2.5 hover:bg-gray-50 border-b border-gray-100 last:border-0">
                <p className="text-sm font-medium text-gray-800 truncate">{r.name}</p>
                <p className="text-xs text-gray-400 truncate">{r.address}</p>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 目的地状態 */}
      <p className={`text-sm text-center ${destination ? "text-green-600 font-medium" : "text-gray-400"}`}>
        {destination ? "✅ 目的地が設定されました" : "地図をタップするか検索して目的地を設定"}
      </p>

      {/* 到着希望時刻 */}
      <div className="flex items-center justify-between bg-white rounded-xl px-4 py-3 shadow-sm border border-gray-200">
        <span className="text-sm text-gray-600">🕐 到着希望時刻</span>
        <input
          type="time"
          value={arrivalTime}
          onChange={(e) => onArrivalTimeChange(e.target.value)}
          className="text-sm font-semibold text-gray-800 outline-none"
        />
      </div>

      <div className="flex-1" />

      {destination && (
        <button
          onClick={onStart}
          disabled={isLoading}
          className="w-full py-3.5 rounded-2xl bg-blue-500 text-white font-semibold text-base disabled:opacity-60 active:scale-95 transition-transform"
        >
          {isLoading ? "経路を取得中..." : `▶ スタート`}
        </button>
      )}
    </div>
  );
}
