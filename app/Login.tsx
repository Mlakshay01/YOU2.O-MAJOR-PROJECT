import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import {
  Ionicons,
  MaterialCommunityIcons,
  AntDesign,
} from "@expo/vector-icons";
import { COLORS } from "../constants/theme";

import { useState, useEffect } from "react";
import * as WebBrowser from "expo-web-browser";
import * as Google from "expo-auth-session/providers/google";

WebBrowser.maybeCompleteAuthSession();

export default function Login() {
  const router = useRouter();


  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  // GOOGLE AUTH

  const [request, response, promptAsync] = Google.useAuthRequest({
  webClientId: "79994712044-dh4tf46i71vmre1jgllger38inia8cm5.apps.googleusercontent.com",
});
  useEffect(() => {
    if (response?.type === "success") {
      router.replace("/(tabs)");
    }
  }, [response]);

  // VALIDATION FUNCTION
  const validateLogin = () => {
    if (!email) {
      setError("Email is required");
      return;
    }

    if (!/\S+@\S+\.\S+/.test(email)) {
      setError("Enter a valid email");
      return;
    }

    if (!password) {
      setError("Password is required");
      return;
    }

    setError("");
    router.replace("/(tabs)");
  };

  return (
    <LinearGradient
      colors={["#DCEEEE", "#FFFFFF"]}
      style={styles.container}
    >
      <View style={styles.card}>

        {/* LOGO */}
        <View style={styles.logoRow}>
          <Ionicons name="heart" size={28} color={COLORS.primary} />
          <Text style={styles.logoText}> You2.0</Text>
        </View>

        <Text style={styles.title}>Log In</Text>
        <Text style={styles.subtitle}>
          Welcome back! Please log in to
          continue tracking your health journey.
        </Text>

        {/* EMAIL */}
        <View style={styles.inputWrapper}>
          <MaterialCommunityIcons name="email-outline" size={20} color="#6B7280" />
          <TextInput
            placeholder="Your email"
            style={styles.input}
            value={email}
            onChangeText={setEmail}
          />
        </View>

        {/* PASSWORD */}
        <View style={styles.inputWrapper}>
          <MaterialCommunityIcons name="lock-outline" size={20} color="#6B7280" />
          <TextInput
            placeholder="Password"
            secureTextEntry
            style={styles.input}
            value={password}
            onChangeText={setPassword}
          />
        </View>

        {error ? (
          <Text style={{ color: "red", marginBottom: 10 }}>
            {error}
          </Text>
        ) : null}

        <Text style={styles.forgot}>Forgot password?</Text>

        <LinearGradient
          colors={[COLORS.primary, "#1C7C76"]}
          style={styles.button}
        >
          <TouchableOpacity onPress={validateLogin}>
            <Text style={styles.buttonText}>Log In</Text>
          </TouchableOpacity>
        </LinearGradient>

        {/* OR */}
        <View style={styles.orRow}>
          <View style={styles.line} />
          <Text style={styles.or}>OR</Text>
          <View style={styles.line} />
        </View>

        <TouchableOpacity
          style={styles.googleBtn}
          onPress={() => promptAsync()}
          disabled={!request}
        >
          <AntDesign name="google" size={20} color="#DB4437" />
          <Text style={styles.googleText}> Continue with Google</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.push("/Signup")}>
          <Text style={styles.switchText}>
            New to You2.0? <Text style={{ fontWeight: "700" }}>Sign Up</Text>
          </Text>
        </TouchableOpacity>

      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 80,
    paddingHorizontal: 20,
  },

  card: {
    backgroundColor: "#fff",
    borderRadius: 30,
    padding: 30,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 15,
  },

  logoRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },

  logoText: {
    fontSize: 26,
    fontWeight: "700",
    color: COLORS.primary,
  },

  title: {
    fontSize: 22,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 10,
  },

  subtitle: {
    textAlign: "center",
    color: "#6B7280",
    fontSize: 14,
    marginBottom: 25,
    lineHeight: 20,
  },

  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 15,
    borderRadius: 15,
    marginBottom: 15,
  },

  input: {
    flex: 1,
    paddingVertical: 14,
    marginLeft: 10,
  },

  forgot: {
    textAlign: "right",
    color: "#6B7280",
    marginBottom: 20,
  },

  button: {
    borderRadius: 25,
    alignItems: "center",
    paddingVertical: 16,
  },

  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },

  orRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 20,
  },

  line: {
    flex: 1,
    height: 1,
    backgroundColor: "#E5E7EB",
  },

  or: {
    marginHorizontal: 10,
    color: "#6B7280",
  },

  googleBtn: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    padding: 14,
    borderRadius: 15,
  },

  googleText: {
    fontSize: 14,
    color: "#374151",
  },

  switchText: {
    textAlign: "center",
    marginTop: 20,
    color: "#374151",
  },
});