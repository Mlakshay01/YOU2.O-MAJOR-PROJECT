import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  Pressable,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import { useFocusEffect } from "expo-router";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

const BASE_URL     = "http://192.168.56.1:8000";
const SCREEN_WIDTH = Dimensions.get("window").width;

// ── Types ─────────────────────────────────────────────────────────────────────

interface Contribution {
  impact:           number;
  weight:           number;
  effective_weight: number;
  contribution:     number;
  avg?:             number;
  dominant?:        string;
}

interface DiseaseResult {
  risk:          number;
  risk_label:    string;
  contributions: Record<string, Contribution>;
}

interface RiskData {
  bmi:    number | null;
  window: string;
  risks: {
    diabetes:      DiseaseResult;
    heart_disease: DiseaseResult;
    obesity:       DiseaseResult;
  };
}

// ── Visual config ─────────────────────────────────────────────────────────────

const RISK_CONFIG = {
  Low:             { color: "#10B981", bg: "#ECFDF5", emoji: "🟢" },
  "Moderate-Low":  { color: "#3B82F6", bg: "#EFF6FF", emoji: "🔵" },
  Moderate:        { color: "#F59E0B", bg: "#FFFBEB", emoji: "🟡" },
  "Moderate-High": { color: "#F97316", bg: "#FFF7ED", emoji: "🟠" },
  High:            { color: "#EF4444", bg: "#FEF2F2", emoji: "🔴" },
};

const DISEASE_CONFIG = {
  diabetes: {
    label:    "Diabetes",
    icon:     "🩸",
    subtitle: "Type 2 Diabetes Risk",
  },
  heart_disease: {
    label:    "Heart Disease",
    icon:     "❤️",
    subtitle: "Cardiovascular Risk",
  },
  obesity: {
    label:    "Obesity",
    icon:     "⚖️",
    subtitle: "Weight-Related Risk",
  },
};

const METRIC_LABELS: Record<string, string> = {
  sleep:     "Sleep",
  steps:     "Steps",
  sedentary: "Sedentary Time",
  water:     "Water Intake",
  bmi:       "BMI",
  mood:      "Mood",
  food: "Food Intake",
};

