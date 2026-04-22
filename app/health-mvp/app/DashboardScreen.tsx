// app/index.tsx (Dashboard)
//
// Key fixes from original:
// ────────────────────────
// • useRouter() was called OUTSIDE the component function (line ~47 in original)
//   alongside a module-level `const router = useRouter()` — this crashes.
//   Now there is exactly ONE router declaration, inside the component.
// • Notification scheduling integrated: after wake hour is detected,
//   scheduleHydrationReminders() and scheduleMoodCheckIn() are called once per day.
// • Notification response handler registered on mount for deep linking.

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View, Text, ScrollView, RefreshControl,
  Pressable, TextInput, TouchableOpacity,
} from "react-native";
import { useNavigation, useRouter, useFocusEffect } from "expo-router";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";
import { Pedometer } from "expo-sensors";
import { Ionicons } from "@expo/vector-icons";
import NetInfo from "@react-native-community/netinfo";

import { getMoodEntries } from "../src/storage/moodStorage";
import { getTodayActivity, saveMetric } from "../src/storage/activityStorage";
import HydrationTracker from "../src/components/HydrationTracker";
import StatsSection from "../src/components/StatsSection";
import DiseaseRiskSection from "../src/components/DiseaseRiskSection";
import SleepDetectionCard from "../src/components/SleepDetectionCard";
import { detectAndSaveWakeHour, getTodaySleepSummary } from "../src/storage/sleepDetection";
import {
  scheduleHydrationReminders,
  scheduleMoodCheckIn,
  registerNotificationResponseHandler,
  setupNotificationChannel,
} from "../src/components/Notifications";

const BASE_URL = "http://192.168.56.1:8000";
const API_URL  = "http://192.168.56.1:8000";

// ── Types ─────────────────────────────────────────────────────────────────────

interface MoodEntry {
  date:       string;
  finalMood?: string;
  predicted?: { cls?: string; conf?: number };
}

interface Breakdown {
  sleep?:     { avg: number; impact: number; weighted_impact: number };
  steps?:     { avg: number; impact: number; weighted_impact: number };
  sedentary?: { avg: number; impact: number; weighted_impact: number };
  water?:     { avg: number; impact: number; weighted_impact: number };
  mood?:      { dominant: string; impact: number; weighted_impact: number };
  food?:      { avg: number; impact: number; weighted_impact: number; ideal?: number; ratio?: number };
}

