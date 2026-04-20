# core/wellness_score.py
#
# Evidence-based Wellness Score (0–100)
# Each metric produces an IMPACT in [-1.0, +1.0].
# Negative impact = habit is actively harmful; positive = beneficial.
#
# Final score = ((weighted_sum_of_impacts + 1) / 2) * 100
#   → all impacts at -1  ≈  0   (everything harmful)
#   → all impacts at  0  ≈  50  (average / neutral habits)
#   → all impacts at +1  ≈  100 (optimal on every metric)
#
# ── Scientific sources per metric ────────────────────────────────────────────
#
# SLEEP
#   • Cappuccio et al. (2010), Sleep — meta-analysis of 16 studies, 1.38M participants.
#     Short sleep (≤5h) → RR 1.12 all-cause mortality; long sleep (≥9h) → RR 1.30.
#     Recommended: 6–8h; ≤5h = higher risk group.
#   • Liu et al. (JAHA, 2018) — dose-response meta-analysis of 40 cohorts.
#     Lowest risk at ~7h; RR +1.06 per hour below 7h, +1.13 per hour above 7h.
#   • Frontiers Public Health (2022, NHANES) — sleep <5h or >9h significantly
#     associated with elevated all-cause and CVD mortality.
#   Thresholds used: harmful floor = 5h, optimal = 7–8h, harmful ceiling = 10h.
#
# STEPS
#   • Paluch et al. (Lancet Public Health, 2022) — meta-analysis of 15 cohorts,
#     47k adults. Risk plateau at 6,000–8,000 steps for ≥60y; 8,000–10,000 for <60y.
#   • Banach et al. (Eur J Prev Cardiol, 2023) — 17 cohorts, 226k participants.
#     Cut-off for all-cause mortality benefit: 3,867 steps/day.
#     Cut-off for CV mortality benefit: 2,337 steps/day.
#     Each 1,000-step increment → 15% lower all-cause mortality risk.
#   • Paluch et al. (Circulation, 2023) — 6,000–9,000 steps → 40–50% lower CVD risk
#     vs. 2,000 steps/day.
#   Thresholds used: harmful floor = 2,000, neutral = 3,867, optimal = 8,000.
#
# SEDENTARY TIME
#   • Biswas et al. (Ann Intern Med, 2015) / Pandey et al. (JAMA Cardiol, 2016) —
#     continuous dose-response; each additional hour sedentary → ~5% higher CVD risk.
#   • Ekelund et al. (BMJ, 2016) / WHO Guidelines (2020) — non-linear association;
#     risk threshold for all-cause mortality: >8h/day sitting; CVD mortality: >6h/day.
#   • BMC Public Health (2022) — highest sedentary category (10.2h/d) vs lowest
#     (2.98h/d): HR 1.29 for CVD mortality.
#   Thresholds used: optimal ≤5h, risk onset at 6h, harmful ≥10h.
#
# WATER
#   • EFSA Dietary Reference Values (2010) — Adequate Intake (AI):
#     2.0L/day women, 2.5L/day men. We use 2.0L as the general optimal floor.
#   • StatPearls / NCBI (2025) — at least 2–3L/day recommended clinically;
#     inadequate intake leads to cognitive decline, hospitalisation, morbidity.
#   • Armstrong et al. (Nutrition Reviews, 2024) — 25–35% of adults chronically
#     below AI; low intake linked to kidney disease, UTI, impaired cognition.
#   • NHANES analysis (PMC 2022) — alternative AI ≥1,500mL/day; below this
#     significantly associated with worse cognitive performance.
#   Thresholds used: harmful floor = 500ml, neutral = 1,500ml, optimal = 2,500ml.
#
# MOOD
#   • Russell (1980) Circumplex Model of Affect — peer-validated 2D model (valence +
#     arousal) widely used in health psychology and psychophysiology research.
#   • APA / Pressman & Cohen (2005) Psychol Bull — positive affect independently
#     predicts lower mortality and better immune function; negative high-arousal
#     states (anger, fear) drive cortisol and sympathetic nervous system activation.
#   Formula: impact = (valence × 0.7) + ((1 − arousal) × 0.3), normalised to [-1, +1].
#   Valence weighted 70% as primary health predictor; arousal 30% as modulator.
#
# FOOD
#   • Mifflin-St Jeor (1990) — gold-standard BMR formula validated across populations.
#   • Hall et al. (Cell Metabolism, 2019) — caloric deficit/surplus directly drives
#     body composition changes; personalised targets outperform population averages.
#   • WHO dietary guidelines (2020) — intake deviating >30% from TDEE increases
#     metabolic risk regardless of direction.
#   • Mozaffarian et al. (NEJM, 2011) — chronic caloric excess primary driver of
#     weight gain and downstream disease risk.
#   Ratio-based thresholds: <0.75 = deficit, 0.75–1.10 = optimal, >1.60 = severe excess.
#   Falls back to population thresholds when ideal_calories unavailable.
#
# ── Weights (must sum to 1.0) ─────────────────────────────────────────────────
#   Sleep      28%  — strongest single predictor of recovery and mortality (WHO/CDC)
#   Steps      23%  — dose-response evidence strongest for physical activity
#   Mood       18%  — APA: chronic negative affect predicts physical illness
#   Sedentary  14%  — independent risk factor even after adjusting for exercise
#   Food        9%  — caloric balance — moderate independent predictor
#   Water       8%  — important but easier to correct; weaker mortality signal

