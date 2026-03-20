"use client";

import { useEffect, useRef } from "react";
import type { Map as LeafletMap, Marker, Polyline } from "leaflet";

interface Props {
  currentPos: [number, number] | null;
  destination: [number, number] | null;
  routeCoords: [number, number][];
  onMapClick: (lat: number, lng: number) => void;
  isNavigating: boolean;
}

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
  const currentMarkerRef = useRef<Marker | null>(null);

  // マップ初期化（1回のみ）
  useEffect(() => {
    if (mapRef.current || !containerRef.current) return;

    const L = require("leaflet");

    // デフォルトアイコン修正
    delete (L.Icon.Default.prototype as Record<string, unknown>)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
      iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
      shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
    });

    const map = L.map(containerRef.current).setView([35.6812, 139.7671], 15);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap contributors",
    }).addTo(map);

    map.on("click", (e: { latlng: { lat: number; lng: number } }) => {
      onMapClick(e.latlng.lat, e.latlng.lng);
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 現在地マーカー更新
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !currentPos) return;
    const L = require("leaflet");

    const currentIcon = L.divIcon({
      className: "",
      html: `<div style="width:16px;height:16px;background:#2563eb;border:3px solid white;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,0.4)"></div>`,
      iconSize: [16, 16],
      iconAnchor: [8, 8],
    });

    if (currentMarkerRef.current) {
      currentMarkerRef.current.setLatLng(currentPos);
    } else {
      currentMarkerRef.current = L.marker(currentPos, { icon: currentIcon }).addTo(map);
    }

    if (!isNavigating) {
      map.setView(currentPos, map.getZoom());
    }
  }, [currentPos, isNavigating]);

  // 目的地マーカー更新
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const L = require("leaflet");

    if (destMarkerRef.current) {
      map.removeLayer(destMarkerRef.current);
      destMarkerRef.current = null;
    }

    if (destination) {
      const destIcon = L.divIcon({
        className: "",
        html: `<div style="width:32px;height:32px;background:#ef4444;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.4)"></div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 32],
      });
      destMarkerRef.current = L.marker(destination, { icon: destIcon }).addTo(map);
      map.setView(destination, 15);
    }
  }, [destination]);

  // ルートライン更新
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const L = require("leaflet");

    if (routeLineRef.current) {
      map.removeLayer(routeLineRef.current);
      routeLineRef.current = null;
    }

    if (routeCoords.length > 0) {
      routeLineRef.current = L.polyline(routeCoords, {
        color: "#2563eb",
        weight: 5,
        opacity: 0.8,
      }).addTo(map);
      map.fitBounds(routeLineRef.current.getBounds(), { padding: [40, 40] });
    }
  }, [routeCoords]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full"
      style={{ cursor: isNavigating ? "default" : "crosshair" }}
    />
  );
}
