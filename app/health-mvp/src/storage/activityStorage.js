import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "HEALTH_ACTIVITY";

/*
Structure per day

{
  date: "2026-03-05",
  steps: 5200,
  sleep: 7.5,
  water: 1200,
  waterLogs: [
    { time: "10:30", amount: 250 }
  ],
  sedentary: 6
}
*/

// Generic save
export async function saveMetric(date, metric, value) {
  const raw = await AsyncStorage.getItem(KEY);
  const list = raw ? JSON.parse(raw) : [];

  let entry = list.find(e => e.date === date);

  if (!entry) {
    entry = {
      date,
      steps: 0,
      sleep: 0,
      water: 0,
      waterLogs: [],
      sedentary: 0,
    };
    list.push(entry);
  }

  entry[metric] = value;

  await AsyncStorage.setItem(KEY, JSON.stringify(list));
}

// ✅ Water (event-based)
export async function addWaterLog(amount) {
  const today = new Date().toISOString().slice(0, 10);
  const time = new Date().toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  const raw = await AsyncStorage.getItem(KEY);
  const list = raw ? JSON.parse(raw) : [];

  let entry = list.find(e => e.date === today);

  if (!entry) {
    entry = {
      date: today,
      steps: 0,
      sleep: 0,
      water: 0,
      waterLogs: [],
      sedentary: 0,
    };
    list.push(entry);
  }

  if (!entry.waterLogs) entry.waterLogs = [];

  entry.water += amount;

  entry.waterLogs.push({
    time,
    amount,
  });

  await AsyncStorage.setItem(KEY, JSON.stringify(list));

  return entry;
}

// Get all entries
export async function getActivityEntries() {
  const raw = await AsyncStorage.getItem(KEY);
  return raw ? JSON.parse(raw) : [];
}

// Get today
export async function getTodayActivity() {
  const list = await getActivityEntries();
  const today = new Date().toISOString().slice(0, 10);

  return (
    list.find(e => e.date === today) || {
      date: today,
      steps: 0,
      sleep: 0,
      water: 0,
      waterLogs: [],
      sedentary: 0,
    }
  );
}