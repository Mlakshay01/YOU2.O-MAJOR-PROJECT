// notifications/Notifications.ts
//
// Notification strategy
// ──────────────────────
// Rather than a polling interval that fires while the app is open,
// we SCHEDULE local notifications at meaningful times after wake-up.
//
// Hydration schedule (relative to wake hour):
//   +1.5h  — first reminder (body needs time to settle after waking)
//   +3.0h
//   +5.0h
//   +7.0h
//   +9.0h
//   +11.0h — last reminder before typical sleep
//
// Mood check-in: once per day, 2h after wake (when user is alert but settled)
//
// All schedules are rebuilt each day on app open, after wake hour is known.
// Previously scheduled notifications are cancelled before rescheduling to
// avoid duplicates.
//
// Notification state (last drink time, last notified time) is persisted in
// AsyncStorage so it survives app restarts.

import * as Notifications from "expo-notifications";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

// ── Storage keys ──────────────────────────────────────────────────────────────
const KEY_LAST_DRINK      = "NOTIF_LAST_DRINK_TIME";
const KEY_NOTIF_SCHEDULED = "NOTIF_SCHEDULED_DATE";  // ISO date — prevents re-scheduling same day

// ── Notification channel setup (Android) ─────────────────────────────────────
export async function setupNotificationChannel() {
  await Notifications.setNotificationChannelAsync("hydration", {
    name:              "Hydration Reminders",
    importance:        Notifications.AndroidImportance.HIGH,
    vibrationPattern:  [0, 250, 250, 250],
    lightColor:        "#38BDF8",
  });

  await Notifications.setNotificationChannelAsync("mood", {
    name:      "Mood Check-in",
    importance: Notifications.AndroidImportance.DEFAULT,
  });

  await Notifications.setNotificationChannelAsync("wellness", {
    name:      "Wellness Reminders",
    importance: Notifications.AndroidImportance.DEFAULT,
  });
}

// ── Permission request ────────────────────────────────────────────────────────
export async function requestNotificationPermission(): Promise<boolean> {
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === "granted") return true;

  const { status } = await Notifications.requestPermissionsAsync();
  return status === "granted";
}

// ── Cancel all scheduled notifications of a category ─────────────────────────
async function cancelByIdentifierPrefix(prefix: string) {
  if (Platform.OS === "web") return; // 🚨 skip on web
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  for (const n of scheduled) {
    if (n.identifier.startsWith(prefix)) {
      await Notifications.cancelScheduledNotificationAsync(n.identifier);
    }
  }
}

// ── Schedule hydration reminders for today ────────────────────────────────────
/**
 * @param wakeHour  - Integer hour the user woke (e.g. 7 for 7 AM).
 *                    Pass null to use a default of 7.
 * @param force     - Re-schedule even if already scheduled today.
 */
export async function scheduleHydrationReminders(
  
  wakeHour: number | null,
  force = false,
) {
  const granted = await requestNotificationPermission();
  if (!granted) return;

  const today = new Date().toISOString().slice(0, 10);

  // Don't re-schedule if already done today (unless forced)
  if (!force) {
    const lastScheduled = await AsyncStorage.getItem(KEY_NOTIF_SCHEDULED);
    if (lastScheduled === today) return;
  }

  // Cancel any existing hydration notifications first
  await cancelByIdentifierPrefix("hydration-");

  const effectiveWakeHour = wakeHour ?? 7;

  // Reminder offsets in hours after wake-up
  // First one at +1.5h — give the user time to settle after waking
  const offsets = [1.5, 3.0, 5.0, 7.0, 9.0, 11.0];

  const now = new Date();

  for (let i = 0; i < offsets.length; i++) {
    const fireTime = new Date();
    fireTime.setHours(effectiveWakeHour, 0, 0, 0);
    fireTime.setTime(fireTime.getTime() + offsets[i] * 60 * 60 * 1000);

    // Skip reminders that are in the past
    if (fireTime <= now) continue;

    // Don't schedule past 10 PM
    if (fireTime.getHours() >= 22) continue;

    await Notifications.scheduleNotificationAsync({
      identifier: `hydration-${i}`,
      content: {
        title:    "💧 Time to hydrate",
        body:     hydrationMessages[i % hydrationMessages.length],
        sound:    true,
        data:     { type: "hydration" },
        // Android channel
        ...(({ channelId: "hydration" }) as any),
      },
      trigger: { date: fireTime },
    });
  }

  await AsyncStorage.setItem(KEY_NOTIF_SCHEDULED, today);
}

// ── Schedule mood check-in ────────────────────────────────────────────────────
export async function scheduleMoodCheckIn(wakeHour: number | null) {
  const granted = await requestNotificationPermission();
  if (!granted) return;

  await cancelByIdentifierPrefix("mood-");

  const effectiveWakeHour = wakeHour ?? 7;

  // 2 hours after wake — user is alert but settled
  const fireTime = new Date();
  fireTime.setHours(effectiveWakeHour, 0, 0, 0);
  fireTime.setTime(fireTime.getTime() + 2 * 60 * 60 * 1000);

  if (fireTime <= new Date()) return; // already past

  await Notifications.scheduleNotificationAsync({
    identifier: "mood-daily",
    content: {
      title: "How are you feeling today?",
      body:  "Take a moment to log your mood — it only takes a second.",
      sound: true,
      data:  { type: "mood", screen: "/mood" },
    },
    trigger: { date: fireTime },
  });
}

// ── Immediate hydration reminder (manual trigger / fallback) ──────────────────
// Only used if the user hasn't drunk water in a very long time and the app
// is open. Prefer scheduled notifications over this.
export async function sendHydrationReminder() {
  const granted = await requestNotificationPermission();
  if (!granted) return;

  await Notifications.scheduleNotificationAsync({
    identifier: `hydration-manual-${Date.now()}`,
    content: {
      title: "💧 Don't forget to hydrate",
      body:  "You haven't logged any water in a while. Small sips count!",
      sound: true,
      data:  { type: "hydration" },
    },
    trigger: null, // immediate
  });
}

// ── Persist last drink time ───────────────────────────────────────────────────
export async function persistLastDrinkTime(timestamp: number) {
  await AsyncStorage.setItem(KEY_LAST_DRINK, String(timestamp));
}

export async function getLastDrinkTime(): Promise<number> {
  const raw = await AsyncStorage.getItem(KEY_LAST_DRINK);
  return raw ? parseInt(raw, 10) : Date.now();
}

// ── Notification response handler (deep link on tap) ─────────────────────────
export function registerNotificationResponseHandler(
  router: { push: (path: string) => void },
) {
  return Notifications.addNotificationResponseReceivedListener((response) => {
    const data = response.notification.request.content.data as any;
    if (data?.screen) {
      router.push(data.screen);
    }
  });
}

// ── Message pool ─────────────────────────────────────────────────────────────
const hydrationMessages = [
  "Start your day right — drink a glass of water.",
  "Your body is ~60% water. Top it up! 💧",
  "A quick sip keeps energy levels steady.",
  "Midday check: have you had enough water today?",
  "Staying hydrated helps your focus and mood.",
  "Almost evening — finish strong with your water goal.",
];