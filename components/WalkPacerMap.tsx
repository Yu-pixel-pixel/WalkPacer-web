"use client";

import { useEffect, useRef, useCallback } from "react";
import type { Map as LeafletMap, Marker, Polyline } from "leaflet";

interface Props {
  currentPos: [number, number] | null;
  destination: [number, number] | null;
  routeCoords: [number, number][];
  onMapClick: (lat: number, lng: number) => void;
  isNavigating: boolean;
}

const CURRENT_ICON_HTML = `
  <div style="position:relative;width:24px;height:24px">
    <div style="position:absolute;inset:0;background:rgba(66,133,244,0.2);border-radius:50%;animation:gps-pulse 2s ease-out infinite"></div>
    <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:14px;height:14px;background:#4285F4;border:2.5px solid white;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,0.35)"></div>
  </div>
  <style>@keyframes gps-pulse{0%{transform:scale(1);opacity:.8}100%{transform:scale(2.8);opacity:0}}</style>
`;

const DEST_ICON_HTML = `
  <div style="position:relative;width:28px;height:36px">
    <div style="width:28px;height:28px;background:#EA4335;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:3px solid white;box-shadow:0 3px 8px rgba(0,0,0,0.35)"></div>
    <div style="position:absolute;top:8px;left:8px;width:8px;height:8px;background:white;border-radius:50%"></div>
  </div>
`;

export default function WalkPacerMap({
  currentPos,
  destination,
  routeCoords,
  onMapClick,
  isNavigating,
}: Props) {
  const mapRef = useRef<LeafletMap | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const destMarkerRef = useRef<Marker | null>(null);
  const routeLineRef = useRef<Polyline | null>(null);
  const routeShadowRef = useRef<Polyline | null>(null);
  const currentMarkerRef = useRef<Marker | null>(null);
  const hasInitialViewRef = useRef(false); // 初回現在地表示済みフラグ
  const userPannedRef = useRef(false);     // ユーザーが地図を動かしたフラグ

  // マップ初期化（1回のみ）
  useEffect(() => {
    if (mapRef.current || !containerRef.current) return;
    const L = require("leaflet");

    const map = L.map(containerRef.current, { zoomControl: false })
      .setView([35.6812, 139.7671], 15);

    // Google Maps に最も近い無料タイル（Stadia Maps alidade_smooth）
    L.tileLayer(
      "https://tiles.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}{r}.png",
      {
        attribution: '© <a href="https://stadiamaps.com/">Stadia Maps</a> © <a href="https://openmaptiles.org/">OpenMapTiles</a> © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 20,
      }
    ).addTo(map);

    L.control.zoom({ position: "bottomright" }).addTo(map);

    // ユーザーが地図をドラッグしたら自動追従を止める
    map.on("dragstart", () => { userPannedRef.current = true; });

    map.on("click", (e: { latlng: { lat: number; lng: number } }) => {
      onMapClick(e.latlng.lat, e.latlng.lng);
    });

    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 現在地マーカー（自動追従は初回のみ）
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !currentPos) return;
    const L = require("leaflet");

    const icon = L.divIcon({
      className: "",
      html: CURRENT_ICON_HTML,
      iconSize: [24, 24],
      iconAnchor: [12, 12],
    });

    if (currentMarkerRef.current) {
      currentMarkerRef.current.setLatLng(currentPos);
    } else {
      currentMarkerRef.current = L.marker(currentPos, { icon }).addTo(map);
    }

    // 初回だけ自動でその場所に移動する
    if (!hasInitialViewRef.current) {
      map.setView(currentPos, 16);
      hasInitialViewRef.current = true;
    }
  }, [currentPos]);

  // 目的地マーカー
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const L = require("leaflet");

    if (destMarkerRef.current) {
      map.removeLayer(destMarkerRef.current);
      destMarkerRef.current = null;
    }
    if (destination) {
      const icon = L.divIcon({
        className: "",
        html: DEST_ICON_HTML,
        iconSize: [28, 36],
        iconAnchor: [14, 36],
      });
      destMarkerRef.current = L.marker(destination, { icon }).addTo(map);
      map.setView(destination, 15);
      userPannedRef.current = false; // 目的地設定時は追従を再開
    }
  }, [destination]);

  // ルートライン（白縁取り＋青）
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const L = require("leaflet");

    if (routeShadowRef.current) { map.removeLayer(routeShadowRef.current); routeShadowRef.current = null; }
    if (routeLineRef.current)   { map.removeLayer(routeLineRef.current);   routeLineRef.current = null;   }

    if (routeCoords.length > 0) {
      routeShadowRef.current = L.polyline(routeCoords, { color: "white", weight: 9, opacity: 0.9 }).addTo(map);
      routeLineRef.current   = L.polyline(routeCoords, { color: "#4285F4", weight: 5, opacity: 1 }).addTo(map);
      const line = routeLineRef.current;
      if (line) map.fitBounds(line.getBounds(), { padding: [40, 40] });
    }
  }, [routeCoords]);

  // 現在地に戻るボタン
  const handleLocate = useCallback(() => {
    const map = mapRef.current;
    if (!map || !currentPos) return;
    userPannedRef.current = false;
    map.setView(currentPos, 16, { animate: true });
  }, [currentPos]);

  return (
    <div className="relative w-full h-full">
      <div
        ref={containerRef}
        className="w-full h-full"
        style={{ cursor: isNavigating ? "default" : "crosshair" }}
      />
      {/* 現在地に戻るボタン */}
      <button
        onClick={handleLocate}
        title="現在地に戻る"
        className="absolute bottom-16 right-3 z-[1000] w-10 h-10 bg-white rounded-full flex items-center justify-center active:scale-95 transition-transform"
        style={{ boxShadow: "0 2px 6px rgba(0,0,0,0.3)" }}
      >
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#4285F4" strokeWidth="2.2" strokeLinecap="round">
          <circle cx="12" cy="12" r="4" fill="#4285F4" stroke="none"/>
          <line x1="12" y1="2"  x2="12" y2="6"/>
          <line x1="12" y1="18" x2="12" y2="22"/>
          <line x1="2"  y1="12" x2="6"  y2="12"/>
          <line x1="18" y1="12" x2="22" y2="12"/>
        </svg>
      </button>
    </div>
  );
}
