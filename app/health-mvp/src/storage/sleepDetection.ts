import AsyncStorage from "@react-native-async-storage/async-storage";
import { Pedometer, Accelerometer } from "expo-sensors";

const SLEEP_KEY = "sleep_detection";
const ACCEL_STILL_THRESHOLD = 0.05;  // magnitude below this = still
const STEP_THRESHOLD = 50;            // steps per 15-min = active
const SAMPLE_DURATION_MS = 10000;     // sample accelerometer for 10s per window

interface WindowSample {
  time: Date;
  isStill: boolean;
  steps: number;
}

interface SleepData {
  date: string;
  estimatedSleepTime: string;
  estimatedWakeTime: string;
  wakeHour: number;
}

// ── AsyncStorage helpers ──────────────────────────────────────────────────────
export const getAllSleepData = async (): Promise<Record<string, SleepData>> => {
  const raw = await AsyncStorage.getItem(SLEEP_KEY);
  return raw ? JSON.parse(raw) : {};
};

const saveSleepData = async (all: Record<string, SleepData>) => {
  await AsyncStorage.setItem(SLEEP_KEY, JSON.stringify(all));
};

// ── Sample accelerometer for N seconds, return avg magnitude ─────────────────
const sampleAccelerometer = (durationMs: number): Promise<number> => {
  return new Promise((resolve) => {
    const samples: number[] = [];

    Accelerometer.setUpdateInterval(200); // sample every 200ms
    const sub = Accelerometer.addListener(({ x, y, z }) => {
      const magnitude = Math.sqrt(x * x + y * y + z * z);
      samples.push(magnitude);
    });

    setTimeout(() => {
      sub.remove();
      const avg =
        samples.length > 0
          ? samples.reduce((a, b) => a + b, 0) / samples.length
          : 1;
      resolve(avg);
    }, durationMs);
  });
};

// ── Analyze a time range using BOTH pedometer + accelerometer ─────────────────
const analyzeWindow = async (
  windowStart: Date,
  windowEnd: Date,
  isCurrentWindow: boolean
): Promise<WindowSample> => {
  const pedometerAvailable = await Pedometer.isAvailableAsync();

  // Steps from pedometer (historical)
  let steps = 0;
  if (pedometerAvailable) {
    try {
      const result = await Pedometer.getStepCountAsync(windowStart, windowEnd);
      steps = result?.steps ?? 0;
    } catch {
      steps = 0;
    }
  }

  // Accelerometer only makes sense for the CURRENT window
  let isStill = steps < STEP_THRESHOLD; // fallback for historical
  if (isCurrentWindow) {
    try {
      const avgMagnitude = await sampleAccelerometer(SAMPLE_DURATION_MS);
      isStill = avgMagnitude < ACCEL_STILL_THRESHOLD;
    } catch {
      isStill = steps < STEP_THRESHOLD;
    }
  }

  return { time: windowStart, isStill, steps };
};

// ── Detect last night's sleep time (last active → still transition) ───────────
export const detectLastNightSleepTime = async (): Promise<Date | null> => {
  const isAvailable = await Pedometer.isAvailableAsync();
  if (!isAvailable) return null;

  // Scan 8pm yesterday → 2am today
  const scanStart = new Date();
  scanStart.setDate(scanStart.getDate() - 1);
  scanStart.setHours(20, 0, 0, 0);

  const scanEnd = new Date();
  scanEnd.setHours(2, 0, 0, 0);

  if (new Date() < scanEnd) return null; // too early

  const WINDOW = 15; // minutes
  const totalMinutes = (scanEnd.getTime() - scanStart.getTime()) / 60000;
  const windows = Math.floor(totalMinutes / WINDOW);

  try {
    const results: WindowSample[] = [];

    for (let i = 0; i < windows; i++) {
      const ws = new Date(scanStart.getTime() + i * WINDOW * 60000);
      const we = new Date(ws.getTime() + WINDOW * 60000);
      // Historical windows — pedometer only (can't go back in accelerometer time)
      const sample = await analyzeWindow(ws, we, false);
      results.push(sample);
    }

    // Find last window where user was ACTIVE before going still
    let lastActiveTime: Date | null = null;
    results.forEach(({ time, steps }) => {
      if (steps >= STEP_THRESHOLD) lastActiveTime = time;
    });

    return lastActiveTime;
  } catch {
    return null;
  }
};

