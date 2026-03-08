import { View, Text } from "react-native";

export default function HealthScoreCard({ score }) {
  return (
    <View
      style={{
        backgroundColor: "#2FA39A",
        borderRadius: 24,
        padding: 24,
        alignItems: "center",
        marginBottom: 12,
      }}
    >
      <Text style={{ color: "white", fontSize: 16, fontWeight: "600" }}>
        Overall Health Score
      </Text>

      <Text
        style={{
          color: "white",
          fontSize: 42,
          fontWeight: "900",
          marginTop: 4,
        }}
      >
        {score}/100
      </Text>

      <Text style={{ color: "#DFF5F2", marginTop: 6 }}>
        Based on today's habits
      </Text>
    </View>
  );
}