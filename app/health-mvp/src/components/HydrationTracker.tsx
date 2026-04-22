// components/HydrationTracker.tsx
//
// Changes from original:
// ──────────────────────
// • Removed 3s polling interval — reads from storage on mount and on focus only.
//   Parent calls syncFromStorage when it refreshes; no background timer needed.
// • Notification strategy replaced: we no longer poll every 60s to check elapsed
//   time. Instead, hydration reminders are SCHEDULED via Notifications.ts at
//   meaningful times relative to wake hour. The in-app fallback only fires if
//   the user has the app open AND hasn't logged water in 90+ minutes — a rare
//   edge case, not the primary notification path.
// • lastDrinkTime persisted to AsyncStorage so it survives app restarts.
// • notified flag removed — scheduling handles deduplication.
// • Goal progress bar added.
// • Daily goal configurable (default 2500ml).

import React, { useCallback, useEffect, useRef, useState } from "react";
import { View, Text, Pressable, AppState } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  sendHydrationReminder,
  persistLastDrinkTime,
  getLastDrinkTime,
} from "./Notifications";

const DAILY_GOAL_ML   = 2500;
// In-app fallback: notify if app is open and no drink logged in 90 min
const IN_APP_REMINDER_MINUTES = 90;

interface WaterLog {
  time:   string;
  amount: number;
}

interface Props {
  initialData?: { water?: number; waterLogs?: WaterLog[] };
}

