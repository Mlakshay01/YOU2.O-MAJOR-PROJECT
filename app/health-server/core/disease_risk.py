# core/disease_risk.py
#
# Lifestyle-based Chronic Disease Risk Estimator
# ------------------------------------------------
# NOT a medical diagnosis tool. Estimates relative lifestyle risk only.
# Outputs continuous risk values in [0, 1] via sigmoid transformation.
#
# food_impact lives in wellness_score.py (single source of truth).
# This module imports it — never redefines it.
#
# ══════════════════════════════════════════════════════════════════════════════
# SCIENTIFIC BASIS FOR WEIGHTS
# ══════════════════════════════════════════════════════════════════════════════
#
# ── DIABETES (T2D) ────────────────────────────────────────────────────────────
#   sedentary  0.28 — Wilmot et al. (Diabetologia, 2012): highest vs lowest
#                     sedentary time → RR 2.12 for T2D (112% increase).
#   bmi        0.25 — Brown et al. (Diabetes Care, 2023, UK Biobank 451k).
#   sleep      0.22 — Korean cohort (Endocrinol Metab, 2023, 16yr follow-up).
#   food       0.15 — caloric excess → insulin resistance (Nauman 2025).
#   steps      0.07 — Nauman et al. (Lancet Public Health, 2025).
#   water      0.03 — Armstrong (Nutrition Reviews, 2024).
#
# ── HEART DISEASE (CVD) ───────────────────────────────────────────────────────
#   sleep      0.28 — Cao et al. (JAHA, 2017): U-shaped across 3.8M participants.
#   steps      0.25 — Stens et al. (JACC, 2023): optimal at ~7,200 steps/day.
#   sedentary  0.18 — Biswas/Pandey (Ann Intern Med 2015 / JAMA Cardiol 2016).
#   food       0.15 — AHA dietary guidelines; diet-CVD link well established.
#   bmi        0.10 — Dwivedi et al. (Curr Cardiol Rep, 2020).
#   water      0.04 — hydration linked to blood viscosity (EFSA + StatPearls 2025).
#
# ── OBESITY ───────────────────────────────────────────────────────────────────
#   food       0.30 — caloric intake is primary obesity driver (WHO 2023).
#   bmi        0.28 — Naeini et al. (PMC, 2024, 82 studies, 2.7M patients).
#   steps      0.20 — Paluch et al. (JAMA Network Open, 2024).
#   sedentary  0.13 — ScienceDirect meta-analysis (2019).
#   sleep      0.07 — Antza et al. (J Endocrinol, 2021): leptin/ghrelin dysregulation.
#   water      0.02 — satiety effect (NHANES analysis, 2022).
#
# ══════════════════════════════════════════════════════════════════════════════
# SIGMOID CHOICE
# ══════════════════════════════════════════════════════════════════════════════
# sigmoid(x) maps any real → (0, 1) smoothly.
#   all-optimal  → risk ≈ 0.12
#   all-neutral  → risk ≈ 0.50
#   all-harmful  → risk ≈ 0.88

import math
from typing import Optional


# ── Sigmoid ───────────────────────────────────────────────────────────────────

def sigmoid(x: float, k: float = 2.5) -> float:
    """
    Smooth mapping from (-∞, +∞) → (0, 1).
    k=2.5 gives ~0.12 at x=-1 and ~0.88 at x=+1.
    We pass the NEGATIVE weighted impact because:
      high positive impact (healthy) → low risk
      high negative impact (unhealthy) → high risk
    """
    return 1.0 / (1.0 + math.exp(-k * x))


# ── BMI impact ────────────────────────────────────────────────────────────────

def bmi_impact(bmi: float) -> float:
    """
    Returns impact in [-1.0, +1.0] for BMI.
    Source: Naeini et al. (PMC, 2024); Brown et al. (Diabetes Care, 2023).

    Regions (WHO + literature):
      < 16        → -1.0  severe underweight
      16 – 18.5   → -1.0 to 0.0  underweight ramp
      18.5 – 25   → 0.0 to +1.0  healthy ramp
      25 – 27.5   → +1.0  optimal plateau (lowest mortality nadir)
      27.5 – 30   → +1.0 to 0.0  overweight ramp
      30 – 35     → 0.0 to -0.5  obese class I
      35 – 40     → -0.5 to -1.0 obese class II
      > 40        → -1.0  severe obesity
    """
    if bmi < 16:
        return -1.0
    if bmi < 18.5:
        return -1.0 + ((bmi - 16) / 2.5)
    if bmi < 25:
        return (bmi - 18.5) / 6.5
    if bmi <= 27.5:
        return 1.0
    if bmi <= 30:
        return 1.0 - ((bmi - 27.5) / 2.5)
    if bmi <= 35:
        return -((bmi - 30) / 5.0) * 0.5
    if bmi <= 40:
        return -0.5 - ((bmi - 35) / 5.0) * 0.5
    return -1.0


