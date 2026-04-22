import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useState, useEffect } from "react";
import { useRouter, useNavigation } from "expo-router";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

const BASE_URL = "http://192.168.56.1:8000";

export default function AuthScreen() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "signup">("login");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [gender, setGender] = useState("Male");
  const [age, setAge] = useState("");
  const [error, setError] = useState("");
  const [secure, setSecure] = useState(true);

  const navigation = useNavigation();

  useEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, []);

  const handleAuth = async () => {
    try {
      let res;
      if (mode === "login") {
        res = await axios.post(`${BASE_URL}/login`, { email, password });
      } else {
        res = await axios.post(`${BASE_URL}/signup`, {
          name,
          age: age ? parseFloat(age) : null,
          email,
          password,
          height: height ? parseFloat(height) : null,
          weight: weight ? parseFloat(weight) : null,
          gender,
        });
      }

      const token = res.data.user?.token;
      if (!token) throw new Error("Token not returned from server");

      await AsyncStorage.setItem("token", token);
      await AsyncStorage.setItem("isLoggedIn", "true");

      Alert.alert(mode === "login" ? "Login Successful" : "Signup Successful");
      router.replace("/");
    } catch (err: any) {
      console.log("AUTH ERROR:", err.response?.data || err.message);
      if (err.response?.data) {
        Alert.alert("Error", err.response.data.detail || "Server error");
      } else {
        Alert.alert("Error", err.message);
      }
    }
  };

  const validateAndSubmit = () => {
    if (!email) return setError("Email is required");
    if (!/\S+@\S+\.\S+/.test(email)) return setError("Enter a valid email");
    if (!password) return setError("Password is required");
    if (mode === "signup") {
      if (!name) return setError("Name is required");
      if (!height) return setError("Height is required");
      if (!weight) return setError("Weight is required");
      if (!age) return setError("Age is required");
    }
    setError("");
    handleAuth();
  };

  return (
    <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
      <LinearGradient
        colors={["#DCEEEE", "#FFFFFF"]}
        style={{ flex: 1, justifyContent: "center", padding: 20, minHeight: "100%" }}
      >
        <View style={styles.card}>
          <View style={styles.logoRow}>
            <Ionicons name="heart" size={28} color="#2a8c82" />
            <Text style={styles.logoText}>You2.0</Text>
          </View>

          <Text style={styles.title}>{mode === "login" ? "Log In" : "Sign Up"}</Text>
          <Text style={styles.subtitle}>
            {mode === "login"
              ? "Welcome back! Please log in to continue tracking your health journey."
              : "Join You2.0! Create an account to start your health journey today."}
          </Text>

          {mode === "signup" && (
            <View style={styles.inputWrapper}>
              <Ionicons name="person-outline" size={20} color="#6B7280" />
              <TextInput
                placeholder="Your name"
                style={styles.input}
                value={name}
                onChangeText={setName}
              />
            </View>
          )}

          {mode === "signup" && (
            <View style={styles.inputWrapper}>
              <Ionicons name="calendar-outline" size={20} color="#6B7280" />
              <TextInput
                placeholder="Age"
                style={styles.input}
                value={age}
                keyboardType="numeric"
                onChangeText={setAge}
              />
            </View>
          )}

          <View style={styles.inputWrapper}>
            <MaterialCommunityIcons name="email-outline" size={20} color="#6B7280" />
            <TextInput
              placeholder="Email"
              style={styles.input}
              value={email}
              onChangeText={setEmail}
            />
          </View>

          <View style={styles.inputWrapper}>
            <MaterialCommunityIcons name="lock-outline" size={20} color="#6B7280" />
            <TextInput
              placeholder="Password"
              secureTextEntry={secure}
              style={styles.input}
              value={password}
              onChangeText={setPassword}
            />
            <TouchableOpacity onPress={() => setSecure(!secure)}>
              <Ionicons
                name={secure ? "eye-off-outline" : "eye-outline"}
                size={20}
                color="#6B7280"
              />
            </TouchableOpacity>
          </View>

          {mode === "signup" && (
            <>
              <View style={styles.row}>
                <TextInput
                  placeholder="Height (cm)"
                  style={[styles.input, { flex: 1, marginRight: 10 }]}
                  value={height}
                  keyboardType="numeric"
                  onChangeText={setHeight}
                />
                <TextInput
                  placeholder="Weight (kg)"
                  style={[styles.input, { flex: 1 }]}
                  value={weight}
                  keyboardType="numeric"
                  onChangeText={setWeight}
                />
              </View>

              <View style={styles.genderContainer}>
                {["Male", "Female", "Other"].map((item) => (
                  <TouchableOpacity
                    key={item}
                    style={styles.radioOption}
                    onPress={() => setGender(item)}
                  >
                    <View style={styles.radioOuter}>
                      {gender === item && <View style={styles.radioInner} />}
                    </View>
                    <Text style={styles.radioText}>{item}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <TouchableOpacity onPress={validateAndSubmit}>
            <LinearGradient colors={["#2a8c82", "#1C7C76"]} style={styles.button}>
              <Text style={styles.buttonText}>{mode === "login" ? "Log In" : "Sign Up"}</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => setMode(mode === "login" ? "signup" : "login")}>
            <Text style={styles.switchText}>
              {mode === "login"
                ? "New to You2.0? Sign Up"
                : "Already have an account? Log In"}
            </Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    borderRadius: 30,
    padding: 25,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 15,
  },
  logoRow: { flexDirection: "row", justifyContent: "center", marginBottom: 20 },
  logoText: { fontSize: 26, fontWeight: "700", color: "#2a8c82" },
  title: { fontSize: 22, fontWeight: "700", textAlign: "center", marginBottom: 10 },
  subtitle: { textAlign: "center", color: "#6B7280", fontSize: 14, marginBottom: 25 },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 15,
    borderRadius: 15,
    marginBottom: 15,
  },
  input: { flex: 1, paddingVertical: 14, marginLeft: 10, backgroundColor: "#F3F4F6", borderRadius: 10, paddingHorizontal: 8 },
  row: { flexDirection: "row", marginBottom: 15 },
  button: { borderRadius: 25, alignItems: "center", paddingVertical: 16, marginBottom: 15 },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  switchText: { textAlign: "center", marginTop: 10, color: "#374151", fontWeight: "600" },
  error: { color: "red", marginBottom: 10, textAlign: "center" },
  genderContainer: { flexDirection: "row", justifyContent: "space-around", marginBottom: 15 },
  radioOption: { flexDirection: "row", alignItems: "center" },
  radioOuter: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: "#2a8c82", alignItems: "center", justifyContent: "center", marginRight: 6 },
  radioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: "#2a8c82" },
  radioText: { fontSize: 14, color: "#374151" },
});