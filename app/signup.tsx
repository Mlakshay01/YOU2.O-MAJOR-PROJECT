import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import {
  Ionicons,
  MaterialCommunityIcons,
  AntDesign,
} from "@expo/vector-icons";
import { Picker } from "@react-native-picker/picker";
import { useState, useEffect } from "react";
import { COLORS } from "../constants/theme";

import * as WebBrowser from "expo-web-browser";
import * as Google from "expo-auth-session/providers/google";
import axios from "axios";

WebBrowser.maybeCompleteAuthSession();

export default function Signup() {
  const router = useRouter();
  const [secure, setSecure] = useState(true);
  const [gender, setGender] = useState("Male");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [age, setAge] = useState("");
const [phone, setPhone] = useState("");
  const [error, setError] = useState("");

  // GOOGLE AUTH
  const [request, response, promptAsync] = Google.useAuthRequest({
    webClientId: "79994712044-dh4tf46i71vmre1jgllger38inia8cm5.apps.googleusercontent.com",
  });

  useEffect(() => {
    if (response?.type === "success") {
      // router.replace("/(tabs)");
      
    }
  }, [response]);

  const handleSignup = async () => {
  try {
    const res = await axios.post(
      "http://192.168.1.16:5000/Signup",
      {
        name,
        email,
        password,
        phone,
    age,
        height,
        weight,
        gender,
      }
    );

    alert("Signup successful");

    router.replace("/(tabs)");

  } catch (error:any) {
    alert(
      error.response?.data?.message ||
      "Signup failed. Try again."
    );
  }
};

  
  const validateSignup = () => {
    if (!name) {
      setError("Name is required");
      return;
    }

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

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
if (!phone) {
  setError("Phone number is required");
  return;
}

if (!age) {
  setError("Age is required");
  return;
}
    if (!height) {
      setError("Height is required");
      return;
    }

    if (!weight) {
      setError("Weight is required");
      return;
    }

    setError("");
    // router.replace("/(tabs)");
    handleSignup();
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

        <Text style={styles.title}>Sign Up</Text>
        <Text style={styles.subtitle}>
          Join You2.0! Create an account
          to start your health journey today.
        </Text>

        
        <View style={styles.inputWrapper}>
          <Ionicons name="person-outline" size={20} color="#6B7280" />
          <TextInput
            placeholder="Your name"
            style={styles.input}
            value={name}
            onChangeText={setName}
          />
        </View>

        
        <View style={styles.inputWrapper}>
          <MaterialCommunityIcons name="email-outline" size={20} color="#6B7280" />
          <TextInput
            placeholder="Your email"
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

<View style={styles.inputWrapper}>
  <Ionicons name="call-outline" size={20} color="#6B7280" />
  <TextInput
    placeholder="Phone Number"
    keyboardType="phone-pad"
    style={styles.input}
    value={phone}
    onChangeText={setPhone}
  />
</View>

        
        <View style={styles.row}>

          <View style={[styles.inputWrapper,{flex:1, marginRight:8}]}>
<TextInput
placeholder="Age"
keyboardType="numeric"
style={styles.input}
value={age}
onChangeText={setAge}
/>
</View>
          <View style={[styles.inputWrapper, { flex: 1, marginRight: 10 }]}>
            <TextInput
              placeholder="Height (cm)"
              keyboardType="numeric"
              style={styles.input}
              value={height}
              onChangeText={setHeight}
            />
          </View>

          <View style={[styles.inputWrapper, { flex: 1 }]}>
            <TextInput
              placeholder="Weight (kg)"
              keyboardType="numeric"
              style={styles.input}
              value={weight}
              onChangeText={setWeight}
            />
          </View>
        </View>

        {/* STYLED DROPDOWN
        <View style={styles.dropdownWrapper}>
          <Ionicons name="male-female-outline" size={20} color="#6B7280" />
          <Picker
            selectedValue={gender}
            onValueChange={(v) => setGender(v)}
            style={styles.picker}
            dropdownIconColor="#6B7280"
          >
            <Picker.Item label="Male" value="Male" />
            <Picker.Item label="Female" value="Female" />
            <Picker.Item label="Other" value="Other" />
          </Picker>
          <Ionicons name="chevron-down" size={20} color="#6B7280" />
        </View> */}

        
<View style={styles.genderContainer}>
  <Ionicons name="male-female-outline" size={20} color="#6B7280" />

  <View style={styles.radioGroup}>
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
</View>

        {error ? (
          <Text style={{ color: "red", marginBottom: 10 }}>
            {error}
          </Text>
        ) : null}

        
        <LinearGradient
          colors={[COLORS.primary, "#1C7C76"]}
          style={styles.button}
        >
          <TouchableOpacity onPress={validateSignup}>
            <Text style={styles.buttonText}>Sign Up</Text>
          </TouchableOpacity>
        </LinearGradient>

      
        <View style={styles.orRow}>
          <View style={styles.line} />
          <Text style={styles.or}>OR</Text>
          <View style={styles.line} />
        </View>

        {/* GOOGLE */}
        <TouchableOpacity
          style={styles.googleBtn}
          onPress={() => promptAsync()}
          disabled={!request}
        >
          <AntDesign name="google" size={20} color="#DB4437" />
          <Text style={styles.googleText}> Continue with Google</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.push("/Login")}>
          <Text style={styles.switchText}>
            Already have an account?{" "}
            <Text style={{ fontWeight: "700" }}>Log In</Text>
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

  dropdownWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    borderRadius: 15,
    paddingHorizontal: 15,
    marginBottom: 20,
  },

  picker: {
    flex: 1,
    marginLeft: 10,
  },

  row: {
    flexDirection: "row",
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

  genderContainer: {
  flexDirection: "row",
  alignItems: "center",
  backgroundColor: "#F3F4F6",
  borderRadius: 15,
  paddingHorizontal: 15,
  paddingVertical: 12,
  marginBottom: 20,
},

radioGroup: {
  flexDirection: "row",
  marginLeft: 15,
  flex: 1,
  justifyContent: "space-between",
},

radioOption: {
  flexDirection: "row",
  alignItems: "center",
},

radioOuter: {
  width: 18,
  height: 18,
  borderRadius: 9,
  borderWidth: 2,
  borderColor: COLORS.primary,
  alignItems: "center",
  justifyContent: "center",
  marginRight: 6,
},

radioInner: {
  width: 10,
  height: 10,
  borderRadius: 5,
  backgroundColor: COLORS.primary,
},

radioText: {
  fontSize: 14,
  color: "#374151",
},
});