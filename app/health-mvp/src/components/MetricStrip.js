import { View, Text } from "react-native";

export default function MetricStrip({ label, value }) {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: "#ffffff",
        padding: 12,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: "#E6ECEA",
        alignItems: "center",
      }}
    >
      <Text style={{ fontSize: 13, color: "#6A7C7A" }}>
        {label}
      </Text>

      <Text
        style={{
          fontSize: 16,
          fontWeight: "800",
          marginTop: 4,
        }}
      >
        {value}
      </Text>
    </View>
  );
}