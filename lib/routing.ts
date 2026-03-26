// 徒歩特化: 快適ウォーク速度 (m/s)
export const WALK_NORMAL_SPEED_MS = 5 / 3.6; // 5 km/h

export interface RouteResult {
  totalDistance: number;      // メートル
  estimatedDuration: number;  // 秒
  coordinates: [number, number][];
}

export async function fetchRoute(
  from: [number, number],
  to: [number, number]
): Promise<RouteResult> {
  const url =
    `https://routing.openstreetmap.de/routed-foot/route/v1/foot/` +
    `${from[1]},${from[0]};${to[1]},${to[0]}?overview=full&geometries=geojson`;

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
    estimatedDuration: route.duration,
    coordinates: coords,
  };
}

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
