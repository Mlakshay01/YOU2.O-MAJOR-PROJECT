// files contains Mood constants + "fear/surprised confirmation" logic

export const MOOD_CLASSES_7 = [
  "neutral",
  "sad",
  "happy",
  "disgust",
  "fear",
  "surprised",
  "angry",
];

// need user to confirm/retake for these:
export const HIGH_AROUSAL_CONFIRM = new Set(["fear", "surprised"]);

export function moodToValence(mood) {
  if (mood === "happy") return 1;
  if (mood === "neutral" || mood === "surprised") return 0;
  return -1; // sad, angry, fear, disgust, surprised
}

export function moodToArousal(mood) {
  if (mood === "neutral" || mood === "sad") return 0.0; // low
  if (mood === "happy" || mood === "disgust") return 0.5; // medium
  if (mood === "angry" || mood === "fear" || mood === "surprised") return 1.0; // high
  return 0.0;
}