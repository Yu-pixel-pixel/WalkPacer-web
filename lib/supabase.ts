import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export const supabase = createClient(url, key);

export interface SessionRow {
  id: string;
  lat: number;
  lng: number;
  pace_status: string;
  remaining_distance: number;
  remaining_minutes: number;
  dest_lat: number | null;
  dest_lng: number | null;
  updated_at: string;
}
