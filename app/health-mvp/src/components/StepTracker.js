import React, { useEffect, useState } from "react";
import { View, Text, TextInput, Platform, Button } from "react-native";
import { Pedometer } from "expo-sensors";
import { saveMetric } from "../storage/activityStorage";

export default function StepTracker({ todaySteps }) {
  const [steps, setSteps] = useState(todaySteps || 0);
  const [available, setAvailable] = useState(null);

  useEffect(() => {
    if (Platform.OS === "web") return;

    let sub;

    const start = async () => {
      const isAvailable = await Pedometer.isAvailableAsync();
      console.log("Pedometer available:", isAvailable);
      setAvailable(isAvailable);
      if (!isAvailable) return;

      sub = Pedometer.watchStepCount((result) => {
        console.log("Step update:", result.steps);
        setSteps(result.steps);
      });
    };

    start();

    return () => {
      if (sub) sub.remove();
    };
  }, []);

  // Save steps to storage (can throttle if needed)
  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    saveMetric(today, "steps", steps);
  }, [steps]);

  // Web / manual input fallback
  if (Platform.OS === "web") {
    return (
      <View>
        <TextInput
          placeholder="Enter steps"
          keyboardType="numeric"
          value={String(steps)}
          onChangeText={(v) => setSteps(Number(v) || 0)}
          style={{
            borderWidth: 1,
            borderColor: "#ddd",
            padding: 6,
            borderRadius: 6,
            marginBottom: 10,
          }}
        />
        <Button title="Add Step" onPress={() => setSteps(steps + 1)} />
      </View>
    );
  }

  // Mobile view
  return (
    <View style={{ alignItems: "center" }}>
      <Text style={{ fontSize: 16, fontWeight: "700" }}>
        Steps: {steps.toLocaleString()}
      </Text>
      {/* Optional manual increment for testing */}
      <Text style={{ fontSize: 12, marginTop: 4 }}>
        Pedometer Available: {available === null ? "Checking..." : available ? "Yes" : "No"}
      </Text>
    </View>
  );
}