export type TransportMode = "foot" | "bike" | "car" | "train";

export const TRANSPORT_LABELS: Record<TransportMode, { label: string; icon: string }> = {
  foot:  { label: "徒歩",  icon: "🚶" },
  bike:  { label: "自転車", icon: "🚴" },
  car:   { label: "車",    icon: "🚗" },
  train: { label: "電車",  icon: "🚃" },
};

// 移動手段ごとの快適な標準速度 (m/s) — ペース判定に使用
export const NORMAL_SPEED_MS: Record<TransportMode, number> = {
  foot:  5  / 3.6,  // 5 km/h
  bike:  15 / 3.6,  // 15 km/h
  car:   40 / 3.6,  // 40 km/h (市街地)
  train: 60 / 3.6,  // 60 km/h
};

// 移動手段ごとのOSRMエンドポイント（足/自転車は専用サーバー）
const OSRM_BASE: Record<TransportMode, string> = {
  foot:  "https://routing.openstreetmap.de/routed-foot/route/v1/foot",
  bike:  "https://routing.openstreetmap.de/routed-bike/route/v1/bike",
  car:   "https://router.project-osrm.org/route/v1/driving",
  train: "https://router.project-osrm.org/route/v1/driving",
};

export interface RouteResult {
  totalDistance: number;      // メートル
  estimatedDuration: number;  // 秒（OSRMの推定所要時間）
  coordinates: [number, number][];
}

export async function fetchRoute(
  from: [number, number],
  to: [number, number],
  mode: TransportMode = "foot"
): Promise<RouteResult> {
  const base = OSRM_BASE[mode];
  const url = `${base}/${from[1]},${from[0]};${to[1]},${to[0]}?overview=full&geometries=geojson`;

  const res = await fetch(url);
  if (!res.ok) throw new Error("経路の取得に失敗しました");

  const data = await res.json();
  if (data.code !== "Ok" || !data.routes?.[0]) {
    throw new Error("経路が見つかりませんでした");
  }

  const route = data.routes[0];
  const coords: [number, number][] = route.geometry.coordinates.map(
    ([lng, lat]: [number, number]) => [lat, lng]
  );

  return {
    totalDistance: route.distance,
    estimatedDuration: route.duration, // 秒
    coordinates: coords,
  };
}

// 後方互換
export const fetchWalkingRoute = (from: [number, number], to: [number, number]) =>
  fetchRoute(from, to, "foot");

// Nominatim で場所検索
export interface SearchResult {
  name: string;
  address: string;
  lat: number;
  lng: number;
}

export async function searchPlaces(query: string): Promise<SearchResult[]> {
  const url =
    `https://nominatim.openstreetmap.org/search?` +
    `q=${encodeURIComponent(query)}&format=json&limit=5&accept-language=ja`;

  const res = await fetch(url, { headers: { "User-Agent": "WalkPacer-Web/1.0" } });
  if (!res.ok) return [];

  const data = await res.json();
  return data.map((item: Record<string, string>) => ({
    name: item.name || item.display_name.split(",")[0],
    address: item.display_name,
    lat: parseFloat(item.lat),
    lng: parseFloat(item.lon),
  }));
}
