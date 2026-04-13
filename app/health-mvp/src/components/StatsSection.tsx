import React, { useCallback, useRef, useState } from "react";
import {
  View,
  Text,
  Pressable,
  Dimensions,
  ActivityIndicator,
  Animated,
} from "react-native";
import { useFocusEffect } from "expo-router";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { BarChart, LineChart } from "react-native-chart-kit";
import { Ionicons } from "@expo/vector-icons";

const BASE_URL    = "http://192.168.56.1:8000";
const SCREEN_WIDTH = Dimensions.get("window").width;

interface DayStat {
  date:      string;
  steps:     number | null;
  sleep:     number | null;
  sedentary: number | null;
  water:     number | null;
  mood:      string | null;
  calories: number | null;
}

const MOOD_COLORS: Record<string, string> = {
  happy:     "#4ADE80",
  neutral:   "#FBBF24",
  sad:       "#60A5FA",
  angry:     "#F87171",
  fear:      "#FB923C",
  disgust:   "#A78BFA",
  surprised: "#34D399",
};

type MetricKey = keyof Omit<DayStat, "date" | "mood">;

export default function StatsSection() {
  const [statsRange, setStatsRange] = useState<7 | 28>(7);
  const [stats, setStats]           = useState<DayStat[]>([]);
  const [loading, setLoading]       = useState(false);

  // Spin animation for refresh icon
  const spinValue = useRef(new Animated.Value(0)).current;

  const startSpin = () => {
    spinValue.setValue(0);
    Animated.timing(spinValue, {
      toValue:         1,
      duration:        600,
      useNativeDriver: true,
    }).start();
  };

  const spin = spinValue.interpolate({
    inputRange:  [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  const loadStats = useCallback(async (days: 7 | 28) => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) return;
      const res = await axios.get(`${BASE_URL}/activity/stats?days=${days}`, {
        headers: { token },
      });
      setStats(res.data.data);
    } catch (err: any) {
      console.log("Stats error:", err?.response?.data || err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadStats(statsRange);
    }, [loadStats, statsRange])
  );

  const handleRangeChange = (days: 7 | 28) => {
    setStatsRange(days);
    loadStats(days);
  };

  const handleRefresh = () => {
    startSpin();
    loadStats(statsRange);
  };

  // ── Helpers ────────────────────────────────────────────────────

  const avg = (key: MetricKey): string => {
    const valid = stats.filter((d) => d[key] !== null && d[key] !== undefined);
    if (!valid.length) return "--";
    const total = valid.reduce((sum, d) => sum + (d[key] as number), 0);
    return (total / valid.length).toFixed(1);
  };

  const shortLabel = (dateStr: string) => {
    const d = new Date(dateStr);
    if (statsRange === 7)
      return ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][d.getDay()];
    const idx = stats.findIndex((s) => s.date === dateStr);
    return idx % 7 === 0 ? `${d.getDate()}/${d.getMonth() + 1}` : "";
  };

  const chartValues = (key: MetricKey): number[] =>
    stats.map((d) => (d[key] !== null && d[key] !== undefined ? (d[key] as number) : 0));

  const makeChartData = (key: MetricKey) => ({
    labels:   stats.map((d) => shortLabel(d.date)),
    datasets: [{ data: chartValues(key) }],
  });

  // ── Chart configs ──────────────────────────────────────────────

  const barConfig = (color: string) => ({
    backgroundGradientFrom: "#ffffff",
    backgroundGradientTo:   "#ffffff",
    decimalPlaces: 0,
    color: (opacity = 1) =>
      `${color}${Math.round(opacity * 255).toString(16).padStart(2, "0")}`,
    labelColor: () => "#9CA3AF",
    barPercentage: 0.65,
    propsForBackgroundLines: { stroke: "#F3F4F6" },
  });

  const lineConfig = (color: string) => ({
    backgroundGradientFrom: "#ffffff",
    backgroundGradientTo:   "#ffffff",
    decimalPlaces: 0,
    color: (opacity = 1) =>
      `${color}${Math.round(opacity * 255).toString(16).padStart(2, "0")}`,
    labelColor: () => "#9CA3AF",
    propsForBackgroundLines: { stroke: "#F3F4F6" },
    propsForDots: { r: "3" },
  });

  // ── MetricChart ────────────────────────────────────────────────
  const MetricChart = ({
    title,
    dataKey,
    unit,
    color,
  }: {
    title:   string;
    dataKey: MetricKey;
    unit:    string;
    color:   string;
  }) => {
    const data   = makeChartData(dataKey);
    const avgVal = avg(dataKey);
    const is28   = statsRange === 28;

    return (
      <View style={card}>
        <View style={rowBetween}>
          <Text style={cardTitle}>{title}</Text>
          <Text style={avgText}>
            Avg:{" "}
            <Text style={{ color, fontWeight: "700" }}>
              {avgVal} {avgVal !== "--" ? unit : ""}
            </Text>
          </Text>
        </View>

        {is28 ? (
          <LineChart
            data={data}
            width={SCREEN_WIDTH - 64}
            height={160}
            yAxisLabel=""
            yAxisSuffix=""
            chartConfig={lineConfig(color)}
            style={{ borderRadius: 12, marginTop: 8 }}
            withInnerLines={false}
            withDots
            bezier
            fromZero
          />
        ) : (
          <BarChart
            data={data}
            width={SCREEN_WIDTH - 64}
            height={160}
            yAxisLabel=""
            yAxisSuffix=""
            chartConfig={barConfig(color)}
            style={{ borderRadius: 12, marginTop: 8 }}
            showValuesOnTopOfBars
            withInnerLines={false}
            fromZero
          />
        )}
      </View>
    );
  };

  // ── Mood dots ──────────────────────────────────────────────────
  const MoodDots = () => {
    const moodCounts: Record<string, number> = {};
    stats.forEach((d) => {
      if (d.mood) moodCounts[d.mood] = (moodCounts[d.mood] || 0) + 1;
    });
    const dominant = Object.entries(moodCounts).sort((a, b) => b[1] - a[1])[0]?.[0];
    const dotSize  = statsRange === 7 ? 28 : 18;
    const cellW    = statsRange === 7 ? 36 : 24;

    return (
      <View style={card}>
        <View style={rowBetween}>
          <Text style={cardTitle}>Mood</Text>
          {dominant && (
            <Text style={avgText}>
              Most:{" "}
              <Text style={{ color: MOOD_COLORS[dominant] ?? "#6B7280", fontWeight: "700" }}>
                {dominant}
              </Text>
            </Text>
          )}
        </View>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 4, marginTop: 10 }}>
          {stats.map((d) => (
            <View key={d.date} style={{ alignItems: "center", width: cellW }}>
              <View
                style={{
                  width:           dotSize,
                  height:          dotSize,
                  borderRadius:    dotSize / 2,
                  backgroundColor: d.mood ? (MOOD_COLORS[d.mood] ?? "#E5E7EB") : "#E5E7EB",
                }}
              />
              {statsRange === 7 && (
                <Text style={{ fontSize: 9, color: "#9CA3AF", marginTop: 2 }}>
                  {shortLabel(d.date)}
                </Text>
              )}
            </View>
          ))}
        </View>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
          {Object.entries(MOOD_COLORS).map(([mood, color]) => (
            <View key={mood} style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
              <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: color }} />
              <Text style={{ fontSize: 11, color: "#6B7280" }}>{mood}</Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  // ── Render ─────────────────────────────────────────────────────
  return (
    <View style={{ marginTop: 10 }}>

      {/* Header row: title + refresh icon + range toggle */}
      <View style={rowBetween}>

        {/* Left: title + refresh icon */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <Text style={{ fontSize: 18, fontWeight: "800" }}>Activity Stats</Text>
          <Pressable
            onPress={handleRefresh}
            disabled={loading}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Animated.View style={{ transform: [{ rotate: spin }], opacity: loading ? 0.4 : 1 }}>
              <Ionicons name="refresh" size={18} color="#2a8c82" />
            </Animated.View>
          </Pressable>
        </View>

        {/* Right: 7d / 28d toggle */}
        <View style={toggleRow}>
          {([7, 28] as const).map((d) => (
            <Pressable
              key={d}
              onPress={() => handleRangeChange(d)}
              style={[toggleBtn, statsRange === d && toggleBtnActive]}
            >
              <Text style={[toggleText, statsRange === d && toggleTextActive]}>
                {d}d
              </Text>
            </Pressable>
          ))}
        </View>

      </View>

      {loading ? (
        <View style={{ paddingVertical: 40, alignItems: "center" }}>
          <ActivityIndicator size="large" color="#2a8c82" />
        </View>
      ) : stats.length === 0 ? (
        <View style={[card, { alignItems: "center", paddingVertical: 30 }]}>
          <Text style={{ color: "#9CA3AF" }}>No data yet — process a day first</Text>
        </View>
      ) : (
        <>
          <MetricChart title="Steps"          dataKey="steps"     unit="steps" color="#2a8c82" />
          <MetricChart title="Sleep"          dataKey="sleep"     unit="hrs"   color="#6366F1" />
          <MetricChart title="Sedentary Time" dataKey="sedentary" unit="hrs"   color="#F59E0B" />
          <MetricChart title="Water Intake"   dataKey="water"     unit="ml"    color="#38BDF8" />
          <MetricChart
  title="Food (Calories)"
  dataKey="calories"
  unit="kcal"
  color="#EF4444"
/>
          <MoodDots />
        </>
      )}
    </View>
  );
}

// ── Styles ───────────────────────────────────────────────────────

const card = {
  backgroundColor: "#fff",
  padding: 16,
  borderRadius: 16,
  marginBottom: 15,
};

const cardTitle = {
  fontWeight: "700" as const,
  fontSize: 15,
  color: "#111827",
};

const avgText = {
  fontSize: 13,
  color: "#6B7280",
};

const rowBetween = {
  flexDirection: "row" as const,
  justifyContent: "space-between" as const,
  alignItems: "center" as const,
};

const toggleRow = {
  flexDirection: "row" as const,
  backgroundColor: "#F3F4F6",
  borderRadius: 10,
  padding: 3,
  marginBottom: 12,
};

const toggleBtn = {
  paddingHorizontal: 14,
  paddingVertical: 6,
  borderRadius: 8,
};

const toggleBtnActive = {
  backgroundColor: "#2a8c82",
};

const toggleText = {
  fontSize: 13,
  fontWeight: "600" as const,
  color: "#6B7280",
};

const toggleTextActive = {
  color: "#ffffff",
};