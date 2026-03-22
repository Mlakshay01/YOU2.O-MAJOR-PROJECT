import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  Pressable,
  TextInput,
} from "react-native";

import { useNavigation, useRouter, useFocusEffect } from "expo-router";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { getMoodEntries } from "../src/storage/moodStorage";
import { getTodayActivity, saveMetric } from "../src/storage/activityStorage";
import HydrationTracker from "../src/components/HydrationTracker";
import StatsSection from "../src/components/StatsSection";
import DiseaseRiskSection from "@/src/components/DiseaseRiskSection";

import { Ionicons } from "@expo/vector-icons";
import { TouchableOpacity } from "react-native";

const BASE_URL = "http://localhost:8000";

interface MoodEntry {
  date: string;
  finalMood?: string;
  predicted?: { cls?: string; conf?: number };
}

interface Breakdown {
  sleep?:     { avg: number; impact: number; weighted_impact: number };
  steps?:     { avg: number; impact: number; weighted_impact: number };
  sedentary?: { avg: number; impact: number; weighted_impact: number };
  water?:     { avg: number; impact: number; weighted_impact: number };
  mood?:      { dominant: string; impact: number; weighted_impact: number };
}

const scoreColor = (s: number | null) => {
  if (s === null) return "#9CA3AF";
  if (s < 40) return "#EF4444";
  if (s < 65) return "#F59E0B";
  return "#22C55E";
};

export default function DashboardScreen() {
  const navigation = useNavigation();
  const router     = useRouter();

  useEffect(() => { navigation.setOptions({ headerShown: false }); }, []);

  const [entries, setEntries]       = useState<MoodEntry[]>([]);
  const [activity, setActivity]     = useState<any>({});
  const [refreshing, setRefreshing] = useState(false);
  const [isSaving, setIsSaving]     = useState(false);

  const [steps, setSteps]           = useState("");
  const [sleep, setSleep]           = useState("");
  const [sedentary, setSedentary]   = useState("");

  const [wellness, setWellness]     = useState<number | null>(null);
  const [breakdown, setBreakdown]   = useState<Breakdown>({});

  const fetchWellness = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) return;
      const res = await axios.get(`${BASE_URL}/wellness`, { headers: { token } });
      setWellness(res.data.score ?? null);
      setBreakdown(res.data.breakdown ?? {});
    } catch (err) {
      console.log("Wellness fetch error:", err);
    }
  }, []);

  const load = useCallback(async () => {
    const mood = await getMoodEntries();
    const act  = await getTodayActivity();
    setEntries(mood);
    setActivity(act);
    setSteps(act.steps?.toString() || "");
    setSleep(act.sleep?.toString() || "");
    setSedentary(act.sedentary?.toString() || "");
  }, []);

  useFocusEffect(useCallback(() => {
    load();
    fetchWellness();
  }, [load, fetchWellness]));

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([load(), fetchWellness()]);
    setRefreshing(false);
  };

  const today      = new Date().toISOString().slice(0, 10);
  const todayEntry = entries.find((e) => e.date === today);
  const moodText   = todayEntry?.finalMood || todayEntry?.predicted?.cls;

  const processDay = async () => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      // 1. Save steps/sleep/sedentary locally
      await saveMetric(today, "steps",     parseInt(steps) || 0);
      await saveMetric(today, "sleep",     parseFloat(sleep) || 0);
      await saveMetric(today, "sedentary", parseFloat(sedentary) || 0);

      // 2. Read today's full activity (includes hydration saved by HydrationTracker)
      const act   = await getTodayActivity();
      const token = await AsyncStorage.getItem("token");
      if (!token) { alert("Not logged in — saved locally only"); return; }

      // 3. POST to backend
      const res = await axios.post(`${BASE_URL}/activity`, {
        date:       today,
        steps:      parseInt(steps) || 0,
        sleep:      parseFloat(sleep) || 0,
        sedentary:  parseFloat(sedentary) || 0,
        water:      act?.water || 0,
        water_logs: act?.waterLogs || [],
        mood:       moodText || null,
      }, { headers: { token } });

      // 4. Update wellness score from response — NO load() call here
      //    load() would re-seed HydrationTracker with storage data and
      //    risk a timing issue where stale data overwrites current state
      if (res.data.wellness !== undefined) {
        setWellness(res.data.wellness);
        setBreakdown(res.data.breakdown ?? {});
      }

      // 5. Only refresh mood entries (not activity — avoids hydration reset)
      const mood = await getMoodEntries();
      setEntries(mood);

      alert("Day processed ✅");
    } catch (err: any) {
      console.log("❌ Sync error:", err?.response?.data || err.message);
      alert("Saved locally but failed to sync to server ❌");
    } finally {
      setIsSaving(false);
    }
  };

  const color = scoreColor(wellness);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: "#F2F4F7" }}
      contentContainerStyle={{ padding: 16 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* HEADER */}
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <View>
          <Text style={{ fontSize: 26, fontWeight: "800" }}>Dashboard</Text>
          <Text style={{ color: "#6B7280" }}>{today}</Text>
        </View>
        <TouchableOpacity onPress={() => router.push("/profile")}>
          <Ionicons name="person-circle-outline" size={40} color="#2a8c82" />
        </TouchableOpacity>
      </View>

      {/* WELLNESS SCORE CARD */}
      <View style={card}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <Text style={title}>Wellness Score</Text>
          <Text style={{ fontSize: 32, fontWeight: "900", color }}>
            {wellness !== null ? wellness : "--"}
          </Text>
        </View>
        <View style={barBg}>
          <View style={[barFill, { width: `${wellness || 0}%`, backgroundColor: color }]} />
        </View>
        {Object.keys(breakdown).length > 0 && (
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 12 }}>
            {breakdown.sleep && (
              <BreakdownPill label="Sleep" value={`${breakdown.sleep.avg}h`} impact={breakdown.sleep.impact} color="#6366F1" />
            )}
            {breakdown.steps && (
              <BreakdownPill label="Steps" value={`${breakdown.steps.avg}`} impact={breakdown.steps.impact} color="#2a8c82" />
            )}
            {breakdown.sedentary && (
              <BreakdownPill label="Sedentary" value={`${breakdown.sedentary.avg}h`} impact={breakdown.sedentary.impact} color="#F59E0B" />
            )}
            {breakdown.water && (
              <BreakdownPill label="Water" value={`${breakdown.water.avg}ml`} impact={breakdown.water.impact} color="#38BDF8" />
            )}
            {breakdown.mood && (
              <BreakdownPill label="Mood" value={breakdown.mood.dominant ?? "—"} impact={breakdown.mood.impact} color="#A78BFA" />
            )}
          </View>
        )}
        <Text style={{ fontSize: 11, color: "#9CA3AF", marginTop: 8 }}>
          Based on your last 28 days · updates on process
        </Text>
      </View>

      {/* HYDRATION */}
      <View style={card}>
        <Text style={title}>Hydration</Text>
        <HydrationTracker initialData={activity} />
      </View>

      {/* INPUT GRID */}
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
        <InputCard title="Steps">
          <TextInput value={steps} onChangeText={setSteps} keyboardType="numeric" style={input} />
        </InputCard>
        <InputCard title="Sleep (hrs)">
          <TextInput value={sleep} onChangeText={setSleep} keyboardType="numeric" style={input} />
        </InputCard>
        <InputCard title="Sedentary (hrs)">
          <TextInput value={sedentary} onChangeText={setSedentary} keyboardType="numeric" style={input} />
        </InputCard>

        {/* MOOD CARD — with edit button */}
        <InputCard title="Mood">
          {moodText ? (
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <Text style={{ fontWeight: "700", fontSize: 13 }}>{moodText}</Text>
              <TouchableOpacity
                onPress={() => router.push("/mood")}
                style={{
                  flexDirection:  "row",
                  alignItems:     "center",
                  gap:            3,
                  backgroundColor: "#F3F4F6",
                  paddingHorizontal: 8,
                  paddingVertical:   4,
                  borderRadius:   20,
                }}
              >
                <Ionicons name="pencil" size={11} color="#6B7280" />
                <Text style={{ fontSize: 11, color: "#6B7280", fontWeight: "600" }}>Edit</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <Pressable onPress={() => router.push("/mood")} style={buttonSmall}>
              <Text style={{ color: "#fff" }}>Capture</Text>
            </Pressable>
          )}
        </InputCard>
      </View>

      {/* PROCESS BUTTON */}
      <Pressable
        onPress={processDay}
        disabled={isSaving}
        style={[mainButton, isSaving && { opacity: 0.6 }]}
      >
        <Text style={{ color: "#fff", fontWeight: "800" }}>
          {isSaving ? "Saving..." : "Process Today"}
        </Text>
      </Pressable>

      {/* STATS + RISK SECTIONS */}
      <StatsSection />
      <DiseaseRiskSection />

    </ScrollView>
  );
}