# ── Ideal calorie calculator ──────────────────────────────────────────────────

def calculate_ideal_calories(
    weight: Optional[float],
    height: Optional[float],
    age: Optional[int],
    gender: Optional[str],
    activity_multiplier: float = 1.55,
) -> Optional[float]:
    """
    Mifflin-St Jeor Equation (most accurate validated BMR formula).

    weight: kg
    height: cm
    age: years
    gender: "male" or "female"
    activity_multiplier: 1.2  = sedentary
                         1.375 = lightly active
                         1.55  = moderately active (default)
                         1.725 = very active
                         1.9   = extra active

    Returns total daily energy expenditure (TDEE) in kcal, or None if
    any required parameter is missing.

    Source: Mifflin et al. (JADA, 1990); validated in Thomas et al. (2016).
    """
    if not weight or not height or not age or not gender:
        return None

    if gender.lower() == "male":
        bmr = 10 * weight + 6.25 * height - 5 * age + 5
    else:
        bmr = 10 * weight + 6.25 * height - 5 * age - 161

    return round(bmr * activity_multiplier, 1)


# ── Weighted score builder ────────────────────────────────────────────────────

def _weighted_impact(
    metric_impacts: dict,
    weights: dict,
) -> tuple:
    """
    Combines available metric impacts using their weights.
    Missing metrics (None) are excluded and weights redistributed.

    Returns:
        (normalised_impact, total_weight_used, contributions_dict)
    """
    available = {k: v for k, v in metric_impacts.items() if v is not None}
    if not available:
        return 0.0, 0.0, {}

    total_w = sum(weights[k] for k in available)
    contributions = {}
    weighted_sum = 0.0

    for key, impact in available.items():
        eff_w  = weights[key] / total_w
        contrib = impact * eff_w
        weighted_sum += contrib
        contributions[key] = {
            "impact":           round(impact, 4),
            "weight":           weights[key],
            "effective_weight": round(eff_w, 4),
            "contribution":     round(contrib, 4),
            "avg":              None,
        }

    return weighted_sum, total_w, contributions


# ── Disease weight tables ─────────────────────────────────────────────────────

DIABETES_WEIGHTS = {
    "sedentary": 0.28,
    "bmi":       0.25,
    "sleep":     0.22,
    "food":      0.15,
    "steps":     0.07,
    "water":     0.03,
}

HEART_WEIGHTS = {
    "sleep":     0.28,
    "steps":     0.25,
    "sedentary": 0.18,
    "food":      0.15,
    "bmi":       0.10,
    "water":     0.04,
}

OBESITY_WEIGHTS = {
    "food":      0.30,
    "bmi":       0.28,
    "steps":     0.20,
    "sedentary": 0.13,
    "sleep":     0.07,
    "water":     0.02,
}


# ── Disease-specific scorers ──────────────────────────────────────────────────

def diabetes_risk(
    sleep_impact: Optional[float],
    steps_impact: Optional[float],
    sedentary_impact: Optional[float],
    water_impact: Optional[float],
    bmi: Optional[float],
    food_imp: Optional[float] = None,
    sigmoid_k: float = 2.5,
) -> dict:
    """
    Diabetes lifestyle risk score [0=low risk, 1=high risk].
    Source: Wilmot et al. Diabetologia 2012; Brown et al. Diabetes Care 2023;
            Korean ENM cohort 2023; Nauman et al. Lancet Public Health 2025.
    """
    bmi_imp = bmi_impact(bmi) if bmi is not None else None

    impacts = {
        "sedentary": sedentary_impact,
        "bmi":       bmi_imp,
        "sleep":     sleep_impact,
        "steps":     steps_impact,
        "water":     water_impact,
        "food":      food_imp,
    }

    norm_impact, _, contributions = _weighted_impact(impacts, DIABETES_WEIGHTS)
    risk = sigmoid(-norm_impact, k=sigmoid_k)

    return {
        "risk":          round(risk, 4),
        "risk_label":    _risk_label(risk),
        "contributions": contributions,
    }


def heart_disease_risk(
    sleep_impact: Optional[float],
    steps_impact: Optional[float],
    sedentary_impact: Optional[float],
    water_impact: Optional[float],
    bmi: Optional[float],
    food_imp: Optional[float] = None,
    sigmoid_k: float = 2.5,
) -> dict:
    """
    Cardiovascular disease lifestyle risk score [0=low risk, 1=high risk].
    Source: Cao et al. JAHA 2017; Stens et al. JACC 2023;
            Biswas et al. Ann Intern Med 2015; Dwivedi et al. Curr Cardiol Rep 2020.
    """
    bmi_imp = bmi_impact(bmi) if bmi is not None else None

    impacts = {
        "sleep":     sleep_impact,
        "steps":     steps_impact,
        "sedentary": sedentary_impact,
        "bmi":       bmi_imp,
        "water":     water_impact,
        "food":      food_imp,
    }

    norm_impact, _, contributions = _weighted_impact(impacts, HEART_WEIGHTS)
    risk = sigmoid(-norm_impact, k=sigmoid_k)

    return {
        "risk":          round(risk, 4),
        "risk_label":    _risk_label(risk),
        "contributions": contributions,
    }


