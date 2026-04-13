import React, { useEffect, useState } from "react";
import { useNavigation, useRouter } from "expo-router";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

const BASE_URL = "http://192.168.56.1:8000"; 

interface UserProfile {
  name: string;
  email: string;
  age: string;
  gender: string;
  height: string;
  weight: string;
}

export default function EditProfile() {
  const router = useRouter();
  const navigation = useNavigation();
  const [isSaving, setIsSaving] = useState(false);
  
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfile>({
    name: "",
    email: "",
    age: "",
    gender: "",
    height: "",
    weight: "",
  });

  useEffect(() => {
    navigation.setOptions({ headerShown: false });
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) {
        Alert.alert("Error", "No token found");
        return;
      }

      const res = await axios.get(`${BASE_URL}/me`, {
        headers: { token },
      });

      const user = res.data.user;
      // CRITICAL: Convert all numeric incoming data to STRINGS for the TextInputs
      setProfile({
        name: user.name || "",
        email: user.email || "",
        age: user.age != null ? String(user.age) : "",
        gender: user.gender || "",
        height: user.height != null ? String(user.height) : "",
        weight: user.weight != null ? String(user.weight) : "",
      });
    } catch (err) {
      console.log("FETCH ERROR:", err);
      Alert.alert("Error", "Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (isSaving) return;

    setIsSaving(true);
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) {
      Alert.alert("Error", "Authentication token missing.");
      setIsSaving(false);
      return;
    }

      // Helper to safely convert string state back to numbers for FastAPI
      const toNum = (val: string) => {
        const parsed = parseFloat(val);
        return isNaN(parsed) ? null : parsed;
      };

      // Construct payload EXCLUDING email
      const payload = {
        name: profile.name,
        gender: profile.gender,
        age: toNum(profile.age),
        height: toNum(profile.height),
        weight: toNum(profile.weight),
      };

      console.log("Sending Payload:", payload);

      const res = await axios.put(`${BASE_URL}/me`, payload, {
        headers: { "token": token }, 
      });

      Alert.alert(
      "Profile Updated", 
      "Your changes have been saved successfully!",
      [
        { 
          text: "OK", 
          onPress: () => router.back() // This keeps the window open until they hit OK
        }
      ]
    );
    } catch (err: any) {
      console.log("UPDATE ERROR:", err.response?.data || err.message);
      const serverMessage = err.response?.data?.detail;
    Alert.alert(
      "Update Failed",
      Array.isArray(serverMessage) 
        ? "Please check the format of your age, height, or weight." 
        : (serverMessage || "Could not connect to the server.")
    );
    } finally {
    setIsSaving(false); // Re-enable the button
  }
  };

  const handleLogout = async () => {
    await AsyncStorage.removeItem("token");
    await AsyncStorage.removeItem("isLoggedIn");
    router.replace("/AuthScreen"); 
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#2a8c82" />
      </View>
    );
  }

  const calculateBMI = () => {
  const h = parseFloat(profile.height);
  const w = parseFloat(profile.weight);

  if (!h || !w) return "--";

  const heightInMeters = h / 100;
  const bmi = w / (heightInMeters * heightInMeters);

  return bmi.toFixed(1);
};

const getBMICategory = () => {
  const bmi = parseFloat(calculateBMI());
  if (!bmi) return "";

  if (bmi < 18.5) return "Underweight";
  if (bmi < 25) return "Normal";
  if (bmi < 30) return "Overweight";
  return "Obese";
};

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={26} color="black" />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.title}>Edit Profile</Text>
          <Text style={styles.subtitle}>Update your health metrics</Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Personal Details</Text>

        {/* NAME */}
  <Text style={styles.label}>Full Name</Text>
        <TextInput
          style={styles.input}
          placeholder="Full Name"
          value={profile.name}
          onChangeText={(text) => setProfile({ ...profile, name: text })}
        />

        {/* Email */}
        <Text style={styles.label}>Email</Text>
        <TextInput
          style={[styles.input, styles.disabledInput]}
          value={profile.email}
          editable={false}
          selectTextOnFocus={false}
        />

        {/* Age */}
        <Text style={styles.label}>Age</Text>
        <TextInput
          style={styles.input}
          placeholder="Age"
          value={profile.age}
          keyboardType="numeric"
          onChangeText={(text) => setProfile({ ...profile, age: text })}
        />

        {/* Gender */}
        <Text style={styles.label}>Gender</Text>
        <TextInput
          style={[styles.input, styles.disabledInput]}
          placeholder="Gender"
          value={profile.gender}
          onChangeText={(text) => setProfile({ ...profile, gender: text })}
        />
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Physical Metrics</Text>

        <Text style={styles.label}>Height (cm) & Weight (kg)</Text>
        <View style={styles.row}>
          <TextInput
            style={styles.smallInput}
            placeholder="Height (cm)"
            value={profile.height}
            keyboardType="numeric"
            onChangeText={(text) => setProfile({ ...profile, height: text })}
          />
          <TextInput
            style={styles.smallInput}
            placeholder="Weight (kg)"
            value={profile.weight}
            keyboardType="numeric"
            onChangeText={(text) => setProfile({ ...profile, weight: text })}
          />
        </View>
      </View>

      <View style={styles.card}>
        {/* BMI */}
<Text style={styles.label}>BMI</Text>
<TextInput
  style={[styles.input, styles.disabledInput]}
  value={calculateBMI()}
  editable={false}
/>
         <Text style={{ color: "#6B7280", marginBottom: 10 }}>
  {getBMICategory()}
</Text>

      </View>

      <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
        <Text style={styles.saveText}>Save Changes</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F6F7FB", padding: 20 },
  header: { flexDirection: "row", alignItems: "center", marginBottom: 20, marginTop: 40 },
  backBtn: { marginRight: 12 },
  headerText: { flex: 1 },
  title: { fontSize: 24, fontWeight: "bold" },
  subtitle: { color: "gray", fontSize: 14 },
  card: { backgroundColor: "#fff", padding: 15, borderRadius: 12, marginBottom: 15 },
  sectionTitle: { fontWeight: "bold", marginBottom: 10, fontSize: 16, color: "#2a8c82" },
  input: { backgroundColor: "#f4f4f4", padding: 12, borderRadius: 10, marginBottom: 10 },
  disabledInput: { opacity: 0.6, backgroundColor: "#e0e0e0", color: "#666" },
  row: { flexDirection: "row", justifyContent: "space-between" },
  smallInput: { backgroundColor: "#f4f4f4", padding: 12, borderRadius: 10, width: "48%" },
  saveBtn: { backgroundColor: "#2a8c82", padding: 16, borderRadius: 25, alignItems: "center", marginTop: 10 },
  saveText: { color: "white", fontWeight: "bold", fontSize: 16 },
  logoutBtn: { backgroundColor: "#f44336", padding: 16, borderRadius: 25, alignItems: "center", marginTop: 10, marginBottom: 40 },
  logoutText: { color: "white", fontWeight: "bold", fontSize: 16 },
});