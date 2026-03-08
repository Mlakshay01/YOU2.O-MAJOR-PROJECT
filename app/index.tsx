import { View, Text, TouchableOpacity, StyleSheet, Image } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { COLORS, SHADOW } from "../constants/theme";

export default function Welcome() {
  const router = useRouter();

  return (
    <LinearGradient
      colors={["#DFF3F4", "#FFFFFF"]}
      style={styles.container}
    >
      <View style={styles.card}>
        <Text style={styles.title}>Welcome to You2.0</Text>
        <Text style={styles.subtitle}>
          Beyond Tracking, Into Becoming.
        </Text>

        <Image
          source={{
            uri: "https://cdn-icons-png.flaticon.com/512/2966/2966481.png",
          }}
          style={styles.image}
        />

        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => router.push("/Signup")}
        >
          <Text style={styles.primaryText}>Sign Up</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => router.push("/Login")}
        >
          <Text style={styles.secondaryText}>Log In</Text>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 24,
  },

  card: {
    backgroundColor: COLORS.white,
    borderRadius: 30,
    padding: 24,
    alignItems: "center",
    ...SHADOW,
  },

  title: {
    fontSize: 28,
    fontWeight: "700",
    color: COLORS.primary,
    textAlign: "center",
    marginBottom: 8,
  },

  subtitle: {
    fontSize: 14,
    color: COLORS.textLight,
    marginBottom: 24,
    textAlign: "center",
  },

  image: {
    width: 150,
    height: 150,
    marginBottom: 30,
  },

  primaryButton: {
    backgroundColor: COLORS.primary,
    width: "100%",
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: "center",
    marginBottom: 12,
  },

  primaryText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },

  secondaryButton: {
    borderWidth: 2,
    borderColor: COLORS.primary,
    width: "100%",
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: "center",
  },

  secondaryText: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: "600",
  },
});