def obesity_risk(
    sleep_impact: Optional[float],
    steps_impact: Optional[float],
    sedentary_impact: Optional[float],
    water_impact: Optional[float],
    bmi: Optional[float],
    food_imp: Optional[float] = None,
    sigmoid_k: float = 2.5,
) -> dict:
    """
    Obesity lifestyle risk score [0=low risk, 1=high risk].
    Note: BMI is both an input metric AND the primary outcome for obesity —
    it reflects current adiposity as a baseline trajectory predictor.
    Source: Naeini et al. PMC 2024; Paluch et al. JAMA Network Open 2024;
            ScienceDirect meta-analysis 2019; Antza et al. J Endocrinol 2021.
    """
    bmi_imp = bmi_impact(bmi) if bmi is not None else None

    impacts = {
        "food":      food_imp,
        "bmi":       bmi_imp,
        "steps":     steps_impact,
        "sedentary": sedentary_impact,
        "sleep":     sleep_impact,
        "water":     water_impact,
    }

    norm_impact, _, contributions = _weighted_impact(impacts, OBESITY_WEIGHTS)
    risk = sigmoid(-norm_impact, k=sigmoid_k)

    return {
        "risk":          round(risk, 4),
        "risk_label":    _risk_label(risk),
        "contributions": contributions,
    }


# ── Master function ───────────────────────────────────────────────────────────

def compute_disease_risks(
    avg_sleep: Optional[float],
    avg_steps: Optional[float],
    avg_sedentary: Optional[float],
    avg_water: Optional[float],
    bmi: Optional[float],
    avg_calories: Optional[float] = None,
    ideal_calories: Optional[float] = None,
    # Pre-computed impacts (pass to avoid recomputing)
    sleep_imp: Optional[float] = None,
    steps_imp: Optional[float] = None,
    sedentary_imp: Optional[float] = None,
    water_imp: Optional[float] = None,
    food_imp: Optional[float] = None,
) -> dict:
    """
    Single entry point. Accepts raw averages OR pre-computed impacts.
    ideal_calories (Mifflin-St Jeor TDEE) is used for personalised food scoring.
    If food_imp is not pre-supplied, it is computed from avg_calories + ideal_calories.

    Returns:
    {
      "diabetes":      { "risk": 0.71, "risk_label": "High", "contributions": {...} },
      "heart_disease": { "risk": 0.45, "risk_label": "Moderate", "contributions": {...} },
      "obesity":       { "risk": 0.60, "risk_label": "Moderate", "contributions": {...} },
    }
    """
    # Single import to avoid circular dependency
    from core.wellness_score import (
        sleep_impact   as _sleep_imp,
        steps_impact   as _steps_imp,
        sedentary_impact as _sed_imp,
        water_impact   as _water_imp,
        food_impact    as _food_imp,   # single source of truth — ratio-aware
    )

    s_imp  = sleep_imp     if sleep_imp     is not None else (_sleep_imp(avg_sleep)           if avg_sleep     is not None else None)
    st_imp = steps_imp     if steps_imp     is not None else (_steps_imp(int(avg_steps))      if avg_steps     is not None else None)
    se_imp = sedentary_imp if sedentary_imp is not None else (_sed_imp(avg_sedentary)         if avg_sedentary is not None else None)
    w_imp  = water_imp     if water_imp     is not None else (_water_imp(int(avg_water))      if avg_water     is not None else None)

    # food_impact now accepts ideal_calories for personalised ratio comparison
    f_imp  = food_imp if food_imp is not None else (
        _food_imp(avg_calories, ideal_calories) if avg_calories is not None else None
    )

    results = {
        "diabetes":      diabetes_risk(s_imp, st_imp, se_imp, w_imp, bmi, f_imp),
        "heart_disease": heart_disease_risk(s_imp, st_imp, se_imp, w_imp, bmi, f_imp),
        "obesity":       obesity_risk(s_imp, st_imp, se_imp, w_imp, bmi, f_imp),
    }

    # Inject avg_calories and ideal_calories into food contribution for LLM/UI
    for disease in results.values():
        if "food" in disease["contributions"]:
            disease["contributions"]["food"]["avg"]   = avg_calories
            disease["contributions"]["food"]["ideal"] = ideal_calories
            if avg_calories and ideal_calories:
                disease["contributions"]["food"]["ratio"] = round(avg_calories / ideal_calories, 2)

    return results


# ── Helper ────────────────────────────────────────────────────────────────────

def _risk_label(risk: float) -> str:
    if risk < 0.30:
        return "Low"
    if risk < 0.50:
        return "Moderate-Low"
    if risk < 0.65:
        return "Moderate"
    if risk < 0.80:
        return "Moderate-High"
    return "High"