from typing import Optional
from collections import Counter


WEIGHTS = {
    "sleep":     0.28,
    "steps":     0.23,
    "mood":      0.18,
    "sedentary": 0.14,
    "food":      0.09,
    "water":     0.08,
}


# ── Mood helpers ──────────────────────────────────────────────────────────────

def mood_to_valence(mood: str) -> float:
    if mood == "happy":
        return 1.0
    if mood in ("neutral", "surprised"):
        return 0.0
    return -1.0  # sad, angry, fear, disgust


def mood_to_arousal(mood: str) -> float:
    if mood in ("neutral", "sad"):
        return 0.0
    if mood in ("happy", "disgust"):
        return 0.5
    if mood in ("angry", "fear", "surprised"):
        return 1.0
    return 0.0


def mood_impact(mood: str) -> float:
    """
    Impact in [-1, +1] via Russell Circumplex Model.
    Formula: (valence × 0.7) + ((1 − arousal) × 0.3), normalised from raw [-0.70, 0.85].
    """
    raw = (mood_to_valence(mood) * 0.7) + ((1.0 - mood_to_arousal(mood)) * 0.3)
    raw_min, raw_max = -0.70, 0.85
    mid  = (raw_min + raw_max) / 2    # 0.075
    half = (raw_max - raw_min) / 2    # 0.775
    return max(-1.0, min(1.0, (raw - mid) / half))


# ── Metric impact functions (all return [-1.0, +1.0]) ────────────────────────

def sleep_impact(hours: float) -> float:
    """
    U-shaped mortality curve. Optimal: 7–8h. Harmful below 5h or above 10h.
    Source: Cappuccio et al. (Sleep, 2010); Liu et al. (JAHA, 2018).
    """
    if hours <= 5.0:
        return -1.0
    if hours <= 7.0:
        return -1.0 + ((hours - 5.0) / 2.0) * 2.0   # -1 → +1 over 5–7h
    if hours <= 8.0:
        return 1.0                                    # optimal plateau
    if hours <= 10.0:
        return 1.0 - ((hours - 8.0) / 2.0) * 2.0    # +1 → -1 over 8–10h
    return -1.0


def steps_impact(steps: int) -> float:
    """
    Nonlinear inverse dose-response. No evidence of upper harm.
    Source: Banach et al. (Eur J Prev Cardiol, 2023); Paluch et al. (Lancet, 2022).
    """
    if steps <= 2000:
        return -1.0
    if steps <= 3867:
        return -1.0 + ((steps - 2000) / 1867.0)      # -1 → 0 over 2000–3867
    if steps <= 8000:
        return (steps - 3867) / 4133.0               # 0 → +1 over 3867–8000
    return 1.0


