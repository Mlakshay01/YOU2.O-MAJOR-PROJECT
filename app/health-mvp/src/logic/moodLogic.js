// logic/moodLogic.js
// Mood constants + Russell Circumplex helpers

export const MOOD_CLASSES_7 = [
  "neutral",
  "happy",
  "sad",
  "angry",
  "fear",
  "disgust",
  "surprised",
];

// Emoji map for every mood — used by MoodPicker and display components
export const MOOD_EMOJI = {
  neutral:   "😐",
  happy:     "😊",
  sad:       "😢",
  angry:     "😠",
  fear:      "😨",
  disgust:   "🤢",
  surprised: "😲",
};

// Moods that are likely fleeting/high-intensity — ask user to confirm or retake
export const HIGH_AROUSAL_CONFIRM = new Set(["fear", "surprised"]);

// ── Russell Circumplex Model ──────────────────────────────────────────────────
// Valence: how positive/negative the emotion is (-1 to +1)
// Arousal: how activated/intense the emotion is (0 to 1)
//
// Source: Russell (1980) Circumplex Model of Affect;
//         Pressman & Cohen (2005) Psychol Bull — positive affect predicts health.

export function moodToValence(mood) {
  if (mood === "happy")                      return  1.0;   // positive
  if (mood === "neutral" || mood === "surprised") return  0.0;  // neutral valence
  return -1.0; // sad, angry, fear, disgust → negative valence
}

export function moodToArousal(mood) {
  if (mood === "neutral" || mood === "sad")           return 0.0;  // low arousal
  if (mood === "happy"   || mood === "disgust")       return 0.5;  // medium arousal
  if (mood === "angry"   || mood === "fear" || mood === "surprised") return 1.0; // high arousal
  return 0.0;
}

// Composite mood impact in [-1, +1] — mirrors wellness_score.py
// Formula: (valence × 0.7) + ((1 − arousal) × 0.3), normalised
export function moodImpact(mood) {
  const raw    = moodToValence(mood) * 0.7 + (1 - moodToArousal(mood)) * 0.3;
  const rawMin = -0.70;
  const rawMax =  0.85;
  const mid    = (rawMin + rawMax) / 2;   //  0.075
  const half   = (rawMax - rawMin) / 2;   //  0.775
  return Math.max(-1, Math.min(1, (raw - mid) / half));
}