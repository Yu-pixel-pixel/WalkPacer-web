export type TransportMode = "foot" | "bike" | "car" | "train";

export const TRANSPORT_LABELS: Record<TransportMode, { label: string; icon: string }> = {
  foot:  { label: "徒歩", icon: "🚶" },
  bike:  { label: "自転車", icon: "🚴" },
  car:   { label: "車", icon: "🚗" },
  train: { label: "電車", icon: "🚃" },
};

// OSRM プロファイル名
const OSRM_PROFILE: Record<TransportMode, string> = {
  foot:  "foot",
  bike:  "bike",
  car:   "driving",
  train: "driving", // 電車は車ルートで代用（概算）
};

export interface RouteResult {
  totalDistance: number;
  coordinates: [number, number][];
}

export async function fetchRoute(
  from: [number, number],
  to: [number, number],
  mode: TransportMode = "foot"
): Promise<RouteResult> {
  const profile = OSRM_PROFILE[mode];
  const url =
    `https://router.project-osrm.org/route/v1/${profile}/` +
    `${from[1]},${from[0]};${to[1]},${to[0]}` +
    `?overview=full&geometries=geojson`;

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

  return { totalDistance: route.distance, coordinates: coords };
}

// 後方互換
export const fetchWalkingRoute = (
  from: [number, number],
  to: [number, number]
) => fetchRoute(from, to, "foot");

// Nominatim（OpenStreetMap）で場所検索
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

  const res = await fetch(url, {
    headers: { "User-Agent": "WalkPacer-Web/1.0" },
  });
  if (!res.ok) return [];

  const data = await res.json();
  return data.map((item: Record<string, string>) => ({
    name: item.name || item.display_name.split(",")[0],
    address: item.display_name,
    lat: parseFloat(item.lat),
    lng: parseFloat(item.lon),
  }));
}
