"use client";

import { useState, useRef, useCallback, useEffect } from "react";

export interface GeoState {
  currentPos: [number, number] | null;
  currentSpeed: number;   // m/s
  walkedDistance: number; // メートル
  error: string | null;
}

export function useGeolocation() {
  const [state, setState] = useState<GeoState>({
    currentPos: null,
    currentSpeed: 0,
    walkedDistance: 0,
    error: null,
  });

  const watchIdRef = useRef<number | null>(null);
  const prevPosRef = useRef<GeolocationPosition | null>(null);
  const walkedRef = useRef(0);
  const isNavigatingRef = useRef(false);

  // アプリ起動時に現在地取得を開始
  useEffect(() => {
    if (!navigator.geolocation) {
      setState((s) => ({ ...s, error: "このブラウザは位置情報に対応していません" }));
      return;
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude, speed, accuracy } = pos.coords;
        if (accuracy > 50) return;

        const current: [number, number] = [latitude, longitude];

        // ナビ中のみ距離を加算
        if (isNavigatingRef.current && prevPosRef.current) {
          const dist = haversine(
            prevPosRef.current.coords.latitude,
            prevPosRef.current.coords.longitude,
            latitude,
            longitude
          );
          if (dist < 100) {
            walkedRef.current += dist;
          }
        }
        prevPosRef.current = pos;

        setState((s) => ({
          ...s,
          currentPos: current,
          currentSpeed: isNavigatingRef.current ? Math.max(speed ?? 0, 0) : 0,
          walkedDistance: walkedRef.current,
          error: null,
        }));
      },
      (err) => {
        setState((s) => ({ ...s, error: err.message }));
      },
      { enableHighAccuracy: true, maximumAge: 0 }
    );

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  // ナビ開始（距離カウントをリセットして追跡開始）
  const start = useCallback(() => {
    walkedRef.current = 0;
    prevPosRef.current = null;
    isNavigatingRef.current = true;
    setState((s) => ({ ...s, walkedDistance: 0, currentSpeed: 0, error: null }));
  }, []);

  // ナビ停止
  const stop = useCallback(() => {
    isNavigatingRef.current = false;
    walkedRef.current = 0;
    prevPosRef.current = null;
    setState((s) => ({ ...s, walkedDistance: 0, currentSpeed: 0 }));
  }, []);

  return { ...state, start, stop };
}

function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
