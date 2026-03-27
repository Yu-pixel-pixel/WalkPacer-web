"use client";

import { useEffect, useRef } from "react";
import type { Map as LeafletMap, Marker } from "leaflet";

interface Props {
  currentPos: [number, number];
  destination: [number, number] | null;
}

const PERSON_ICON_HTML = `
  <div style="position:relative;width:32px;height:32px">
    <div style="position:absolute;inset:0;background:rgba(66,133,244,0.25);border-radius:50%;animation:gps-pulse 2s ease-out infinite"></div>
    <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:18px;height:18px;background:#4285F4;border:3px solid white;border-radius:50%;box-shadow:0 2px 8px rgba(0,0,0,0.4)"></div>
  </div>
  <style>@keyframes gps-pulse{0%{transform:scale(1);opacity:.8}100%{transform:scale(2.8);opacity:0}}</style>
`;

const DEST_ICON_HTML = `
  <div style="position:relative;width:28px;height:36px">
    <div style="width:28px;height:28px;background:#EA4335;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:3px solid white;box-shadow:0 3px 8px rgba(0,0,0,0.35)"></div>
    <div style="position:absolute;top:8px;left:8px;width:8px;height:8px;background:white;border-radius:50%"></div>
  </div>
`;

export default function ShareMap({ currentPos, destination }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markerRef = useRef<Marker | null>(null);
  const destMarkerRef = useRef<Marker | null>(null);
  const initializedRef = useRef(false);

  // マップ初期化
  useEffect(() => {
    if (mapRef.current || !containerRef.current) return;
    const L = require("leaflet");

    const map = L.map(containerRef.current, { zoomControl: false })
      .setView(currentPos, 16);

    const mtKey = process.env.NEXT_PUBLIC_MAPTILER_KEY;
    L.tileLayer(
      `https://api.maptiler.com/maps/streets-v2/{z}/{x}/{y}.png?key=${mtKey}`,
      {
        attribution: '© <a href="https://www.maptiler.com/copyright/">MapTiler</a> © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 20,
      }
    ).addTo(map);

    L.control.zoom({ position: "bottomright" }).addTo(map);

    // 現在地マーカー
    const icon = L.divIcon({ className: "", html: PERSON_ICON_HTML, iconSize: [32, 32], iconAnchor: [16, 16] });
    markerRef.current = L.marker(currentPos, { icon }).addTo(map);

    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 現在地更新
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const L = require("leaflet");

    if (markerRef.current) {
      markerRef.current.setLatLng(currentPos);
    }
    if (!initializedRef.current) {
      map.setView(currentPos, 16);
      initializedRef.current = true;
    } else {
      map.panTo(currentPos, { animate: true });
    }
  }, [currentPos]);

  // 目的地マーカー
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const L = require("leaflet");

    if (destMarkerRef.current) { map.removeLayer(destMarkerRef.current); destMarkerRef.current = null; }
    if (destination) {
      const icon = L.divIcon({ className: "", html: DEST_ICON_HTML, iconSize: [28, 36], iconAnchor: [14, 36] });
      destMarkerRef.current = L.marker(destination, { icon }).addTo(map);
    }
  }, [destination]);

  return <div ref={containerRef} className="w-full h-full" />;
}