// ── Detect today's wake time (first active window after 4am) ─────────────────
export const detectTodayWakeTime = async (): Promise<Date | null> => {
  const scanStart = new Date();
  scanStart.setHours(4, 0, 0, 0);
  const scanEnd = new Date();

  const WINDOW = 15;
  const totalMinutes = (scanEnd.getTime() - scanStart.getTime()) / 60000;
  const windows = Math.floor(totalMinutes / WINDOW);

  if (windows <= 0) return null;

  try {
    const results: WindowSample[] = [];

    for (let i = 0; i < windows; i++) {
      const ws = new Date(scanStart.getTime() + i * WINDOW * 60000);
      const we = new Date(ws.getTime() + WINDOW * 60000);
      const isLast = i === windows - 1;
      // Use accelerometer for the most recent window
      const sample = await analyzeWindow(ws, we, isLast);
      results.push(sample);
    }

    // First window where user became active (still → active transition)
    // Must have 2 consecutive still windows before to confirm was actually asleep
    for (let i = 2; i < results.length; i++) {
      const prevPrev = results[i - 2];
      const prev     = results[i - 1];
      const curr     = results[i];

      const wasAsleep = prevPrev.isStill && prev.isStill;
      const nowAwake  = !curr.isStill || curr.steps >= STEP_THRESHOLD;

      if (wasAsleep && nowAwake) {
        return curr.time;
      }
    }

    return null;
  } catch {
    return null;
  }
};

// ── Master function ───────────────────────────────────────────────────────────
export const detectAndSaveWakeHour = async (): Promise<number> => {
  const DEFAULT_WAKE_HOUR = 7;

  try {
    const today = new Date().toISOString().slice(0, 10);
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayKey = yesterday.toISOString().slice(0, 10);

    const all = await getAllSleepData();

    // Run detections in parallel
    const [sleepTime, wakeTime] = await Promise.all([
      detectLastNightSleepTime(),
      detectTodayWakeTime(),
    ]);

    // Save sleep time to yesterday's record
    if (sleepTime) {
      all[yesterdayKey] = {
        ...(all[yesterdayKey] ?? { date: yesterdayKey, estimatedWakeTime: "", wakeHour: DEFAULT_WAKE_HOUR }),
        estimatedSleepTime: sleepTime.toISOString(),
      };
    }

    // Save wake time to today's record
    if (wakeTime) {
      const wakeHour = wakeTime.getHours();
      all[today] = {
        ...(all[today] ?? { date: today, estimatedSleepTime: "", estimatedWakeTime: "" }),
        estimatedWakeTime: wakeTime.toISOString(),
        wakeHour,
      };
      await saveSleepData(all);
      return wakeHour;
    }

    await saveSleepData(all);

    // Fallback chain:
    // 1. Today's cached wake hour
    if (all[today]?.wakeHour) return all[today].wakeHour;
    // 2. Yesterday's wake hour
    if (all[yesterdayKey]?.wakeHour) return all[yesterdayKey].wakeHour;
    // 3. Hardcoded default
    return DEFAULT_WAKE_HOUR;
  } catch {
    return DEFAULT_WAKE_HOUR;
  }
};

// ── Get sleep summary for display on dashboard ────────────────────────────────
export const getTodaySleepSummary = async (): Promise<{
  wakeTime: string;
  sleepTime: string;
  hoursSlept: number | null;
} | null> => {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayKey = yesterday.toISOString().slice(0, 10);

    const all = await getAllSleepData();
    const todayData     = all[today];
    const yesterdayData = all[yesterdayKey];

    if (!todayData?.estimatedWakeTime || !yesterdayData?.estimatedSleepTime) {
      return null;
    }

    const wake  = new Date(todayData.estimatedWakeTime);
    const sleep = new Date(yesterdayData.estimatedSleepTime);
    const hoursSlept = parseFloat(
      ((wake.getTime() - sleep.getTime()) / 3600000).toFixed(1)
    );

    return {
      wakeTime:   wake.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      sleepTime:  sleep.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      hoursSlept: hoursSlept > 0 ? hoursSlept : null,
    };
  } catch {
    return null;
  }
};