interface FoodData {
  food:       string;
  confidence: number;
  nutrition?: { calories?: number; protein?: number; carbs?: number; fat?: number };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const scoreColor = (s: number | null) => {
  if (s === null)  return "#9CA3AF";
  if (s < 40)      return "#EF4444";
  if (s < 65)      return "#F59E0B";
  return "#22C55E";
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function DashboardScreen() {
  const navigation = useNavigation();
  const router     = useRouter();   // ← single declaration, inside component

  const today = new Date().toISOString().slice(0, 10);

  // ── State ──────────────────────────────────────────────────────────────────
  const [isOnline,    setIsOnline]    = useState(true);
  const [entries,     setEntries]     = useState<MoodEntry[]>([]);
  const [activity,    setActivity]    = useState<any>({});
  const [refreshing,  setRefreshing]  = useState(false);
  const [isSaving,    setIsSaving]    = useState(false);

  const [sleep,       setSleep]       = useState("");
  const [sedentary,   setSedentary]   = useState("");
  const [steps,       setSteps]       = useState("");

  const [wellness,    setWellness]    = useState<number | null>(null);
  const [breakdown,   setBreakdown]   = useState<Breakdown>({});
  const [foodData,    setFoodData]    = useState<FoodData | null>(null);
  const [streak,      setStreak]      = useState<{
    current_streak: number; longest_streak: number; grace_used: boolean;
  } | null>(null);

  const [pedometerAvailable, setPedometerAvailable] = useState(false);
  const [isCountingLive,     setIsCountingLive]     = useState(false);

  // ── Setup: channels + notification deep-link handler ──────────────────────
  useEffect(() => {
    navigation.setOptions({ headerShown: false });
    setupNotificationChannel();

    const sub = registerNotificationResponseHandler(router);
    return () => sub.remove();
  }, []);

  // ── Network state ──────────────────────────────────────────────────────────
  useEffect(() => {
    const unsub = NetInfo.addEventListener((state) => setIsOnline(!!state.isConnected));
    return () => unsub();
  }, []);

  // ── Pedometer: history + live ──────────────────────────────────────────────
  const fetchTodaySteps = useCallback(async () => {
    const isAvailable = await Pedometer.isAvailableAsync();
    setPedometerAvailable(isAvailable);
    if (!isAvailable) return;

    const start = new Date(); start.setHours(0, 0, 0, 0);
    try {
      const result = await Pedometer.getStepCountAsync(start, new Date());
      if (result?.steps) {
        setSteps(result.steps.toString());
        await saveMetric(today, "steps", result.steps);
      }
    } catch (err) {
      console.log("Pedometer history error:", err);
    }
  }, [today]);

  useEffect(() => {
    let subscription: any;
    Pedometer.isAvailableAsync().then((available) => {
      if (!available) return;
      setIsCountingLive(true);
      subscription = Pedometer.watchStepCount(() => {
        const start = new Date(); start.setHours(0, 0, 0, 0);
        Pedometer.getStepCountAsync(start, new Date())
          .then((r) => { if (r?.steps) setSteps(r.steps.toString()); })
          .catch(() => {});
      });
    });
    return () => subscription?.remove();
  }, []);

  // ── Fetch functions ────────────────────────────────────────────────────────
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

  const fetchStreak = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) return;
      await axios.post(`${BASE_URL}/streak/login`, {}, { headers: { token } });
      const res = await axios.get(`${BASE_URL}/streak`, { headers: { token } });
      setStreak(res.data);
    } catch (err) {
      console.log("Streak fetch error:", err);
    }
  }, []);

  // ── Sensor auto-fill + notification scheduling ────────────────────────────
  const autoFillFromSensors = useCallback(async () => {
    const summary = await getTodaySleepSummary();
    if (summary?.hoursSlept) setSleep(summary.hoursSlept.toString());

    const wakeHour = await detectAndSaveWakeHour();

    // Schedule notifications now that we know when the user woke up
    // These are no-ops if already scheduled today
    scheduleHydrationReminders(wakeHour);
    scheduleMoodCheckIn(wakeHour);

    const isAvailable = await Pedometer.isAvailableAsync();
    if (!isAvailable) return;

    const now   = new Date();
    const start = new Date();
    start.setHours(wakeHour ?? 7, 0, 0, 0);

    const totalMinutes = Math.floor((now.getTime() - start.getTime()) / 60000);
    const windows      = Math.floor(totalMinutes / 30);
    if (windows <= 0) return;

    const checks = Array.from({ length: windows }, (_, i) => {
      const ws = new Date(start.getTime() + i * 30 * 60000);
      const we = new Date(ws.getTime() + 30 * 60000);
      return Pedometer.getStepCountAsync(ws, we);
    });

    try {
      const results = await Promise.all(checks);
      let sedentaryWindows = 0;
      results.forEach((r) => { if ((r?.steps ?? 0) < 100) sedentaryWindows++; });
      const sedentaryHours = parseFloat(((sedentaryWindows * 30) / 60).toFixed(1));
      setSedentary(sedentaryHours.toString());
      await saveMetric(today, "sedentary", sedentaryHours);
    } catch (err) {
      console.log("Sedentary estimation error:", err);
    }
  }, [today]);

  // ── Load ──────────────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    const mood = await getMoodEntries();
    const act  = await getTodayActivity();
    setEntries(mood);
    setActivity(act);

    const isAvailable = await Pedometer.isAvailableAsync();
    if (!isAvailable) setSteps(act.steps?.toString() || "");
    setSleep(act.sleep?.toString() || "");
    setSedentary(act.sedentary?.toString() || "");
  }, []);

  useFocusEffect(useCallback(() => {
    load().then(async () => {
      fetchTodaySteps();
      await autoFillFromSensors();
    });
    fetchWellness();
    fetchStreak();
  }, [load, fetchWellness, fetchStreak, fetchTodaySteps, autoFillFromSensors]));

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    await fetchWellness();
    fetchTodaySteps();
    await autoFillFromSensors();
    setRefreshing(false);
  };

  // ── Food detection ─────────────────────────────────────────────────────────
  const captureFood = async (mealType: "breakfast" | "lunch" | "dinner" | "snacks") => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 1,
    });
    if (!result.canceled && result.assets?.length) {
      const uri = result.assets[0].uri;
      try {
        const data = await predictFood(uri);
        setFoodData(data);
        await saveFood(mealType, data);
      } catch (err) {
        console.log("Food API error:", err);
        alert("Food detection failed ❌");
      }
    }
  };

  const predictFood = async (imageUri: string): Promise<FoodData> => {
    const response = await fetch(imageUri);
    const blob     = await response.blob();
    const formData = new FormData();
    formData.append("image", blob, "food.jpg");
    const res = await axios.post(`${API_URL}/predict-food`, formData);
    return res.data;
  };

  const saveFood = async (mealType: string, data: FoodData) => {
    const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const raw  = await AsyncStorage.getItem("HEALTH_ACTIVITY");
    const list = raw ? JSON.parse(raw) : [];
    let entry  = list.find((e: any) => e.date === today);
    if (!entry) {
      entry = { date: today, meals: { breakfast: [], lunch: [], dinner: [], snacks: [] } };
      list.push(entry);
    }
    entry.meals[mealType].push({ ...data, time });
    await AsyncStorage.setItem("HEALTH_ACTIVITY", JSON.stringify(list));
  };

  // ── Process day ───────────────────────────────────────────────────────────
  const todayEntry = entries.find((e) => e.date === today);
  const moodText   = todayEntry?.finalMood || todayEntry?.predicted?.cls;

  const processDay = async () => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      await saveMetric(today, "steps",     parseInt(steps)     || 0);
      await saveMetric(today, "sleep",     parseFloat(sleep)   || 0);
      await saveMetric(today, "sedentary", parseFloat(sedentary) || 0);

      const act   = await getTodayActivity();
      const token = await AsyncStorage.getItem("token");
      if (!token) { alert("Not logged in — saved locally only"); return; }
      if (!isOnline) { alert("📴 Saved locally — will sync when back online"); return; }

      const res = await axios.post(`${BASE_URL}/activity`, {
        date:       today,
        steps:      parseInt(steps)       || 0,
        sleep:      parseFloat(sleep)     || 0,
        sedentary:  parseFloat(sedentary) || 0,
        water:      act?.water            || 0,
        water_logs: act?.waterLogs        || [],
        mood:       moodText              || null,
        meals:      activity?.meals       ?? {},
      }, { headers: { token } });

      if (res.data.wellness !== undefined) {
        setWellness(res.data.wellness);
        setBreakdown(res.data.breakdown ?? {});
      }

      const mood = await getMoodEntries();
      setEntries(mood);
      alert("Day processed ✅");
    } catch (err: any) {
      console.log("❌ Sync error:", err?.response?.data || err.message);
      alert("Saved locally but failed to sync ❌");
    } finally {
      setIsSaving(false);
    }
  };

  const color = scoreColor(wellness);

  const totalCalories = (() => {
    if (!activity?.meals) return 0;
    let total = 0;
    (["breakfast", "lunch", "dinner", "snacks"] as const).forEach((meal) => {
      activity.meals[meal]?.forEach((item: any) => { total += item?.nutrition?.calories || 0; });
    });
    return total;
  })();

  // ── Render ────────────────────────────────────────────────────────────────
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

      {/* OFFLINE BANNER */}
      {!isOnline && (
        <View style={styles.offlineBanner}>
          <Ionicons name="cloud-offline-outline" size={20} color="#F59E0B" />
          <View>
            <Text style={{ fontWeight: "800", fontSize: 13, color: "#92400E" }}>You're offline</Text>
            <Text style={{ fontSize: 11, color: "#92400E", marginTop: 2 }}>
              Tracking locally — will sync when reconnected.
            </Text>
          </View>
        </View>
      )}

      {/* WELLNESS SCORE */}
      <View style={styles.card}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <Text style={styles.title}>Wellness Score</Text>
          <Text style={{ fontSize: 32, fontWeight: "900", color }}>
            {wellness !== null ? wellness : "--"}
          </Text>
        </View>
        <View style={styles.barBg}>
          <View style={[styles.barFill, { width: `${wellness || 0}%`, backgroundColor: color }]} />
        </View>
        {Object.keys(breakdown).length > 0 && (
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 12 }}>
            {breakdown.sleep     && <BreakdownPill label="Sleep"     value={`${breakdown.sleep.avg}h`}     impact={breakdown.sleep.impact}     color="#6366F1" />}
            {breakdown.steps     && <BreakdownPill label="Steps"     value={`${breakdown.steps.avg}`}      impact={breakdown.steps.impact}     color="#2a8c82" />}
            {breakdown.sedentary && <BreakdownPill label="Sedentary" value={`${breakdown.sedentary.avg}h`} impact={breakdown.sedentary.impact} color="#F59E0B" />}
            {breakdown.water     && <BreakdownPill label="Water"     value={`${breakdown.water.avg}ml`}    impact={breakdown.water.impact}     color="#38BDF8" />}
            {breakdown.mood      && <BreakdownPill label="Mood"      value={breakdown.mood.dominant ?? "—"} impact={breakdown.mood.impact}     color="#A78BFA" />}
            {breakdown.food      && (
              <BreakdownPill
                label="Food"
                value={breakdown.food.ratio ? `${breakdown.food.ratio}× TDEE` : `${breakdown.food.avg} kcal`}
                impact={breakdown.food.impact}
                color="#EF4444"
              />
            )}
          </View>
        )}
        <Text style={{ fontSize: 11, color: "#9CA3AF", marginTop: 8 }}>
          Based on your last 28 days · updates on process
        </Text>
      </View>

      {/* STREAK */}
      {streak !== null && (
        <View style={{ ...styles.card, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <View>
            <Text style={styles.title}>Daily Streak 🔥</Text>
            <Text style={{ fontSize: 11, color: "#9CA3AF" }}>
              {streak.grace_used ? "⚠️ Grace day active" : "Keep it going!"}
            </Text>
          </View>
          <View style={{ flexDirection: "row", gap: 20, alignItems: "center" }}>
            <View style={{ alignItems: "center" }}>
              <Text style={{ fontSize: 28, fontWeight: "900", color: "#F59E0B" }}>{streak.current_streak}</Text>
              <Text style={{ fontSize: 10, color: "#6B7280" }}>Current</Text>
            </View>
            <View style={{ width: 1, height: 36, backgroundColor: "#E5E7EB" }} />
            <View style={{ alignItems: "center" }}>
              <Text style={{ fontSize: 28, fontWeight: "900", color: "#2a8c82" }}>{streak.longest_streak}</Text>
              <Text style={{ fontSize: 10, color: "#6B7280" }}>Best</Text>
            </View>
          </View>
        </View>
      )}

      <SleepDetectionCard />

      {/* HYDRATION */}
      <View style={styles.card}>
        <Text style={styles.title}>Hydration</Text>
        <HydrationTracker initialData={activity} />
      </View>

      {/* INPUT GRID */}
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
        <InputCard title="Steps">
          <TextInput value={steps} onChangeText={setSteps} keyboardType="numeric" style={styles.input} />
          <Text style={{ fontSize: 10, color: isCountingLive ? "#22C55E" : "#9CA3AF", marginTop: 4 }}>
            {isCountingLive ? "🟢 Live pedometer" : pedometerAvailable ? "📱 Health history" : "⚠️ Enter manually"}
          </Text>
        </InputCard>

        <InputCard title="Sleep (hrs)">
          <TextInput value={sleep} onChangeText={setSleep} keyboardType="numeric" style={styles.input} />
          <Text style={{ fontSize: 10, color: pedometerAvailable ? "#22C55E" : "#9CA3AF", marginTop: 4 }}>
            {pedometerAvailable ? "😴 Auto-detected · editable" : "😴 Enter manually"}
          </Text>
        </InputCard>

        <InputCard title="Sedentary (hrs)">
          <TextInput value={sedentary} onChangeText={setSedentary} keyboardType="numeric" style={styles.input} />
          <Text style={{ fontSize: 10, color: pedometerAvailable ? "#22C55E" : "#9CA3AF", marginTop: 4 }}>
            {pedometerAvailable ? "🪑 Auto-estimated · editable" : "🪑 Enter manually"}
          </Text>
        </InputCard>

        {/* MOOD */}
        <InputCard title="Mood">
          {moodText ? (
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <Text style={{ fontWeight: "700", fontSize: 13 }}>{moodText}</Text>
              <TouchableOpacity
                onPress={() => router.push("/mood")}
                style={{ flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: "#F3F4F6", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20 }}
              >
                <Ionicons name="pencil" size={11} color="#6B7280" />
                <Text style={{ fontSize: 11, color: "#6B7280", fontWeight: "600" }}>Edit</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <Pressable onPress={() => router.push("/mood")} style={styles.smallBtn}>
              <Text style={{ color: "#fff", fontWeight: "700" }}>Capture</Text>
            </Pressable>
          )}
        </InputCard>
      </View>

      {/* FOOD */}
      <InputCard title="Food">
        <TouchableOpacity onPress={() => router.push("/food")} style={{ backgroundColor: "#2a8c82", padding: 14, borderRadius: 12 }}>
          <Text style={{ color: "#fff", textAlign: "center", fontWeight: "700" }}>Add Food 🍔</Text>
        </TouchableOpacity>
        {totalCalories > 0 && (
          <Text style={{ fontSize: 11, color: "#6B7280", marginTop: 6, textAlign: "center" }}>
            {totalCalories} kcal logged today
          </Text>
        )}
      </InputCard>

      {/* PROCESS */}
      <Pressable onPress={processDay} disabled={isSaving} style={[styles.mainButton, isSaving && { opacity: 0.6 }]}>
        <Text style={{ color: "#fff", fontWeight: "800" }}>
          {isSaving ? "Saving..." : "Process Today"}
        </Text>
      </Pressable>

      <Pressable onPress={() => router.push("/analysis")} style={[styles.mainButton, { backgroundColor: "#6366F1", marginTop: 10 }]}>
        <Text style={{ color: "#fff", fontWeight: "800" }}>🧠 View AI Analysis</Text>
      </Pressable>

      <StatsSection />
      <DiseaseRiskSection />
    </ScrollView>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function InputCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.inputCard}>
      <Text style={{ fontWeight: "700", marginBottom: 6 }}>{title}</Text>
      {children}
    </View>
  );
}

function BreakdownPill({ label, value, impact, color }: {
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

const styles = {
  card:         { backgroundColor: "#fff", padding: 16, borderRadius: 16, marginBottom: 15 },
  title:        { fontWeight: "800" as const, fontSize: 15, marginBottom: 4 },
  barBg:        { height: 10, backgroundColor: "#E5E7EB", borderRadius: 10 },
  barFill:      { height: 10, borderRadius: 10 },
  inputCard:    { width: "48%", backgroundColor: "#fff", padding: 14, borderRadius: 14, marginBottom: 10 },
  input:        { backgroundColor: "#F3F4F6", borderRadius: 10, padding: 10 },
  mainButton:   { marginTop: 20, backgroundColor: "#2a8c82", padding: 16, borderRadius: 14, alignItems: "center" as const },
  smallBtn:     { backgroundColor: "#2a8c82", padding: 8, borderRadius: 10, alignItems: "center" as const },
  offlineBanner: {
    backgroundColor: "#FEF3C7", borderRadius: 12, padding: 12, marginBottom: 12,
    flexDirection: "row" as const, alignItems: "center" as const, gap: 8,
    borderLeftWidth: 4, borderLeftColor: "#F59E0B",
  },
};