const METRIC_UNITS: Record<string, string> = {
  sleep:     "h",
  sedentary: "h",
  steps:     " steps",
  water:     " ml",
  bmi:       "",
  food:      " kcal",
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const getRiskConfig = (label: string) =>
  RISK_CONFIG[label as keyof typeof RISK_CONFIG] ?? RISK_CONFIG["Moderate"];

// Replace raw weight number with plain-English label
const factorLabel = (weight: number): string => {
  if (weight >= 0.25) return "Strong factor";
  if (weight >= 0.15) return "Moderate factor";
  return "Minor factor";
};

const impactArrow = (contribution: number) => {
  if (contribution >= 0.05)  return { arrow: "↓", color: "#10B981", label: "Helping"      };
  if (contribution <= -0.05) return { arrow: "↑", color: "#EF4444", label: "Raising risk" };
  return                            { arrow: "→", color: "#9CA3AF", label: "Neutral"       };
};

const bmiBand = (bmi: number): string => {
  if (bmi < 18.5)  return "Underweight";
  if (bmi < 22.5)  return "Normal-Low";
  if (bmi <= 24)   return "Optimal";
  if (bmi < 25)    return "Normal-High";
  if (bmi < 30)    return "Overweight";
  if (bmi < 35)    return "Obese I";
  if (bmi < 40)    return "Obese II";
  return "Severely Obese";
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function DiseaseRiskSection() {
  const [data, setData]         = useState<RiskData | null>(null);
  const [loading, setLoading]   = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  const fetchRisk = useCallback(async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) return;
      const res = await axios.get(`${BASE_URL}/risk`, { headers: { token } });
      setData(res.data);
    } catch (err: any) {
      console.log("Risk fetch error:", err?.response?.data || err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { fetchRisk(); }, [fetchRisk]));

  if (loading) {
    return (
      <View style={{ paddingVertical: 40, alignItems: "center" }}>
        <ActivityIndicator size="large" color="#2a8c82" />
        <Text style={{ color: "#9CA3AF", marginTop: 10, fontSize: 13 }}>
          Analysing risk factors...
        </Text>
      </View>
    );
  }

  if (!data) return null;

  return (
    <View style={{ marginTop: 8 }}>

      {/* Section header */}
      <View style={{ marginBottom: 14 }}>
        <Text style={{ fontSize: 18, fontWeight: "800", color: "#111827" }}>
          Disease Risk
        </Text>
        <Text style={{ fontSize: 12, color: "#9CA3AF", marginTop: 2 }}>
          Lifestyle-based estimate · {data.window} · Not a diagnosis
        </Text>
      </View>

      {/* BMI badge */}
      {data.bmi !== null && data.bmi !== undefined && (
        <View style={bmiBadge}>
          <Text style={{ fontSize: 12, color: "#6B7280" }}>Your BMI</Text>
          <Text style={{ fontSize: 15, fontWeight: "800", color: "#111827", marginLeft: 8 }}>
            {data.bmi}
          </Text>
          <Text style={{ fontSize: 12, color: "#9CA3AF", marginLeft: 8 }}>
            {bmiBand(data.bmi)}
          </Text>
        </View>
      )}

      {/* Disease cards */}
      {Object.entries(DISEASE_CONFIG).map(([key, config]) => {
        const result = data.risks[key as keyof typeof data.risks];
        if (!result) return null;

        const rc          = getRiskConfig(result.risk_label);
        const isExpanded  = expanded === key;
        const riskPercent = Math.round(result.risk * 100);

        return (
          <Pressable
            key={key}
            onPress={() => setExpanded(isExpanded ? null : key)}
            style={[diseaseCard, { backgroundColor: rc.bg, borderColor: rc.color + "30" }]}
          >
            {/* Header row */}
            <View style={cardHeader}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <View style={[iconCircle, { backgroundColor: rc.color + "20" }]}>
                  <Text style={{ fontSize: 20 }}>{config.icon}</Text>
                </View>
                <View>
                  <Text style={{ fontSize: 16, fontWeight: "800", color: "#111827" }}>
                    {config.label}
                  </Text>
                  <Text style={{ fontSize: 12, color: "#6B7280" }}>
                    {config.subtitle}
                  </Text>
                </View>
              </View>

              <View style={[riskBadge, { backgroundColor: rc.color }]}>
                <Text style={{ fontSize: 11, fontWeight: "800", color: "#fff", letterSpacing: 0.5 }}>
                  {result.risk_label.toUpperCase()}
                </Text>
              </View>
            </View>

            {/* Risk bar */}
            <View style={{ marginTop: 14, marginBottom: 6 }}>
              <View style={[riskBarBg, { backgroundColor: rc.color + "20" }]}>
                <View style={[riskBarFill, { width: `${riskPercent}%`, backgroundColor: rc.color }]} />
                <View style={[needle, { left: `${riskPercent}%` as any, borderColor: rc.color }]} />
              </View>
              <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 4 }}>
                <Text style={{ fontSize: 10, color: "#9CA3AF" }}>Low Risk</Text>
                <Text style={{ fontSize: 12, fontWeight: "700", color: rc.color }}>
                  {riskPercent}%
                </Text>
                <Text style={{ fontSize: 10, color: "#9CA3AF" }}>High Risk</Text>
              </View>
            </View>

            {/* Expand toggle */}
            <Text style={{ fontSize: 11, color: rc.color, marginTop: 4, fontWeight: "600" }}>
              {isExpanded ? "▲ Hide breakdown" : "▼ Show what's driving this"}
            </Text>

            {/* Expanded breakdown */}
            {isExpanded && (
              <View style={breakdownContainer}>
                <Text style={{ fontSize: 12, fontWeight: "700", color: "#374151", marginBottom: 10 }}>
                  What's affecting your risk
                </Text>

                {Object.entries(result.contributions).map(([metric, contrib]) => {
                  const arrow  = impactArrow(contrib.contribution);
                  const hasAvg = contrib.avg !== null && contrib.avg !== undefined;
                  const unit   = METRIC_UNITS[metric] ?? "";

                  return (
                    <View key={metric} style={contributionRow}>
                      <View style={{ flex: 1 }}>

                        {/* Metric name + value */}
                        <Text style={{ fontSize: 13, fontWeight: "600", color: "#111827" }}>
                          {METRIC_LABELS[metric] ?? metric}
                          {hasAvg && (
                            <Text style={{ fontWeight: "400", color: "#6B7280" }}>
                              {"  "}{contrib.avg}{unit}
                            </Text>
                          )}
                          {metric === "mood" && contrib.dominant && (
                            <Text style={{ fontWeight: "400", color: "#6B7280" }}>
                              {"  "}{contrib.dominant}
                            </Text>
                          )}
                        </Text>

                        {/* Status + factor label — NO raw weight number */}
                        <Text style={{ fontSize: 11, color: arrow.color, marginTop: 2 }}>
                          {arrow.label}
                          <Text style={{ color: "#9CA3AF" }}>
                            {"  ·  "}{factorLabel(contrib.weight)}
                          </Text>
                        </Text>

                      </View>

                      {/* Arrow badge */}
                      <View style={[arrowBadge, { backgroundColor: arrow.color + "18" }]}>
                        <Text style={{ fontSize: 16, color: arrow.color, fontWeight: "800" }}>
                          {arrow.arrow}
                        </Text>
                      </View>
                    </View>
                  );
                })}

                {/* Disclaimer */}
                <View style={disclaimer}>
                  <Text style={{ fontSize: 10, color: "#9CA3AF", textAlign: "center", lineHeight: 14 }}>
                    ⚠️  Lifestyle-based estimate only — not a medical diagnosis.{"\n"}
                    Consult a healthcare professional for clinical evaluation.
                  </Text>
                </View>
              </View>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const diseaseCard = {
  borderRadius:  20,
  borderWidth:   1.5,
  padding:       18,
  marginBottom:  14,
};

const cardHeader = {
  flexDirection:  "row" as const,
  justifyContent: "space-between" as const,
  alignItems:     "center" as const,
};

const iconCircle = {
  width:          44,
  height:         44,
  borderRadius:   22,
  alignItems:     "center" as const,
  justifyContent: "center" as const,
};

const riskBadge = {
  paddingHorizontal: 10,
  paddingVertical:   5,
  borderRadius:      20,
};

const riskBarBg = {
  height:       10,
  borderRadius: 10,
  overflow:     "hidden" as const,
  position:     "relative" as const,
};

const riskBarFill = {
  height:       10,
  borderRadius: 10,
};

const needle = {
  position:        "absolute" as const,
  top:             -3,
  width:           2,
  height:          16,
  borderRadius:    2,
  borderWidth:     1.5,
  backgroundColor: "#fff",
  marginLeft:      -1,
};

const breakdownContainer = {
  marginTop:       16,
  backgroundColor: "#ffffff80",
  borderRadius:    14,
  padding:         14,
};

const contributionRow = {
  flexDirection:     "row" as const,
  alignItems:        "center" as const,
  justifyContent:    "space-between" as const,
  paddingVertical:   8,
  borderBottomWidth: 1,
  borderBottomColor: "#F3F4F6",
};

const arrowBadge = {
  width:          36,
  height:         36,
  borderRadius:   18,
  alignItems:     "center" as const,
  justifyContent: "center" as const,
  marginLeft:     10,
};

const disclaimer = {
  marginTop:      12,
  paddingTop:     12,
  borderTopWidth: 1,
  borderTopColor: "#F3F4F6",
};

const bmiBadge = {
  flexDirection:     "row" as const,
  alignItems:        "center" as const,
  backgroundColor:   "#F9FAFB",
  borderRadius:      12,
  paddingHorizontal: 14,
  paddingVertical:   10,
  marginBottom:      14,
  borderWidth:       1,
  borderColor:       "#E5E7EB",
};