import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { useEffect } from "react";
import * as Notifications from "expo-notifications";
import AsyncStorage from "@react-native-async-storage/async-storage";

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

  useEffect(() => {
  const requestPermission = async () => {
    const { status } = await Notifications.requestPermissionsAsync();

    if (status !== "granted") {
      alert("Enable notifications for reminders!");
    }
  };

  requestPermission();
}, []);

useEffect(() => {
  const sub = Notifications.addNotificationResponseReceivedListener(async (response) => {
    const action = response.actionIdentifier;

    let amount = 0;
    if (action === "ADD_150") amount = 150;
    if (action === "ADD_250") amount = 250;

    if (amount > 0) {
      const today = new Date().toISOString().slice(0, 10);

      const raw = await AsyncStorage.getItem("HEALTH_ACTIVITY");
      const list = raw ? JSON.parse(raw) : [];

      let entry = list.find((e) => e.date === today);

      if (!entry) {
        entry = { date: today, water: 0, waterLogs: [] };
        list.push(entry);
      }

      const time = new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });

      entry.water += amount;
      entry.waterLogs.push({ time, amount });

      await AsyncStorage.setItem("HEALTH_ACTIVITY", JSON.stringify(list));
    }
  });

  return () => sub.remove();
}, []);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