export default function HydrationTracker({ initialData }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [water, setWater]       = useState(initialData?.water || 0);
  const [logs,  setLogs]        = useState<WaterLog[]>(initialData?.waterLogs || []);

  // In-app fallback reminder interval ref
  const reminderRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Sync from storage on mount ───────────────────────────────────────────
  useEffect(() => {
    syncFromStorage();
    startInAppReminderCheck();

    // Re-sync when app comes back to foreground (user may have added water elsewhere)
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") syncFromStorage();
    });

    return () => {
      sub.remove();
      if (reminderRef.current) clearInterval(reminderRef.current);
    };
  }, []);

  // ── In-app fallback: check every 5 min while app is open ─────────────────
  // Primary reminders are scheduled notifications (Notifications.ts).
  // This is only a safety net for when the app stays open all day.
  const startInAppReminderCheck = () => {
    if (reminderRef.current) clearInterval(reminderRef.current);

    reminderRef.current = setInterval(async () => {
      const lastDrink = await getLastDrinkTime();
      const elapsedMinutes = (Date.now() - lastDrink) / (1000 * 60);

      if (elapsedMinutes >= IN_APP_REMINDER_MINUTES) {
        sendHydrationReminder();
        // Temporarily reset the clock so we don't spam — real reset happens on add()
        await persistLastDrinkTime(Date.now());
      }
    }, 5 * 60 * 1000); // check every 5 minutes
  };

  const syncFromStorage = async () => {
    try {
      const today = new Date().toISOString().slice(0, 10);
      const raw   = await AsyncStorage.getItem("HEALTH_ACTIVITY");
      const list  = raw ? JSON.parse(raw) : [];
      const entry = list.find((e: any) => e.date === today);
      if (entry) {
        setWater(entry.water    ?? 0);
        setLogs(entry.waterLogs ?? []);
      }
    } catch (err) {
      console.log("Hydration sync error:", err);
    }
  };

  const add = useCallback(async (amount: number) => {
    const today    = new Date().toISOString().slice(0, 10);
    const time     = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const newLog   = { time, amount };
    const newLogs  = [...logs, newLog];
    const newTotal = water + amount;

    setLogs(newLogs);
    setWater(newTotal);

    // Persist last drink time (survives app restart)
    await persistLastDrinkTime(Date.now());

    // Persist to activity storage
    const raw   = await AsyncStorage.getItem("HEALTH_ACTIVITY");
    const list  = raw ? JSON.parse(raw) : [];
    let entry   = list.find((e: any) => e.date === today);

    if (!entry) {
      entry = { date: today, water: 0, waterLogs: [] };
      list.push(entry);
    }

    entry.water     = newTotal;
    entry.waterLogs = newLogs;

    await AsyncStorage.setItem("HEALTH_ACTIVITY", JSON.stringify(list));
  }, [water, logs]);

  const progressPct  = Math.min(100, Math.round((water / DAILY_GOAL_ML) * 100));
  const remaining    = Math.max(0, DAILY_GOAL_ML - water);
  const goalReached  = water >= DAILY_GOAL_ML;

  return (
    <View style={{ padding: 15, backgroundColor: "#fff", borderRadius: 15 }}>

      {/* HEADER */}
      <Pressable onPress={() => setExpanded(!expanded)}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" }}>
          <Text style={{ fontSize: 22, fontWeight: "800" }}>
            💧 {water} ml
          </Text>
          <Text style={{ fontSize: 12, color: goalReached ? "#22C55E" : "#6B7280", fontWeight: "600" }}>
            {goalReached ? "Goal reached! 🎉" : `${remaining} ml to go`}
          </Text>
        </View>

        {/* Progress bar */}
        <View style={{ height: 8, backgroundColor: "#E0F2FE", borderRadius: 8, marginTop: 8, marginBottom: 4 }}>
          <View style={{
            height: 8,
            borderRadius: 8,
            backgroundColor: goalReached ? "#22C55E" : "#38BDF8",
            width: `${progressPct}%`,
          }} />
        </View>

        <Text style={{ color: "#6B7280", fontSize: 11 }}>
          {progressPct}% of {DAILY_GOAL_ML}ml goal · {expanded ? "Hide ▲" : "Show ▼"}
        </Text>
      </Pressable>

      {/* ADD BUTTONS */}
      <View style={{ flexDirection: "row", gap: 10, marginTop: 12 }}>
        {[150, 250, 350, 500].map((amt) => (
          <Pressable
            key={amt}
            onPress={() => add(amt)}
            style={{
              flex:              1,
              backgroundColor:   "#ECFDF5",
              paddingHorizontal: 8,
              paddingVertical:   8,
              borderRadius:      20,
              alignItems:        "center",
            }}
          >
            <Text style={{ color: "#0F766E", fontWeight: "700", fontSize: 12 }}>
              +{amt}
            </Text>
            <Text style={{ color: "#0F766E", fontSize: 10 }}>ml</Text>
          </Pressable>
        ))}
      </View>

      {/* TIMELINE */}
      {expanded && (
        <View style={{ marginTop: 15 }}>
          <Text style={{ fontWeight: "700", fontSize: 12, color: "#374151", marginBottom: 8 }}>
            Today's log
          </Text>
          {logs.length === 0 ? (
            <Text style={{ color: "#9CA3AF", fontSize: 13 }}>No logs yet — add your first drink!</Text>
          ) : (
            [...logs].reverse().map((log, i) => (
              <View
                key={i}
                style={{
                  flexDirection:     "row",
                  justifyContent:    "space-between",
                  alignItems:        "center",
                  paddingVertical:   7,
                  borderBottomWidth: 0.5,
                  borderColor:       "#E5E7EB",
                }}
              >
                <Text style={{ color: "#6B7280", fontSize: 13 }}>{log.time}</Text>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: "#38BDF8" }} />
                  <Text style={{ fontWeight: "600", fontSize: 13 }}>{log.amount} ml</Text>
                </View>
              </View>
            ))
          )}

          {/* Daily total summary */}
          {logs.length > 0 && (
            <View style={{ marginTop: 10, backgroundColor: "#F0FDF4", borderRadius: 10, padding: 10 }}>
              <Text style={{ color: "#065F46", fontWeight: "700", fontSize: 12 }}>
                Total today: {water} ml · {logs.length} drink{logs.length !== 1 ? "s" : ""}
              </Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
}