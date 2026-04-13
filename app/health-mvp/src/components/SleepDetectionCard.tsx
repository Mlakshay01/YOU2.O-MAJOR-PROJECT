import React, { useEffect, useState } from "react";
import { View, Text } from "react-native";
import { getTodaySleepSummary } from "../storage/sleepDetection";

interface SleepSummary {
  wakeTime: string;
  sleepTime: string;
  hoursSlept: number | null;
}

export default function SleepDetectionCard() {
  const [sleepSummary, setSleepSummary] = useState<SleepSummary | null>(null);

  useEffect(() => {
    getTodaySleepSummary().then(setSleepSummary);
  }, []);

  if (!sleepSummary) return null;

  return (
    <View style={card}>
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <View>
          <Text style={title}>Sleep Detection 😴</Text>
          <Text style={{ fontSize: 11, color: "#9CA3AF" }}>
            Auto-detected · accelerometer
          </Text>
        </View>
        <View style={{ flexDirection: "row", gap: 20, alignItems: "center" }}>
          <View style={{ alignItems: "center" }}>
            <Text style={{ fontSize: 16, fontWeight: "900", color: "#6366F1" }}>
              {sleepSummary.sleepTime}
            </Text>
            <Text style={{ fontSize: 10, color: "#6B7280" }}>Slept</Text>
          </View>

          <View style={{ width: 1, height: 36, backgroundColor: "#E5E7EB" }} />

          <View style={{ alignItems: "center" }}>
            <Text style={{ fontSize: 16, fontWeight: "900", color: "#2a8c82" }}>
              {sleepSummary.wakeTime}
            </Text>
            <Text style={{ fontSize: 10, color: "#6B7280" }}>Woke</Text>
          </View>

          {sleepSummary.hoursSlept && (
            <>
              <View style={{ width: 1, height: 36, backgroundColor: "#E5E7EB" }} />
              <View style={{ alignItems: "center" }}>
                <Text style={{ fontSize: 16, fontWeight: "900", color: "#F59E0B" }}>
                  {sleepSummary.hoursSlept}h
                </Text>
                <Text style={{ fontSize: 10, color: "#6B7280" }}>Duration</Text>
              </View>
            </>
          )}
        </View>
      </View>
    </View>
  );
}

const card  = { backgroundColor: "#fff", padding: 16, borderRadius: 16, marginBottom: 15 };
const title = { fontWeight: "800" as const, fontSize: 15, marginBottom: 4 };