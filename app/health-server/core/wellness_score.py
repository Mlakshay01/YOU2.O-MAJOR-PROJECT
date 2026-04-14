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
# ── Weights (must sum to 1.0) ─────────────────────────────────────────────────
#   Sleep      30%  — strongest single predictor of recovery and mortality (WHO/CDC)
#   Steps      25%  — dose-response evidence strongest for physical activity
#   Mood       20%  — APA: chronic negative affect predicts physical illness
#   Sedentary  15%  — independent risk factor even after adjusting for exercise
#   Water      10%  — important but easier to correct; weaker mortality signal

 
WEIGHTS = {
    "sleep":     0.28,  # strongest single predictor (WHO/CDC)
    "steps":     0.23,  # strong dose-response evidence
    "mood":      0.18,  # APA: chronic negative affect predicts illness
    "sedentary": 0.14,  # independent risk factor
    "water":     0.08,  # important but weaker mortality signal
    "food":      0.09,  # caloric balance — moderate independent predictor
}

# ── Mood helpers (mirrors moodConstants.js) ───────────────────────────────────

def mood_to_valence(mood: str) -> float:
    """Russell Circumplex: valence in [-1, +1]. happy=+1, neutral/surprised=0, rest=-1."""
    if mood == "happy":
        return 1.0
    if mood in ("neutral", "surprised"):
        return 0.0
    return -1.0  # sad, angry, fear, disgust


def mood_to_arousal(mood: str) -> float:
    """Russell Circumplex: arousal in [0, 1]."""
    if mood in ("neutral", "sad"):
        return 0.0        # low arousal
    if mood in ("happy", "disgust"):
        return 0.5        # medium arousal
    if mood in ("angry", "fear", "surprised"):
        return 1.0        # high arousal
    return 0.0


def mood_impact(mood: str) -> float:
    """
    Impact in [-1, +1].
    Formula: (valence × 0.7) + ((1 − arousal) × 0.3), normalised from raw [-0.70, 0.85].
    Angry/fear (high arousal, negative valence) → worst: raw = -0.70 → impact = -1.0
    Happy (positive valence, medium arousal)    → best:  raw =  0.85 → impact = +1.0
    Neutral (zero valence, low arousal)         →        raw =  0.30 → impact ≈ +0.29
    """
    raw = (mood_to_valence(mood) * 0.7) + ((1.0 - mood_to_arousal(mood)) * 0.3)
    raw_min, raw_max = -0.70, 0.85
    mid  = (raw_min + raw_max) / 2    # 0.075
    half = (raw_max - raw_min) / 2    # 0.775
    return max(-1.0, min(1.0, (raw - mid) / half))


# ── Metric impact functions (all return [-1.0, +1.0]) ────────────────────────

def sleep_impact(hours: float) -> float:
    """
    Source: Cappuccio et al. (Sleep, 2010); Liu et al. (JAHA, 2018);
            Frontiers Public Health (2022).
    U-shaped mortality curve. Optimal: 7–8h. Harmful below 5h or above 10h.

    Regions:
      ≤ 5h          → -1.0 (clinically high-risk, RR ≥1.12 vs 7h reference)
      5h  → 7h      → -1.0 to +1.0 (linear ramp up; each hour below 7 = +1.06 RR)
      7h  → 8h      → +1.0 (optimal plateau per Liu et al. lowest-risk range)
      8h  → 10h     → +1.0 to -1.0 (linear ramp down; each hour above 7 = +1.13 RR)
      ≥ 10h         → -1.0 (long sleep → RR 1.30–1.55 for 10–11h per Shen et al.)
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
    Source: Banach et al. (Eur J Prev Cardiol, 2023); Paluch et al. (Lancet, 2022);
            Paluch et al. (Circulation, 2023).
    Nonlinear inverse dose-response. No evidence of upper harm.

    Regions:
      ≤ 2,000       → -1.0 (below CV mortality benefit cut-off: 2,337 steps)
      2,000–3,867   → -1.0 to 0.0 (between CV and all-cause mortality thresholds)
      3,867–8,000   → 0.0 to +1.0 (entering benefit zone; ~15% risk reduction/1k steps)
      ≥ 8,000       → +1.0 (plateau: 40–50% lower CVD risk vs 2,000 steps)
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
    Source: Pandey et al. (JAMA Cardiol, 2016); WHO Physical Activity Guidelines (2020);
            BMC Public Health (2022); Ekelund et al. (BMJ, 2016).
    Each additional hour sedentary → ~5% CVD risk increase.
    Risk onset: >6h/day CVD mortality; >8h/day all-cause mortality.

    Regions:
      ≤ 5h          → +1.0 (well below risk thresholds)
      5h  → 6h      → +1.0 to +0.5 (approaching CVD risk threshold)
      6h  → 8h      → +0.5 to 0.0 (within risk onset zone per WHO/Pandey)
      8h  → 10h     → 0.0 to -1.0 (above all-cause mortality threshold, steep risk)
      ≥ 10h         → -1.0 (highest category: HR 1.29 CVD mortality vs lowest category)
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
    Source: EFSA Dietary Reference Values (2010); StatPearls / NCBI (2025);
            Armstrong et al. (Nutrition Reviews, 2024); NHANES analysis (PMC 2022).
    EFSA AI: 2,000ml women / 2,500ml men. Alternative AI floor: ≥1,500ml.

    Regions:
      ≤ 500ml       → -1.0 (severe dehydration: hospitalisation risk, organ dysfunction)
      500–1,500ml   → -1.0 to 0.0 (below alternative AI; cognitive impairment risk)
      1,500–2,500ml → 0.0 to +1.0 (ramp from alternative AI to EFSA optimal)
      ≥ 2,500ml     → +1.0 (meets or exceeds EFSA adequate intake for most adults)
    """
    if ml <= 500:
        return -1.0
    if ml <= 1500:
        return -1.0 + ((ml - 500) / 1000.0)         # -1 → 0 over 500–1500ml
    if ml <= 2500:
        return (ml - 1500) / 1000.0                 # 0 → +1 over 1500–2500ml
    return 1.0