def sedentary_impact(hours: float) -> float:
    """
    Each additional hour sedentary → ~5% CVD risk increase.
    Source: Pandey et al. (JAMA Cardiol, 2016); WHO Guidelines (2020).
    """
    if hours <= 5.0:
        return 1.0
    if hours <= 6.0:
        return 1.0 - ((hours - 5.0) / 1.0) * 0.5    # +1.0 → +0.5 over 5–6h
    if hours <= 8.0:
        return 0.5 - ((hours - 6.0) / 2.0) * 0.5    # +0.5 → 0.0 over 6–8h
    if hours <= 10.0:
        return -((hours - 8.0) / 2.0)               # 0.0 → -1.0 over 8–10h
    return -1.0


def water_impact(ml: int) -> float:
    """
    EFSA AI: 2,000ml women / 2,500ml men. Alternative AI floor: ≥1,500ml.
    Source: EFSA Dietary Reference Values (2010); Armstrong et al. (2024).
    """
    if ml <= 500:
        return -1.0
    if ml <= 1500:
        return -1.0 + ((ml - 500) / 1000.0)         # -1 → 0 over 500–1500ml
    if ml <= 2500:
        return (ml - 1500) / 1000.0                 # 0 → +1 over 1500–2500ml
    return 1.0


def food_impact(avg_calories: float, ideal_calories: Optional[float] = None) -> float:
    """
    Personalised caloric impact using ratio against Mifflin-St Jeor TDEE when
    ideal_calories is available. Falls back to population-level thresholds otherwise.

    Ratio thresholds (actual / ideal):
      < 0.75          → -0.5  under-eating: nutritional deficiency risk
      0.75 – 1.10     → +1.0  optimal: within healthy range of personal TDEE
      1.10 – 1.30     →  0.0  slightly high: borderline/neutral
      1.30 – 1.60     → -0.5  high: weight gain and metabolic risk
      > 1.60          → -1.0  severe excess: high disease risk

    Population fallback (no user profile):
      < 1200 kcal     → -1.0  severe under-eating
      1200 – 1500     → -0.3  mild under-eating
      1500 – 2200     → +1.0  broadly optimal
      2200 – 2600     →  0.0  mild excess
      2600 – 3000     → -0.5  moderate excess
      > 3000          → -1.0  severe excess

    Source: Mifflin-St Jeor (1990); Hall et al. (Cell Metabolism, 2019);
            WHO dietary guidelines (2020); Mozaffarian et al. (NEJM, 2011).
    """
    if avg_calories is None:
        return None

    if ideal_calories is not None and ideal_calories > 0:
        ratio = avg_calories / ideal_calories
        if ratio < 0.75:
            return -0.5
        if ratio <= 1.10:
            return 1.0
        if ratio <= 1.30:
            return 0.0
        if ratio <= 1.60:
            return -0.5
        return -1.0

    # Population-level fallback
    if avg_calories < 1200:
        return -1.0
    if avg_calories < 1500:
        return -0.3
    if avg_calories <= 2200:
        return 1.0
    if avg_calories <= 2600:
        return 0.0
    if avg_calories <= 3000:
        return -0.5
    return -1.0


# ── Master scorer ─────────────────────────────────────────────────────────────

