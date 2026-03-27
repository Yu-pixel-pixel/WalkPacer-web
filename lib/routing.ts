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

// Valhalla ルーティング（メイン）
async function fetchRouteValhalla(
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
        walking_speed: 5.0,
        walkway_factor: 0.9,
        alley_factor: 2.0,
        shortest: true,
      },
    },
    directions_options: { units: "kilometers" },
  };

  const res = await fetch("https://valhalla.openstreetmap.de/route", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) throw new Error("Valhalla error");
  const data = await res.json();
  if (!data.trip?.legs?.[0]) throw new Error("No route");

  const leg = data.trip.legs[0];
  const summary = data.trip.summary;
  return {
    totalDistance: summary.length * 1000,
    estimatedDuration: summary.time,
    coordinates: decodePolyline6(leg.shape),
  };
}

// OSRM ルーティング（フォールバック）
async function fetchRouteOSRM(
  from: [number, number],
  to: [number, number]
): Promise<RouteResult> {
  const url =
    `https://router.project-osrm.org/route/v1/foot/` +
    `${from[1]},${from[0]};${to[1]},${to[0]}?overview=full&geometries=geojson`;

  const res = await fetch(url);
  if (!res.ok) throw new Error("経路の取得に失敗しました");
  const data = await res.json();
  if (data.code !== "Ok" || !data.routes?.[0]) throw new Error("経路が見つかりませんでした");

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

// Valhalla を試みて失敗したら OSRM にフォールバック
export async function fetchRoute(
  from: [number, number],
  to: [number, number]
): Promise<RouteResult> {
  try {
    return await fetchRouteValhalla(from, to);
  } catch {
    return await fetchRouteOSRM(from, to);
  }
}

export interface SearchResult {
  name: string;
  address: string;
  lat: number;
  lng: number;
}
