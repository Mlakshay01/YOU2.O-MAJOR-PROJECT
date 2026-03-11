import {
  Feather,
  Ionicons
} from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export default function Profile() {
  const router = useRouter();
  const [showNotifications, setShowNotifications] = useState(false);
  const navigation = useNavigation<any>();

  // const handleLogout = async () => {
  //   // try {
  //   //   await AsyncStorage.removeItem("userToken"); // or "user"
  //   //   navigation.navigate("login");
  //   // } catch (error) {
  //   //   console.log("Logout error:", error);
  //   // }

  //   navigation.reset({
  //     index: 0,
  //     routes: [{ name: "login" }],
  //   });
  // };

  const handleLogout = async () => {
  try {
    await AsyncStorage.removeItem("userToken");
    router.replace("/Login");
  } catch (error) {
    console.log("Logout error:", error);
  }
};

  return (
    <LinearGradient colors={["#EAF4F3", "#FFFFFF"]} style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.avatar} />

          <View style={{ flex: 1 }}>
            <Text style={styles.name}>Aashi Gupta</Text>
            <Text style={styles.level}>Level 3 Wellness Explorer</Text>
            <Text style={styles.tagline}>Building a healthier me.</Text>
          </View>

          <TouchableOpacity
            style={styles.editBtn}
            onPress={() => router.push("/editProfile")}
          >
            <Feather name="edit-2" size={18} color="#2C7A7B" />
          </TouchableOpacity>
        </View>

        {/* WELLNESS SCORE CARD
        <View style={styles.scoreCard}>
          <View style={styles.scoreRow}>
            <Text style={styles.scoreTitle}>Wellness Score</Text>
            <Text style={styles.scoreNumber}>82 / 100</Text>
          </View>

          <View style={styles.progressBar}>
            <View style={styles.progressFill} />
          </View>

          <Text style={styles.xp}>Level 3 +250 XP</Text>
          <Text style={styles.week}>+ 4 this week</Text>
        </View>

        {/* STATS GRID */}
        {/* <View style={styles.grid}>
          {statCard("walk", "7,523 Steps","Today")}
          {statCard("moon", "6h 30 min", "Sleep Last Night")}
          {statCard("fire", "1,850 kcal", "Calories Today")}
          {statCard("smile", "Happy", "x50")}
        </View> */}

        {/* GOALS */}
        {/* <Text style={styles.sectionTitle}>Goals</Text>

        <View style={styles.goalCard}>
          <Text style={styles.goalText}>7 Day Activity Streak 🔥 x7</Text>
        </View>

        <View style={styles.goalCard}>
          <Text style={styles.goalText}>Healthy Meal 😊 x50</Text>
        </View>

        <View style={styles.goalCard}>
          <Text style={styles.goalText}>Mood Tracker Consistency ✔ 81%</Text>
          <View style={styles.progressBarSmall}>
            <View style={styles.progressFillSmall} />
          </View>
        </View> */}

       
        <Text style={styles.sectionTitle}>Settings</Text>

        <TouchableOpacity
          style={styles.infoCard}
          onPress={() => router.push("/editProfile")}
        >
          <Text style={styles.infoText}>Edit Profile</Text>
        </TouchableOpacity>

        {infoButton("Update Health Goals")}

        <TouchableOpacity
          style={styles.infoCard}
          onPress={() => setShowNotifications(true)}
        >
          <Text style={styles.infoText}>Notifications</Text>
        </TouchableOpacity>

        {infoButton("Privacy & Security")}
        {infoButton("Help & Support")}

        

        
        <Text style={styles.sectionTitle}>Personal Info</Text>

        <View style={styles.settingsRow}>
          <Text>Age: 22</Text>
          <Text>165 cm</Text>
          <Text>60 kg</Text>
          <Text>Moderate</Text>
        </View>

<TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>

      </ScrollView>

      <Modal
        visible={showNotifications}
        transparent={true}
        animationType="slide"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.notificationBox}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowNotifications(false)}>
                <Ionicons name="arrow-back" size={24} color="#2C7A7B" />
              </TouchableOpacity>

              <Text style={styles.modalTitle}>Notifications</Text>
            </View>

            <Text style={styles.modalSubtitle}>
              Stay updated with your wellness
            </Text>

            <ScrollView showsVerticalScrollIndicator={false}>
              {notificationCard(
                "🚶",
                "Activity Reminder",
                "You're 2,477 steps away from your daily goal.",
                "10 min ago",
              )}

              {notificationCard(
                "🌙",
                "Sleep Insight",
                "Great job! You slept 6h 30m last night.",
                "2 hours ago",
              )}

              {notificationCard(
                "🥗",
                "Healthy Meal Tip",
                "Try adding more protein to today's lunch.",
                "Today · 1:05 PM",
              )}

              {notificationCard(
                "😊",
                "Mood Check",
                "How are you feeling today? Log your mood.",
                "Yesterday",
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </LinearGradient>
  );
}