// ── Small components ──────────────────────────────────────────────────────────

function InputCard({ title, children }: any) {
  return (
    <View style={inputCard}>
      <Text style={{ fontWeight: "700", marginBottom: 6 }}>{title}</Text>
      {children}
    </View>
  );
}

function BreakdownPill({
  label, value, impact, color,
}: {
  label: string; value: string; impact: number; color: string;
}) {
  const arrow     = impact >= 0.15 ? "↑" : impact <= -0.15 ? "↓" : "→";
  const impactClr = impact >= 0.15 ? "#22C55E" : impact <= -0.15 ? "#EF4444" : "#9CA3AF";
  return (
    <View style={{ backgroundColor: "#F9FAFB", borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5, flexDirection: "row", gap: 4, alignItems: "center" }}>
      <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: color }} />
      <Text style={{ fontSize: 11, color: "#6B7280" }}>{label}: </Text>
      <Text style={{ fontSize: 11, fontWeight: "700", color: "#111827" }}>{value}</Text>
      <Text style={{ fontSize: 11, fontWeight: "800", color: impactClr }}>{arrow}</Text>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const card        = { backgroundColor: "#fff", padding: 16, borderRadius: 16, marginBottom: 15 };
const title       = { fontWeight: "800" as const, fontSize: 15, marginBottom: 4 };
const barBg       = { height: 10, backgroundColor: "#E5E7EB", borderRadius: 10 };
const barFill     = { height: 10, borderRadius: 10 };
const inputCard   = { width: "48%", backgroundColor: "#fff", padding: 14, borderRadius: 14 };
const input       = { backgroundColor: "#F3F4F6", borderRadius: 10, padding: 10 };
const mainButton  = { marginTop: 20, backgroundColor: "#2a8c82", padding: 16, borderRadius: 14, alignItems: "center" as const };
const buttonSmall = { backgroundColor: "#2a8c82", padding: 8, borderRadius: 10 };