def food_impact(calories: float) -> float:
    """
    Calories impact (daily average) → [-1.0, +1.0]
 
    Evidence: WHO dietary guidelines; Hall et al. Cell Metabolism 2019;
              Mozaffarian et al. NEJM 2011 (diet quality and weight gain)
 
    Regions:
      < 1200 kcal  → -1.0  severe under-eating: metabolic damage, malnutrition
      1200–1500    → -0.3  mild under-eating: micronutrient deficiency risk
      1500–2200    → +1.0  optimal range for most adults
      2200–2600    →  0.0  mild excess: borderline/neutral
      2600–3000    → -0.5  moderate excess: weight gain risk
      > 3000       → -1.0  severe excess: high disease risk
    """
    if calories < 1200:
        return -1.0
    if calories < 1500:
        return -0.3
    if calories <= 2200:
        return 1.0
    if calories <= 2600:
        return 0.0
    if calories <= 3000:
        return -0.5
    return -1.0

# ── Master scorer ─────────────────────────────────────────────────────────────

def compute_wellness_score(records: list) -> dict:
    """
    Takes a list of daily activity dicts (up to 28 days).
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
#     food_vals = [
#     r.get("food", {}).get("nutrition", {}).get("calories")
#     for r in records
#     if r.get("food") and r.get("food", {}).get("nutrition", {}).get("calories") is not None
# ]

    food_vals = []

    for r in records:
        meals = r.get("meals", {})
        total = 0

        for meal in meals.values():
            for item in meal:
                total += item.get("nutrition", {}).get("calories", 0)


        food_vals.append(total)

    

    # ── Compute averages (None if no data) ────────────────────────
    avg_sleep     = sum(sleep_vals)     / len(sleep_vals)     if sleep_vals     else None
    avg_steps     = sum(steps_vals)     / len(steps_vals)     if steps_vals     else None
    avg_sedentary = sum(sedentary_vals) / len(sedentary_vals) if sedentary_vals else None
    avg_water     = sum(water_vals)     / len(water_vals)     if water_vals     else None
    avg_calories = sum(food_vals) / len(food_vals) if food_vals else None

    mood_impacts  = [mood_impact(m) for m in mood_vals]
    avg_mood_imp  = sum(mood_impacts) / len(mood_impacts) if mood_impacts else None

    dominant_mood = None
    if mood_vals:
        from collections import Counter
        dominant_mood = Counter(mood_vals).most_common(1)[0][0]

    # ── Compute impact per metric ─────────────────────────────────
    raw_impacts = {
        "sleep":     (sleep_impact(avg_sleep)         if avg_sleep     is not None else None, avg_sleep,     WEIGHTS["sleep"]),
        "steps":     (steps_impact(int(avg_steps))    if avg_steps     is not None else None, avg_steps,     WEIGHTS["steps"]),
        "sedentary": (sedentary_impact(avg_sedentary) if avg_sedentary is not None else None, avg_sedentary, WEIGHTS["sedentary"]),
        "water":     (water_impact(int(avg_water))    if avg_water     is not None else None, avg_water,     WEIGHTS["water"]),
        "mood":      (avg_mood_imp,                                                            None,          WEIGHTS["mood"]),
        "food": (
    food_impact(avg_calories) if avg_calories is not None else None,
    avg_calories,
    WEIGHTS["food"]
),
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

    if total_weight == 0:
        return {"score": 0, "breakdown": {}}

    # Normalise to available weight, then map [-1, +1] → [0, 100]
    normalised = weighted_sum / total_weight
    score      = round(((normalised + 1) / 2) * 100)
    score      = max(0, min(100, score))


    

    return {"score": score, "breakdown": breakdown}