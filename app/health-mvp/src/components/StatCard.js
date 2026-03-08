// Simple stat card

import React from "react";
import { View, Text } from "react-native";

export default function StatCard({ title, value, subtitle }) {
  return (
    <View style={{ padding: 14, borderWidth: 1, borderColor: "#e5e5e5", borderRadius: 14, backgroundColor: "#fff" }}>
      <Text style={{ fontSize: 13, color: "#555", fontWeight: "600" }}>{title}</Text>
      <Text style={{ fontSize: 24, fontWeight: "800", marginTop: 6 }}>{value}</Text>
      {subtitle ? <Text style={{ marginTop: 6, color: "#666" }}>{subtitle}</Text> : null}
    </View>
  );
}