function statCard(icon: any, title: string, subtitle: string) {
  return (
    <View style={styles.statCard}>
      <Ionicons name={icon} size={20} color="#2C7A7B" />
      <Text style={styles.statTitle}>{title}</Text>
      <Text style={styles.statSub}>{subtitle}</Text>
    </View>
  );
}

function notificationCard(
  icon: any,
  title: string,
  message: string,
  time: string,
) {
  return (
    <View style={styles.notificationCard}>
      <Text style={styles.emoji}>{icon}</Text>

      <View style={{ flex: 1 }}>
        <View style={styles.rowBetween}>
          <Text style={styles.notificationTitle}>{title}</Text>

          <Text style={styles.time}>{time}</Text>
        </View>

        <Text style={styles.notificationText}>{message}</Text>
      </View>
    </View>
  );
}

function infoButton(title: string) {
  return (
    <TouchableOpacity style={styles.infoCard}>
      <Text style={styles.infoText}>{title}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },

  avatar: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "#CDE7E6",
    marginRight: 15,
  },

  name: {
    fontSize: 22,
    fontWeight: "700",
  },

  level: {
    color: "#6B7280",
  },

  tagline: {
    color: "#6B7280",
  },

  editBtn: {
    backgroundColor: "#E6F4F3",
    padding: 8,
    borderRadius: 20,
  },

  scoreCard: {
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 20,
    marginBottom: 20,
    elevation: 4,
  },

  scoreRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },

  scoreTitle: {
    fontSize: 16,
    fontWeight: "600",
  },

  scoreNumber: {
    fontSize: 20,
    fontWeight: "700",
    color: "#2C7A7B",
  },

  progressBar: {
    height: 10,
    backgroundColor: "#E5E7EB",
    borderRadius: 10,
    marginVertical: 10,
  },

  progressFill: {
    width: "82%",
    height: "100%",
    backgroundColor: "#2C7A7B",
    borderRadius: 10,
  },

  xp: {
    color: "#6B7280",
  },

  week: {
    color: "#2C7A7B",
  },

  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 20,
  },

  statCard: {
    width: "48%",
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 15,
    marginBottom: 15,
    elevation: 3,
  },

  statTitle: {
    fontWeight: "600",
    marginTop: 5,
  },

  statSub: {
    color: "#6B7280",
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginVertical: 15,
  },

  goalCard: {
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 15,
    marginBottom: 10,
    elevation: 3,
  },

  goalText: {
    fontWeight: "600",
  },

  progressBarSmall: {
    height: 8,
    backgroundColor: "#E5E7EB",
    borderRadius: 10,
    marginTop: 8,
  },

  progressFillSmall: {
    width: "81%",
    height: "100%",
    backgroundColor: "#2C7A7B",
    borderRadius: 10,
  },

  infoCard: {
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 15,
    marginBottom: 10,
    elevation: 3,
  },

  infoText: {
    fontWeight: "600",
  },

  settingsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 15,
    elevation: 3,
    marginBottom: 40,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "flex-end",
  },

  notificationBox: {
    backgroundColor: "#F8FBFB",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 20,
    height: "75%",
  },

  modalHeader: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },

  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
  },

  modalSubtitle: {
    color: "#6B7280",
    marginVertical: 10,
  },

  notificationCard: {
    flexDirection: "row",
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    elevation: 4,
  },

  emoji: {
    fontSize: 28,
    marginRight: 12,
  },

  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
  },

  notificationTitle: {
    fontWeight: "600",
  },

  notificationText: {
    color: "#6B7280",
    marginTop: 5,
  },

  time: {
    fontSize: 12,
    color: "#6B7280",
  },
  logoutButton: {
    backgroundColor: "#E53E3E",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 20,
  },

  logoutText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
});
