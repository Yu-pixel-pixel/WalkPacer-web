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

// Google Maps風の現在地マーカー（青い点＋外側のリング）
const CURRENT_ICON_HTML = `
  <div style="position:relative;width:24px;height:24px">
    <div style="
      position:absolute;inset:0;
      background:rgba(66,133,244,0.2);
      border-radius:50%;
      animation:pulse 2s ease-out infinite;
    "></div>
    <div style="
      position:absolute;top:50%;left:50%;
      transform:translate(-50%,-50%);
      width:14px;height:14px;
      background:#4285F4;
      border:2.5px solid white;
      border-radius:50%;
      box-shadow:0 2px 6px rgba(0,0,0,0.35);
    "></div>
  </div>
  <style>
    @keyframes pulse {
      0%   { transform:scale(1);   opacity:0.8; }
      100% { transform:scale(2.8); opacity:0;   }
    }
  </style>
`;

// Google Maps風の目的地ピン（赤いドロップピン）
const DEST_ICON_HTML = `
  <div style="
    width:28px;height:36px;
    background:#EA4335;
    border-radius:50% 50% 50% 0;
    transform:rotate(-45deg);
    border:3px solid white;
    box-shadow:0 3px 8px rgba(0,0,0,0.4);
  ">
    <div style="
      position:absolute;top:50%;left:50%;
      transform:translate(-50%,-50%) rotate(45deg);
      width:8px;height:8px;
      background:white;
      border-radius:50%;
    "></div>
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

  // マップ初期化（1回のみ）
  useEffect(() => {
    if (mapRef.current || !containerRef.current) return;

    const L = require("leaflet");

    const map = L.map(containerRef.current, {
      zoomControl: false,
    }).setView([35.6812, 139.7671], 15);

    // CartoDB Voyager — Google Maps に近いデザイン
    L.tileLayer(
      "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
      {
        attribution:
          '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> © <a href="https://carto.com/">CARTO</a>',
        maxZoom: 20,
      }
    ).addTo(map);

    // ズームボタンを右下に配置
    L.control.zoom({ position: "bottomright" }).addTo(map);

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
      const icon = L.divIcon({
        className: "",
        html: DEST_ICON_HTML,
        iconSize: [28, 36],
        iconAnchor: [14, 36],
      });
      destMarkerRef.current = L.marker(destination, { icon }).addTo(map);
      map.setView(destination, 15);
    }
  }, [destination]);

  // ルートライン更新（Google Maps風：白い縁取り＋青いライン）
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const L = require("leaflet");

    if (routeShadowRef.current) { map.removeLayer(routeShadowRef.current); routeShadowRef.current = null; }
    if (routeLineRef.current)   { map.removeLayer(routeLineRef.current);   routeLineRef.current = null;   }

    if (routeCoords.length > 0) {
      // 白い縁取り（下レイヤー）
      routeShadowRef.current = L.polyline(routeCoords, {
        color: "white",
        weight: 9,
        opacity: 0.9,
      }).addTo(map);

      // 青いルートライン（上レイヤー）
      routeLineRef.current = L.polyline(routeCoords, {
        color: "#4285F4",
        weight: 5,
        opacity: 1,
      }).addTo(map);

      const line = routeLineRef.current;
      if (line) {
        map.fitBounds(line.getBounds(), { padding: [40, 40] });
      }
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
