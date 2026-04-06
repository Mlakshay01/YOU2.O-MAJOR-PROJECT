// Health score

import { moodToValence, moodToArousal } from "./moodLogic";

export function computeMoodScore7(entries) {
  // entries: array of mood entries sorted newest-first
  const last7 = entries.slice(0, 7);

  if (last7.length === 0) return { score: null, moodAvg: null, arousalAvg: null };

  let vSum = 0;
  let aSum = 0;

  for (const e of last7) {
    const m = e.finalMood || e?.predicted?.cls;
    if (!m) continue;
    vSum += moodToValence(m);
    aSum += moodToArousal(m);
  }

  const n = last7.length;
  const vAvg = vSum / n; // -1..1
  const aAvg = aSum / n; // 0..1

  // Converting into 0..100 score
  // Valence contributes more than arousal.
  const valencePart = (vAvg + 1) / 2; // 0..1
  const arousalPenalty = aAvg * 0.15; // penalize high arousal a bit
  const score01 = Math.max(0, Math.min(1, valencePart - arousalPenalty));
  const score = Math.round(score01 * 100);

  return { score, moodAvg: vAvg, arousalAvg: aAvg };
}