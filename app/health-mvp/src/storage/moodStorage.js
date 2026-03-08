// we store daily mood entries like: 
// { date: "2026-02-24", predicted: {cls, conf}, finalMood, override, photoUri }

import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "mood_entries_v1";

export async function getMoodEntries() {
  const raw = await AsyncStorage.getItem(KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function upsertMoodEntry(entry) {
  const list = await getMoodEntries();
  const idx = list.findIndex((x) => x.date === entry.date);
  let next;
  if (idx >= 0) {
    next = [...list];
    next[idx] = entry;
  } else {
    next = [entry, ...list];
  }
  await AsyncStorage.setItem(KEY, JSON.stringify(next));
  return next;
}