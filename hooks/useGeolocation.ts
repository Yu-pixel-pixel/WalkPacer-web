"use client";

import { useState, useRef, useCallback } from "react";

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

  const start = useCallback(() => {
    walkedRef.current = 0;
    prevPosRef.current = null;
    setState((s) => ({ ...s, walkedDistance: 0, currentSpeed: 0, error: null }));

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude, speed, accuracy } = pos.coords;
        if (accuracy > 50) return; // 精度が悪い場合はスキップ

        const current: [number, number] = [latitude, longitude];

        // 移動距離を加算
        if (prevPosRef.current) {
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

        setState({
          currentPos: current,
          currentSpeed: Math.max(speed ?? 0, 0),
          walkedDistance: walkedRef.current,
          error: null,
        });
      },
      (err) => {
        setState((s) => ({ ...s, error: err.message }));
      },
      { enableHighAccuracy: true, maximumAge: 0 }
    );
  }, []);

  const stop = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    prevPosRef.current = null;
    walkedRef.current = 0;
    setState({ currentPos: null, currentSpeed: 0, walkedDistance: 0, error: null });
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
