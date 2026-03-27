"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase, SessionRow } from "@/lib/supabase";
import { formatDistance, formatDuration } from "@/lib/paceCalculator";

const ShareMap = dynamic(() => import("@/components/ShareMap"), { ssr: false });

const STATUS_LABEL: Record<string, string> = {
  onPace:        "余裕を持って到着できます",
  slightlyBehind:"急ぎ気味で行きましょう",
  behind:        "急いでください！",
  overdue:       "設定時刻を過ぎています",
};

const STATUS_BG: Record<string, string> = {
  onPace:        "bg-blue-500",
  slightlyBehind:"bg-yellow-400",
  behind:        "bg-red-500",
  overdue:       "bg-red-500",
};

export default function SharePage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [session, setSession] = useState<SessionRow | null>(null);
  const [notFound, setNotFound] = useState(false);

  // 初回取得
  useEffect(() => {
    supabase
      .from("sessions")
      .select("*")
      .eq("id", sessionId)
      .single()
      .then(({ data, error }) => {
        if (error || !data) { setNotFound(true); return; }
        setSession(data as SessionRow);
      });
  }, [sessionId]);

  // Realtime 購読
  useEffect(() => {
    const channel = supabase
      .channel(`session-${sessionId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "sessions", filter: `id=eq.${sessionId}` },
        (payload) => {
          if (payload.eventType === "DELETE") { setNotFound(true); return; }
          setSession(payload.new as SessionRow);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [sessionId]);

  if (notFound) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center bg-gray-100 gap-4">
        <p className="text-4xl">🚶</p>
        <p className="text-gray-600 font-medium">このセッションは終了しました</p>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-gray-100">
        <p className="text-gray-400 text-sm">読み込み中...</p>
      </div>
    );
  }

  const status = session.pace_status;
  const isDark = status !== "slightlyBehind";
  const tc = isDark ? "text-white" : "text-gray-800";

  return (
    <div className="fixed inset-0 flex flex-col">
      {/* 地図（上60%）*/}
      <div className="flex-[60]">
        <ShareMap
          currentPos={[session.lat, session.lng]}
          destination={
            session.dest_lat != null && session.dest_lng != null
              ? [session.dest_lat, session.dest_lng]
              : null
          }
        />
      </div>

      {/* ステータスパネル（下40%）*/}
      <div className={`flex-[40] flex flex-col px-5 pt-4 pb-8 gap-3 ${STATUS_BG[status]} transition-colors duration-500`}>
        <p className={`text-lg font-bold text-center ${tc}`}>
          🚶 {STATUS_LABEL[status] ?? status}
        </p>

        <div className="grid grid-cols-2 gap-2 mt-1">
          <Card label="残り距離" value={formatDistance(session.remaining_distance)} isDark={isDark} />
          <Card label="残り時間" value={formatDuration(session.remaining_minutes * 60)} isDark={isDark} />
        </div>

        <p className={`text-xs text-center mt-auto opacity-60 ${tc}`}>
          最終更新: {new Date(session.updated_at).toLocaleTimeString("ja-JP")}
        </p>
      </div>
    </div>
  );
}

function Card({ label, value, isDark }: { label: string; value: string; isDark: boolean }) {
  return (
    <div className={`${isDark ? "bg-white/15 text-white" : "bg-black/10 text-gray-800"} rounded-xl py-3 flex flex-col items-center`}>
      <span className="text-xs opacity-70">{label}</span>
      <span className="font-bold text-base">{value}</span>
    </div>
  );
}
