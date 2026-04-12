import React, { useEffect, useState } from "react";
import { View, Text, Pressable } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { sendHydrationReminder } from "./Notifications";

export default function HydrationTracker({ initialData }) {
  const [expanded, setExpanded] = useState(false);
  const [water, setWater]       = useState(initialData?.water || 0);
  const [logs, setLogs]         = useState(initialData?.waterLogs || []);
  const [lastDrinkTime, setLastDrinkTime] = useState(Date.now());

  // ── KEY FIX: sync from storage directly, never from initialData prop ──────
  // initialData comes from parent's state which resets on load().
  // Instead, always read the ground truth from AsyncStorage on mount
  // and after any parent refresh — this way hydration is never wiped.
  useEffect(() => {
    syncFromStorage();
  }, []);

  useEffect(() => {
  const interval = setInterval(() => {
    syncFromStorage();   // 🔥 keeps UI updated
  }, 3000); // every 3 sec

  return () => clearInterval(interval);
}, []);

const [notified, setNotified] = useState(false);

useEffect(() => {
  const interval = setInterval(() => {
    const now = Date.now();
    const diff = (now - lastDrinkTime) / (1000 * 60);

    if (diff >= 1 && !notified) {
      sendHydrationReminder();
      setNotified(true);
    }
  }, 60000);

  return () => clearInterval(interval);
}, [lastDrinkTime, notified]);

//   useEffect(() => {
//   const interval = setInterval(() => {
//     const now = Date.now();
//     const diff = (now - lastDrinkTime) / (1000 * 60); // minutes

//     if (diff >= 60) {  //  1.5 hours
//       sendHydrationReminder();
//     }
//   }, 60000); // check every 1 min

//   return () => clearInterval(interval);
// }, [lastDrinkTime]);


// useEffect(() => {
//   const sub = Notifications.addNotificationResponseReceivedListener(response => {
//     const action = response.actionIdentifier;

//     if (action === "ADD_150") add(150);
//     if (action === "ADD_250") add(250);
//   });

//   return () => sub.remove();
// }, []);

  const syncFromStorage = async () => {
    try {
      const today = new Date().toISOString().slice(0, 10);
      const raw   = await AsyncStorage.getItem("HEALTH_ACTIVITY");
      const list  = raw ? JSON.parse(raw) : [];
      const entry = list.find((e) => e.date === today);
      if (entry) {
        setWater(entry.water     ?? 0);
        setLogs(entry.waterLogs  ?? []);
      }
      // If no entry yet, keep existing state (don't wipe to 0)
    } catch (err) {
      console.log("Hydration sync error:", err);
    }
  };

  const add = async (amount: number) => {
    const today  = new Date().toISOString().slice(0, 10);
    const time   = new Date().toLocaleTimeString([], {
      hour:   "2-digit",
      minute: "2-digit",
    });

    const newLog  = { time, amount };
    const newLogs = [...logs, newLog];
    const newTotal = water + amount;

    setLogs(newLogs);
    setWater(newTotal);
    setLastDrinkTime(Date.now());
    setNotified(false);

    

    // Persist to storage
    const raw   = await AsyncStorage.getItem("HEALTH_ACTIVITY");
    const list  = raw ? JSON.parse(raw) : [];
    let entry   = list.find((e) => e.date === today);

    if (!entry) {
      entry = { date: today, water: 0, waterLogs: [] };
      list.push(entry);
    }

    entry.water     = newTotal;
    entry.waterLogs = newLogs;

    await AsyncStorage.setItem("HEALTH_ACTIVITY", JSON.stringify(list));
  };

  return (
    <View style={{ padding: 15, backgroundColor: "#fff", borderRadius: 15 }}>

      {/* HEADER */}
      <Pressable onPress={() => setExpanded(!expanded)}>
        <Text style={{ fontSize: 18, fontWeight: "800" }}>
          💧 {water} ml
        </Text>
        <Text style={{ color: "#6B7280" }}>
          {expanded ? "Hide details ▲" : "Show details ▼"}
        </Text>
      </Pressable>

      {/* ADD BUTTONS */}
      <View style={{ flexDirection: "row", gap: 10, marginTop: 10 }}>
        {[150, 250, 500].map((amt) => (
          <Pressable
            key={amt}
            onPress={() => add(amt)}
            style={{
              backgroundColor: "#ECFDF5",
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 20,
            }}
          >
            <Text style={{ color: "#0F766E", fontWeight: "700", fontSize: 13 }}>
              +{amt} ml
            </Text>
          </Pressable>
        ))}
      </View>

      {/* TIMELINE */}
      {expanded && (
        <View style={{ marginTop: 15 }}>
          {logs.length === 0 ? (
            <Text style={{ color: "#9CA3AF" }}>No logs yet</Text>
          ) : (
            logs.map((log, i) => (
              <View
                key={i}
                style={{
                  flexDirection:     "row",
                  justifyContent:    "space-between",
                  paddingVertical:   6,
                  borderBottomWidth: 0.5,
                  borderColor:       "#E5E7EB",
                }}
              >
                <Text style={{ color: "#6B7280" }}>{log.time}</Text>
                <Text style={{ fontWeight: "600" }}>{log.amount} ml</Text>
              </View>
            ))
          )}
        </View>
      )}
    </View>
  );
}