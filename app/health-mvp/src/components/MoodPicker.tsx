// components/MoodPicker.tsx
// Manual mood override — shown after AI prediction or as standalone entry.
// Improvements: emoji per mood, larger tap targets, selected state is clearer.

import React from "react";
import { View, Text, Pressable } from "react-native";
import { MOOD_CLASSES_7, MOOD_EMOJI } from "../logic/moodLogic";

interface Props {
  value:    string | null;
  onChange: (mood: string) => void;
  label?:   string;
}

export default function MoodPicker({ value, onChange, label = "Select mood" }: Props) {
  return (
    <View style={{ marginTop: 12 }}>
      <Text style={{ fontSize: 14, fontWeight: "700", marginBottom: 10, color: "#374151" }}>
        {label}
      </Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {MOOD_CLASSES_7.map((m) => {
          const active = value === m;
          return (
            <Pressable
              key={m}
              onPress={() => onChange(m)}
              accessibilityRole="radio"
              accessibilityState={{ selected: active }}
              accessibilityLabel={m}
              style={{
                flexDirection:     "row",
                alignItems:        "center",
                gap:               6,
                paddingVertical:   10,
                paddingHorizontal: 14,
                borderRadius:      999,
                borderWidth:       1.5,
                borderColor:       active ? "#111827" : "#D1D5DB",
                backgroundColor:   active ? "#111827" : "#F9FAFB",
              }}
            >
              <Text style={{ fontSize: 16 }}>{MOOD_EMOJI[m]}</Text>
              <Text style={{
                color:      active ? "#fff" : "#374151",
                fontWeight: active ? "700" : "500",
                fontSize:   13,
                textTransform: "capitalize",
              }}>
                {m}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}