"use client";

import dynamic from "next/dynamic";
import { useState, useEffect, useCallback, useRef } from "react";
import { useGeolocation } from "@/hooks/useGeolocation";
import { calculatePace, PaceResult } from "@/lib/paceCalculator";
import { fetchRoute, SearchResult } from "@/lib/routing";
import { NavigatingPanel, SetupPanel } from "@/components/PacePanel";

const WalkPacerMap = dynamic(() => import("@/components/WalkPacerMap"), { ssr: false });

function defaultArrivalTime(): string {
  const d = new Date(Date.now() + 30 * 60 * 1000);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export default function Home() {
  const geo = useGeolocation();

  const [destination, setDestination] = useState<[number, number] | null>(null);
  const [arrivalTime, setArrivalTime] = useState(defaultArrivalTime);
  const [isNavigating, setIsNavigating] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [routeCoords, setRouteCoords] = useState<[number, number][]>([]);
  const [totalDistance, setTotalDistance] = useState(0);
  const [estimatedDuration, setEstimatedDuration] = useState(0);
  const [routePreview, setRoutePreview] = useState<{ distance: number; duration: number } | null>(null);
  const [pace, setPace] = useState<PaceResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const previewTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 目的地 or 現在地が変わったら自動でルートプレビューを取得
  const currentPosRef = useRef(geo.currentPos);
  useEffect(() => { currentPosRef.current = geo.currentPos; }, [geo.currentPos]);

  useEffect(() => {
    if (!destination || !geo.currentPos || isNavigating) return;
    const pos = geo.currentPos;

    if (previewTimerRef.current) clearTimeout(previewTimerRef.current);
    previewTimerRef.current = setTimeout(async () => {
      try {
        const route = await fetchRoute(pos, destination);
        setRoutePreview({ distance: route.totalDistance, duration: route.estimatedDuration });
        setRouteCoords(route.coordinates);
      } catch {
        setError("経路の取得に失敗しました。もう一度お試しください。");
      }
    }, 600);
  }, [destination, geo.currentPos, isNavigating]); // eslint-disable-line react-hooks/exhaustive-deps

  // ペース再計算
  useEffect(() => {
    if (!isNavigating || totalDistance === 0) return;
    const [h, m] = arrivalTime.split(":").map(Number);
    const arrival = new Date();
    arrival.setHours(h, m, 0, 0);
    if (arrival < new Date()) arrival.setDate(arrival.getDate() + 1);
    setPace(calculatePace(totalDistance, geo.walkedDistance, arrival, geo.currentSpeed));
  }, [geo.walkedDistance, geo.currentSpeed, isNavigating, totalDistance, arrivalTime]);

  const handleMapClick = useCallback((lat: number, lng: number) => {
    if (!isNavigating) setDestination([lat, lng]);
  }, [isNavigating]);

  const handleSelectResult = useCallback((r: SearchResult) => {
    setDestination([r.lat, r.lng]);
  }, []);

  const handleStart = async () => {
    if (!destination || !geo.currentPos) {
      setError("現在地を取得できませんでした。位置情報を許可してください。");
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      // プレビュー取得済みならそのまま使う、なければ再取得
      let route = routePreview && routeCoords.length > 0
        ? { totalDistance: routePreview.distance, estimatedDuration: routePreview.duration, coordinates: routeCoords }
        : await fetchRoute(geo.currentPos, destination);

      setTotalDistance(route.totalDistance);
      setEstimatedDuration(route.estimatedDuration);
      setRouteCoords(route.coordinates);
      geo.start();
      setIsNavigating(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "エラーが発生しました");
    } finally {
      setIsLoading(false);
    }
  };

  const handleStop = () => {
    geo.stop();
    setIsNavigating(false);
    setRouteCoords([]);
    setTotalDistance(0);
    setEstimatedDuration(0);
    setPace(null);
    setRoutePreview(null);
    setDestination(null);
  };

  return (
    <main className="fixed inset-0 flex flex-col">
      <div className="flex-[55]">
        <WalkPacerMap
          currentPos={geo.currentPos}
          destination={destination}
          routeCoords={routeCoords}
          onMapClick={handleMapClick}
          isNavigating={isNavigating}
        />
      </div>

      <div className="flex-[45] overflow-y-auto bg-gray-50">
        {error && (
          <div className="bg-red-100 text-red-700 text-sm px-4 py-2 text-center">
            {error}
            <button onClick={() => setError(null)} className="ml-2 underline">閉じる</button>
          </div>
        )}
        {isNavigating && pace ? (
          <NavigatingPanel
            pace={pace}
            totalDistance={totalDistance}
            estimatedDuration={estimatedDuration}
            onStop={handleStop}
          />
        ) : (
          <SetupPanel
            destination={destination}
            arrivalTime={arrivalTime}
            routePreview={routePreview}
            onArrivalTimeChange={setArrivalTime}
            onStart={handleStart}
            isLoading={isLoading}
            onSelectResult={handleSelectResult}
          />
        )}
      </div>
    </main>
  );
}