def compute_wellness_score(records: list, ideal_calories: Optional[float] = None) -> dict:
    """
    Takes a list of daily activity dicts (up to 28 days) and optionally the
    user's personalised ideal daily calorie target (from Mifflin-St Jeor × activity).

    Null days are excluded from each metric's average — they do NOT count as 0.
    Missing metrics redistribute weight proportionally so score stays 0–100.

    Returns:
        {
          "score": 62,
          "breakdown": {
            "sleep":     { "avg": 6.2, "impact": -0.40, "weighted_impact": -0.120 },
            "steps":     { "avg": 7200, "impact": 0.80, "weighted_impact": 0.200 },
            "mood":      { "dominant": "neutral", "impact": 0.29, "weighted_impact": 0.058 },
            "sedentary": { "avg": 7.5, "impact": 0.25, "weighted_impact": 0.038 },
            "water":     { "avg": 1800, "impact": 0.30, "weighted_impact": 0.030 },
            "food":      { "avg": 2100, "impact": 1.0,  "weighted_impact": 0.090,
                           "ideal": 2200, "ratio": 0.95 },
          }
        }
    """
    if not records:
        return {"score": 0, "breakdown": {}}

    # ── Collect non-null values ───────────────────────────────────
    sleep_vals     = [r["sleep"]     for r in records if r.get("sleep")     is not None]
    steps_vals     = [r["steps"]     for r in records if r.get("steps")     is not None]
    sedentary_vals = [r["sedentary"] for r in records if r.get("sedentary") is not None]
    water_vals     = [r["water"]     for r in records if r.get("water")     is not None]
    mood_vals      = [r["mood"]      for r in records if r.get("mood")      is not None]

    # Unified food data shape: reads from food.nutrition.calories
    food_vals = []
    for r in records:
        food = r.get("food")
        if food and isinstance(food, dict):
            cal = food.get("nutrition", {}).get("calories")
            if cal is not None:
                food_vals.append(cal)

    # ── Compute averages (None if no data) ────────────────────────
    avg_sleep     = sum(sleep_vals)     / len(sleep_vals)     if sleep_vals     else None
    avg_steps     = sum(steps_vals)     / len(steps_vals)     if steps_vals     else None
    avg_sedentary = sum(sedentary_vals) / len(sedentary_vals) if sedentary_vals else None
    avg_water     = sum(water_vals)     / len(water_vals)     if water_vals     else None
    avg_calories  = round(sum(food_vals) / len(food_vals), 1) if food_vals      else None

    mood_impacts  = [mood_impact(m) for m in mood_vals]
    avg_mood_imp  = sum(mood_impacts) / len(mood_impacts) if mood_impacts else None
    dominant_mood = Counter(mood_vals).most_common(1)[0][0] if mood_vals else None

    # ── Compute impact per metric ─────────────────────────────────
    # food_impact now uses personalised ideal_calories when available
    food_imp = food_impact(avg_calories, ideal_calories) if avg_calories is not None else None

    raw_impacts = {
        "sleep":     (sleep_impact(avg_sleep)         if avg_sleep     is not None else None, avg_sleep,     WEIGHTS["sleep"]),
        "steps":     (steps_impact(int(avg_steps))    if avg_steps     is not None else None, avg_steps,     WEIGHTS["steps"]),
        "sedentary": (sedentary_impact(avg_sedentary) if avg_sedentary is not None else None, avg_sedentary, WEIGHTS["sedentary"]),
        "water":     (water_impact(int(avg_water))    if avg_water     is not None else None, avg_water,     WEIGHTS["water"]),
        "mood":      (avg_mood_imp,                                                            None,          WEIGHTS["mood"]),
        "food":      (food_imp,                                                                avg_calories,  WEIGHTS["food"]),
    }

    # ── Weighted sum — skip missing metrics, redistribute weight ──
    total_weight = 0.0
    weighted_sum = 0.0
    breakdown    = {}

    for key, (impact, raw_avg, weight) in raw_impacts.items():
        if impact is not None:
            w_impact      = impact * weight
            weighted_sum += w_impact
            total_weight += weight

            breakdown[key] = {
                "impact":          round(impact, 3),
                "weighted_impact": round(w_impact, 3),
            }
            if raw_avg is not None:
                breakdown[key]["avg"] = round(raw_avg, 1)
            if key == "mood":
                breakdown[key]["dominant"] = dominant_mood
            if key == "food":
                # Expose ideal and ratio for downstream consumers (LLM prompt, UI)
                if ideal_calories is not None:
                    breakdown[key]["ideal"]  = round(ideal_calories, 1)
                    breakdown[key]["ratio"]  = round(avg_calories / ideal_calories, 2) if avg_calories else None

    if total_weight == 0:
        return {"score": 0, "breakdown": {}}

    # Normalise to available weight, then map [-1, +1] → [0, 100]
    normalised = weighted_sum / total_weight
    score      = round(((normalised + 1) / 2) * 100)
    score      = max(0, min(100, score))

    return {"score": score, "breakdown": breakdown}