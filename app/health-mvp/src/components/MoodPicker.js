// Mood picker (MANUAL OVERRIDE)

import React from "react";
import { View, Text, Pressable } from "react-native";
import { MOOD_CLASSES_7 } from "../logic/moodLogic";

export default function MoodPicker({ value, onChange }) {
  return (
    <View style={{ marginTop: 12 }}>
      <Text style={{ fontSize: 16, fontWeight: "700", marginBottom: 8 }}>Select mood</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {MOOD_CLASSES_7.map((m) => {
          const active = value === m;
          return (
            <Pressable
              key={m}
              onPress={() => onChange(m)}
              style={{
                paddingVertical: 10,
                paddingHorizontal: 12,
                borderRadius: 999,
                borderWidth: 1,
                borderColor: active ? "#111" : "#ccc",
                backgroundColor: active ? "#111" : "#fff",
              }}
            >
              <Text style={{ color: active ? "#fff" : "#111", fontWeight: "600" }}>{m}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}