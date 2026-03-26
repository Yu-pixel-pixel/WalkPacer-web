// 徒歩特化: 快適ウォーク速度 (m/s)
export const WALK_NORMAL_SPEED_MS = 5 / 3.6; // 5 km/h

export interface RouteResult {
  totalDistance: number;      // メートル
  estimatedDuration: number;  // 秒
  coordinates: [number, number][];
}

// Valhalla エンコードポリライン6 デコーダー
function decodePolyline6(encoded: string): [number, number][] {
  const coords: [number, number][] = [];
  let index = 0, lat = 0, lng = 0;
  while (index < encoded.length) {
    let b, shift = 0, result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    lat += (result & 1) ? ~(result >> 1) : (result >> 1);
    shift = 0; result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    lng += (result & 1) ? ~(result >> 1) : (result >> 1);
    coords.push([lat / 1e6, lng / 1e6]);
  }
  return coords;
}

export async function fetchRoute(
  from: [number, number],
  to: [number, number]
): Promise<RouteResult> {
  const body = {
    locations: [
      { lon: from[1], lat: from[0] },
      { lon: to[1],   lat: to[0]   },
    ],
    costing: "pedestrian",
    costing_options: {
      pedestrian: {
        walking_speed: 5.0,    // km/h
        sidewalk_factor: 1.0,  // 歩道（幹線道路沿い）を通常通り評価
        walkway_factor: 0.9,   // 歩道専用路の優先度を少し下げ、幹線道路優先
        alley_factor: 2.0,     // 路地を避ける
        shortest: true,        // 最短距離ルートを優先
      },
    },
    directions_options: { units: "kilometers" },
  };

  const res = await fetch("https://valhalla.openstreetmap.de/route", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) throw new Error("経路の取得に失敗しました");
  const data = await res.json();

  if (!data.trip?.legs?.[0]) {
    throw new Error("経路が見つかりませんでした");
  }

  const leg = data.trip.legs[0];
  const summary = data.trip.summary;
  const coords = decodePolyline6(leg.shape);

  return {
    totalDistance: summary.length * 1000,  // km → m
    estimatedDuration: summary.time,        // 秒
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
