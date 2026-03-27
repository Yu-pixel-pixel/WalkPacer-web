"use client";

import { PaceResult, PACE_MESSAGES, formatDistance, formatSpeed, formatDuration } from "@/lib/paceCalculator";
import { SearchResult } from "@/lib/routing";
import { useState, useRef, useEffect } from "react";

interface SetupProps {
  destination: [number, number] | null;
  arrivalTime: string;
  routePreview: { distance: number; duration: number } | null;
  onArrivalTimeChange: (v: string) => void;
  onStart: () => void;
  isLoading: boolean;
  onSelectResult: (r: SearchResult) => void;
}

interface NavigatingProps {
  pace: PaceResult;
  totalDistance: number;
  estimatedDuration: number;
  onStop: () => void;
}

// ━━━ ナビ中パネル ━━━
export function NavigatingPanel({ pace, totalDistance, estimatedDuration, onStop }: NavigatingProps) {
  const walked = totalDistance - pace.remainingDistance;
  const progress = totalDistance > 0 ? Math.min(walked / totalDistance, 1) : 0;

  const bgColor: Record<string, string> = {
    onPace:        "bg-blue-500",
    slightlyBehind:"bg-yellow-400",
    behind:        "bg-red-500",
    overdue:       "bg-red-500",
  };
  const isDark = pace.status !== "slightlyBehind";
  const tc = isDark ? "text-white" : "text-gray-800";

  return (
    <div className={`flex flex-col h-full ${bgColor[pace.status]} transition-colors duration-500 px-5 pt-4 pb-6`}>
      <p className={`text-xl font-bold text-center ${tc}`}>🚶 {PACE_MESSAGES[pace.status]}</p>

      {/* 進捗バー */}
      <div className="mt-3">
        <div className="h-2 rounded-full bg-white/30 overflow-hidden">
          <div className="h-full rounded-full bg-white/80 transition-all duration-500" style={{ width: `${progress * 100}%` }} />
        </div>
        <div className={`flex justify-between text-xs mt-1 ${tc} opacity-75`}>
          <span>出発</span><span>{Math.round(progress * 100)}%</span><span>目的地</span>
        </div>
      </div>

      {/* 情報グリッド */}
      <div className="mt-3 grid grid-cols-2 gap-2">
        <InfoCard label="残り距離"   value={formatDistance(pace.remainingDistance)} isDark={isDark} />
        <InfoCard label="必要速度"   value={formatSpeed(pace.requiredSpeed)}         isDark={isDark} />
        <InfoCard label="移動距離"   value={formatDistance(walked)}                  isDark={isDark} />
        <InfoCard label="推定所要時間" value={formatDuration(estimatedDuration)}      isDark={isDark} />
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
  return (
    <div className={`${isDark ? "bg-white/15 text-white" : "bg-black/10 text-gray-800"} rounded-xl py-2.5 flex flex-col items-center`}>
      <span className="text-xs opacity-70">{label}</span>
      <span className="font-bold text-base">{value}</span>
    </div>
  );
}

// ━━━ Nominatim で場所予測検索 ━━━
interface Prediction {
  name: string;
  sub: string;
  lat: number;
  lng: number;
}

async function fetchPredictions(query: string): Promise<Prediction[]> {
  if (query.length < 2) return [];
  const url =
    `https://nominatim.openstreetmap.org/search?` +
    `q=${encodeURIComponent(query)}&format=json&limit=6&accept-language=ja&addressdetails=1`;
  const res = await fetch(url, { headers: { "User-Agent": "WalkPacer-Web/1.0" } });
  if (!res.ok) return [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: any[] = await res.json();
  return data.map((item) => {
    const name = item.name || item.display_name.split(",")[0];
    const sub = item.display_name;
    return { name, sub, lat: parseFloat(item.lat), lng: parseFloat(item.lon) };
  });
}

// ━━━ 設定パネル ━━━
export function SetupPanel({
  destination,
  arrivalTime,
  routePreview,
  onArrivalTimeChange,
  onStart,
  isLoading,
  onSelectResult,
}: SetupProps) {
  const [query, setQuery] = useState("");
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [isFetching, setIsFetching] = useState(false);
  const [focused, setFocused] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 入力のたびに 200ms debounce で予測候補を取得
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (!query.trim()) { setPredictions([]); return; }
    setIsFetching(true);
    timerRef.current = setTimeout(async () => {
      const results = await fetchPredictions(query);
      setPredictions(results);
      setIsFetching(false);
    }, 400);
  }, [query]);

  const handleSelect = (p: Prediction) => {
    onSelectResult({ name: p.name, address: p.sub, lat: p.lat, lng: p.lng });
    setQuery(p.name);
    setPredictions([]);
    setFocused(false);
  };

  const showDropdown = focused && (predictions.length > 0 || isFetching) && query.length >= 2;

  return (
    // h-full を外してスクロール可能にする
    <div className="flex flex-col px-4 pt-4 pb-6 gap-3">

      {/* 検索バー + 予測ドロップダウン */}
      <div className="relative">
        <div className={`flex items-center gap-2 bg-white rounded-xl px-3 py-2.5 shadow-sm border transition-colors ${focused ? "border-blue-400" : "border-gray-200"}`}>
          {isFetching
            ? <span className="text-gray-400 text-sm animate-spin">⟳</span>
            : <span className="text-gray-400 text-sm">🔍</span>
          }
          <input
            type="text"
            placeholder="目的地を検索（例: 渋谷駅）"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setTimeout(() => setFocused(false), 150)}
            className="flex-1 outline-none text-sm text-gray-800 placeholder-gray-400 bg-transparent"
          />
          {query && (
            <button
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => { setQuery(""); setPredictions([]); }}
              className="text-gray-400 text-lg leading-none"
            >×</button>
          )}
        </div>

        {/* 予測候補ドロップダウン */}
        {showDropdown && (
          <div className="absolute top-full left-0 right-0 z-20 mt-1 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden">
            {isFetching && predictions.length === 0 && (
              <p className="text-xs text-gray-400 text-center py-3">検索中...</p>
            )}
            {predictions.map((p, i) => (
              <button
                key={i}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => handleSelect(p)}
                className="w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-blue-50 border-b border-gray-100 last:border-0 active:bg-blue-100"
              >
                <span className="mt-0.5 text-red-400 flex-shrink-0">📍</span>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{p.name}</p>
                  {p.sub && <p className="text-xs text-gray-400 truncate mt-0.5">{p.sub}</p>}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 目的地状態 & 推定時間 */}
      {destination ? (
        <div className="bg-green-50 rounded-xl px-4 py-2.5">
          <p className="text-sm text-green-700 font-medium">✅ 目的地が設定されました</p>
          {routePreview && (
            <p className="text-xs text-gray-500 mt-0.5">
              🚶 約 {formatDuration(routePreview.duration)} ／ {formatDistance(routePreview.distance)}
            </p>
          )}
          {!routePreview && (
            <p className="text-xs text-gray-400 mt-0.5">経路を計算中...</p>
          )}
        </div>
      ) : (
        <p className="text-xs text-gray-400 text-center py-1">
          地図をタップするか上で検索して目的地を設定
        </p>
      )}

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

      {/* スタートボタン */}
      {destination && (
        <button
          onClick={onStart}
          disabled={isLoading}
          className="w-full py-4 rounded-2xl bg-blue-500 text-white font-semibold text-base disabled:opacity-60 active:scale-95 transition-transform shadow-md"
        >
          {isLoading ? "経路を取得中..." : "▶ スタート"}
        </button>
      )}

      {/* iPhoneのホームバー分の余白 */}
      <div className="h-4" />
    </div>
  );
}
