// logic/healthScore.js
// Client-side mood score — mirrors the server's wellness_score.py logic.
// Used for local display only; the authoritative score comes from the backend.

import { moodToValence, moodToArousal, moodImpact } from "./moodLogic";

/**
 * Computes a 0–100 mood score from the last 7 mood entries.
 *
 * Uses the same Russell Circumplex formula as the Python backend:
 *   impact = (valence × 0.7) + ((1 − arousal) × 0.3), normalised to [-1, +1]
 *   score  = ((avg_impact + 1) / 2) × 100
 *
 * Arousal penalty removed — high arousal is not inherently bad (happy is
 * medium-arousal and positive). The impact formula already handles this
 * because high arousal + negative valence (anger/fear) produces a large
 * negative valence term that dominates.
 *
 * @param {Array} entries - Mood entries sorted newest-first.
 *   Each entry: { finalMood?: string, predicted?: { cls?: string } }
 * @returns {{ score: number|null, impactAvg: number|null, dominant: string|null }}
 */
export function computeMoodScore7(entries) {
  const last7 = entries.slice(0, 7);
  if (last7.length === 0) return { score: null, impactAvg: null, dominant: null };

  const moodCounts = {};
  let impactSum = 0;
  let validCount = 0;

  for (const e of last7) {
    const m = e.finalMood || e?.predicted?.cls;
    if (!m) continue;

    impactSum += moodImpact(m);
    validCount++;
    moodCounts[m] = (moodCounts[m] || 0) + 1;
  }

  if (validCount === 0) return { score: null, impactAvg: null, dominant: null };

  const impactAvg = impactSum / validCount;             // -1 to +1
  const score     = Math.round(((impactAvg + 1) / 2) * 100); // 0–100

  const dominant = Object.entries(moodCounts)
    .sort((a, b) => b[1] - a[1])[0][0];

  return { score, impactAvg, dominant };
}