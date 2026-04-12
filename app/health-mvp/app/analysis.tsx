import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { useNavigation , useRouter} from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { Ionicons } from "@expo/vector-icons";

const BASE_URL = "http://localhost:8000";

// ── Types ─────────────────────────────────────────────────────────────────────

interface MetricInsight {
  metric: string;
  status: "good" | "warning" | "critical";
  insight: string;
  target: string;
}

interface DiseaseRisk {
  condition: string;
  risk_level: "low" | "moderate" | "high";
  risk_score: number;
  explanation: string;
  prevention_tips: string[];
}

interface Recommendation {
  priority: number;
  title: string;
  description: string;
  expected_benefit: string;
}

interface Analysis {
  overall_summary: string;
  score_interpretation: string;
  metric_insights: MetricInsight[];
  disease_risk_analysis: DiseaseRisk[];
  top_recommendations: Recommendation[];
  motivational_message: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const statusColor = (s: string) => {
  if (s === "good")     return "#22C55E";
  if (s === "warning")  return "#F59E0B";
  return "#EF4444";
};

const statusBg = (s: string) => {
  if (s === "good")     return "#F0FDF4";
  if (s === "warning")  return "#FFFBEB";
  return "#FEF2F2";
};

const riskColor = (r: string) => {
  if (r === "low")      return "#22C55E";
  if (r === "moderate") return "#F59E0B";
  return "#EF4444";
};

const riskBg = (r: string) => {
  if (r === "low")      return "#F0FDF4";
  if (r === "moderate") return "#FFFBEB";
  return "#FEF2F2";
};

const metricIcon: Record<string, string> = {
  Sleep:          "moon-outline",
  Steps:          "footsteps-outline",
  Hydration:      "water-outline",
  "Sedentary Time": "body-outline",
  Mood:           "happy-outline",
};

// ── Main Screen ───────────────────────────────────────────────────────────────

export default function AnalysisScreen() {
  const router = useRouter();
  const [analysis, setAnalysis]     = useState<Analysis | null>(null);
  const [loading, setLoading]       = useState(false);
  const [dataWindow, setDataWindow] = useState("");
  const [daysTracked, setDaysTracked] = useState(0);
  const [error, setError]           = useState("");

  const fetchAnalysis = async () => {
    setLoading(true);
    setError("");
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) { setError("Not logged in."); return; }

      const res = await axios.get(`${BASE_URL}/analysis`, { headers: { token } });
      setAnalysis(res.data.analysis);
      setDataWindow(res.data.data_window);
      setDaysTracked(res.data.days_tracked);
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Failed to fetch analysis.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: "#F2F4F7" }}
      contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
    >
      {/* HEADER */}
      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 20, gap: 10 }}>
        <Pressable onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </Pressable>
        <View>
          <Text style={{ fontSize: 22, fontWeight: "800" }}>AI Health Analysis</Text>
          {dataWindow ? (
            <Text style={{ fontSize: 11, color: "#9CA3AF" }}>
              {dataWindow} · {daysTracked} days tracked
            </Text>
          ) : null}
        </View>
      </View>

      {/* TRIGGER BUTTON */}
      {!analysis && !loading && (
        <View style={{ alignItems: "center", marginTop: 60 }}>
          <Ionicons name="sparkles-outline" size={60} color="#2a8c82" />
          <Text style={{ fontSize: 18, fontWeight: "800", marginTop: 16, textAlign: "center" }}>
            Get Your Personalized{"\n"}Health Analysis
          </Text>
          <Text style={{ fontSize: 13, color: "#6B7280", marginTop: 8, textAlign: "center", paddingHorizontal: 30 }}>
            AI will analyze your wellness score, activity patterns, disease risks, and generate tailored recommendations.
          </Text>
          <Pressable onPress={fetchAnalysis} style={analyzeBtn}>
            <Ionicons name="analytics-outline" size={18} color="#fff" />
            <Text style={{ color: "#fff", fontWeight: "800", fontSize: 15, marginLeft: 8 }}>
              Analyze My Health
            </Text>
          </Pressable>
        </View>
      )}

      {/* LOADING */}
      {loading && (
        <View style={{ alignItems: "center", marginTop: 80 }}>
          <ActivityIndicator size="large" color="#2a8c82" />
          <Text style={{ marginTop: 16, color: "#6B7280", fontSize: 14 }}>
            Analyzing your health data...
          </Text>
          <Text style={{ marginTop: 6, color: "#9CA3AF", fontSize: 12 }}>
            This may take a few seconds
          </Text>
        </View>
      )}

      {/* ERROR */}
      {error ? (
        <View style={{ backgroundColor: "#FEF2F2", padding: 16, borderRadius: 12, marginTop: 20 }}>
          <Text style={{ color: "#EF4444", fontWeight: "700" }}>Error</Text>
          <Text style={{ color: "#EF4444", marginTop: 4 }}>{error}</Text>
        </View>
      ) : null}

      {/* ANALYSIS RESULTS */}
      {analysis && !loading && (
        <View>

          {/* OVERALL SUMMARY */}
          <View style={card}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <Ionicons name="pulse-outline" size={20} color="#2a8c82" />
              <Text style={sectionTitle}>Health Summary</Text>
            </View>
            <Text style={{ fontSize: 14, color: "#374151", lineHeight: 22 }}>
              {analysis.overall_summary}
            </Text>
            <View style={{ marginTop: 12, backgroundColor: "#F0FDFA", padding: 12, borderRadius: 10 }}>
              <Text style={{ fontSize: 13, color: "#0F766E", lineHeight: 20 }}>
                {analysis.score_interpretation}
              </Text>
            </View>
          </View>

          {/* METRIC INSIGHTS */}
          <View style={card}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <Ionicons name="bar-chart-outline" size={20} color="#6366F1" />
              <Text style={sectionTitle}>Metric Breakdown</Text>
            </View>
            {analysis.metric_insights.map((m, i) => (
              <View
                key={i}
                style={{
                  backgroundColor: statusBg(m.status),
                  borderRadius: 12,
                  padding: 12,
                  marginBottom: 10,
                  borderLeftWidth: 3,
                  borderLeftColor: statusColor(m.status),
                }}
              >
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <Ionicons
                      name={(metricIcon[m.metric] || "fitness-outline") as any}
                      size={16}
                      color={statusColor(m.status)}
                    />
                    <Text style={{ fontWeight: "700", fontSize: 13, color: "#111827" }}>{m.metric}</Text>
                  </View>
                  <View style={{
                    backgroundColor: statusColor(m.status),
                    paddingHorizontal: 8,
                    paddingVertical: 2,
                    borderRadius: 20,
                  }}>
                    <Text style={{ color: "#fff", fontSize: 10, fontWeight: "700", textTransform: "uppercase" }}>
                      {m.status}
                    </Text>
                  </View>
                </View>
                <Text style={{ fontSize: 13, color: "#374151", marginTop: 6, lineHeight: 20 }}>
                  {m.insight}
                </Text>
                <Text style={{ fontSize: 11, color: "#6B7280", marginTop: 4 }}>
                  🎯 Target: {m.target}
                </Text>
              </View>
            ))}
          </View>

          {/* DISEASE RISK */}
          <View style={card}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <Ionicons name="shield-checkmark-outline" size={20} color="#EF4444" />
              <Text style={sectionTitle}>Disease Risk Analysis</Text>
            </View>
            <Text style={{ fontSize: 11, color: "#9CA3AF", marginBottom: 12 }}>
              ⚠️ Estimates only. Not a medical diagnosis.
            </Text>
            {analysis.disease_risk_analysis.map((d, i) => (
              <View key={i} style={{ marginBottom: 16 }}>
                <View style={{
                  backgroundColor: riskBg(d.risk_level),
                  borderRadius: 12,
                  padding: 14,
                  borderLeftWidth: 3,
                  borderLeftColor: riskColor(d.risk_level),
                }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                    <Text style={{ fontWeight: "800", fontSize: 14, color: "#111827" }}>{d.condition}</Text>
                    <View style={{
                      backgroundColor: riskColor(d.risk_level),
                      paddingHorizontal: 10,
                      paddingVertical: 3,
                      borderRadius: 20,
                    }}>
                      <Text style={{ color: "#fff", fontSize: 11, fontWeight: "700", textTransform: "uppercase" }}>
                        {d.risk_level} risk
                      </Text>
                    </View>
                  </View>

                  {/* Risk bar */}
                  <View style={{ marginTop: 8, height: 6, backgroundColor: "#E5E7EB", borderRadius: 6 }}>
                    <View style={{
                      height: 6,
                      borderRadius: 6,
                      backgroundColor: riskColor(d.risk_level),
                      width: `${Math.round(d.risk_score * 100)}%`,
                    }} />
                  </View>
                  <Text style={{ fontSize: 10, color: "#6B7280", marginTop: 2 }}>
                    Risk score: {Math.round(d.risk_score * 100)}%
                  </Text>

                  <Text style={{ fontSize: 13, color: "#374151", marginTop: 8, lineHeight: 20 }}>
                    {d.explanation}
                  </Text>

                  <Text style={{ fontWeight: "700", fontSize: 12, color: "#374151", marginTop: 10 }}>
                    Prevention Tips:
                  </Text>
                  {d.prevention_tips.map((tip, j) => (
                    <Text key={j} style={{ fontSize: 12, color: "#6B7280", marginTop: 4, lineHeight: 18 }}>
                      • {tip}
                    </Text>
                  ))}
                </View>
              </View>
            ))}
          </View>

          {/* TOP RECOMMENDATIONS */}
          <View style={card}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <Ionicons name="bulb-outline" size={20} color="#F59E0B" />
              <Text style={sectionTitle}>Top Recommendations</Text>
            </View>
            {analysis.top_recommendations.map((r, i) => (
              <View key={i} style={{
                backgroundColor: "#FFFBEB",
                borderRadius: 12,
                padding: 14,
                marginBottom: 10,
                borderLeftWidth: 3,
                borderLeftColor: "#F59E0B",
              }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <View style={{
                    width: 24, height: 24, borderRadius: 12,
                    backgroundColor: "#F59E0B",
                    alignItems: "center", justifyContent: "center",
                  }}>
                    <Text style={{ color: "#fff", fontWeight: "900", fontSize: 12 }}>{r.priority}</Text>
                  </View>
                  <Text style={{ fontWeight: "800", fontSize: 14, color: "#111827", flex: 1 }}>{r.title}</Text>
                </View>
                <Text style={{ fontSize: 13, color: "#374151", marginTop: 8, lineHeight: 20 }}>
                  {r.description}
                </Text>
                <Text style={{ fontSize: 12, color: "#059669", marginTop: 6, fontWeight: "600" }}>
                  ✅ {r.expected_benefit}
                </Text>
              </View>
            ))}
          </View>

          {/* MOTIVATIONAL MESSAGE */}
          <View style={{
            backgroundColor: "#2a8c82",
            borderRadius: 16,
            padding: 20,
            marginBottom: 16,
          }}>
            <Ionicons name="heart-outline" size={24} color="#fff" />
            <Text style={{ color: "#fff", fontSize: 14, lineHeight: 22, marginTop: 10, fontWeight: "500" }}>
              {analysis.motivational_message}
            </Text>
          </View>

          {/* RE-ANALYZE BUTTON */}
          <Pressable onPress={fetchAnalysis} style={[analyzeBtn, { marginTop: 0 }]}>
            <Ionicons name="refresh-outline" size={18} color="#fff" />
            <Text style={{ color: "#fff", fontWeight: "800", fontSize: 15, marginLeft: 8 }}>
              Re-analyze
            </Text>
          </Pressable>

        </View>
      )}
    </ScrollView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const card = {
  backgroundColor: "#fff",
  padding: 16,
  borderRadius: 16,
  marginBottom: 15,
};

const sectionTitle = {
  fontWeight: "800" as const,
  fontSize: 15,
  color: "#111827",
};

const analyzeBtn = {
  flexDirection: "row" as const,
  backgroundColor: "#2a8c82",
  padding: 16,
  borderRadius: 14,
  alignItems: "center" as const,
  justifyContent: "center" as const,
  marginTop: 30,
};