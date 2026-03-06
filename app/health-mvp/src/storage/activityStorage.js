import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "HEALTH_ACTIVITY";

/*
Structure stored per day

{
  date:"2026-03-05",
  steps:5200,
  sleep:7.5,
  water:1200
}
*/

export async function saveMetric(date, metric, value) {
  const raw = await AsyncStorage.getItem(KEY);
  const list = raw ? JSON.parse(raw) : [];

  let entry = list.find(e => e.date === date);

  if (!entry) {
    entry = { date };
    list.push(entry);
  }

  entry[metric] = value;

  await AsyncStorage.setItem(KEY, JSON.stringify(list));
}

export async function getActivityEntries() {
  const raw = await AsyncStorage.getItem(KEY);
  return raw ? JSON.parse(raw) : [];
}

export async function getTodayActivity() {

  const list = await getActivityEntries();
  const today = new Date().toISOString().slice(0,10);

  return list.find(e => e.date === today) || {
    date:today,
    steps:0,
    sleep:0,
    water:0
  };
}