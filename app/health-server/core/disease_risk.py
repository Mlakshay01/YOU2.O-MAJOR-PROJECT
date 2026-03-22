# core/disease_risk.py
#
# Lifestyle-based Chronic Disease Risk Estimator
# ------------------------------------------------
# NOT a medical diagnosis tool. Estimates relative lifestyle risk only.
# Outputs continuous risk values in [0, 1] via sigmoid transformation.
#
# ══════════════════════════════════════════════════════════════════════════════
# SCIENTIFIC BASIS FOR WEIGHTS
# ══════════════════════════════════════════════════════════════════════════════
#
# ── DIABETES (T2D) ────────────────────────────────────────────────────────────
#   sedentary  0.30 — Wilmot et al. (Diabetologia, 2012): highest vs lowest
#                     sedentary time → RR 2.12 for T2D (112% increase).
#                     Strongest single lifestyle predictor of T2D.
#   bmi        0.25 — Brown et al. (Diabetes Care, 2023, UK Biobank 451k):
#                     "each unit increase in BMI raises likelihood of diabetes
#                     exponentially." Robust dose-response confirmed.
#   sleep      0.25 — Korean cohort (Endocrinol Metab, 2023, 16yr follow-up):
#                     ≤5h sleep → HR 1.17 for incident T2D; long sleep in obese
#                     individuals also raises risk. Shared mechanism: cortisol,
#                     insulin resistance.
#   steps      0.15 — Nauman et al. (Lancet Public Health, 2025): 7,000 vs
#                     2,000 steps/day → 14% lower T2D incidence.
#   water      0.05 — Armstrong (Nutrition Reviews, 2024): dehydration impairs
#                     glucose regulation but evidence weaker vs above factors.
#
# ── HEART DISEASE (CVD) ───────────────────────────────────────────────────────
#   sleep      0.30 — Cao et al. (JAHA, 2017): U-shaped dose-response across
#                     3.8M participants; lowest CVD risk at 7h. Meta-analysis
#                     RR 1.09 for sleep-deprived; RR 1.34 for long sleep.
#   steps      0.25 — Stens et al. (JACC, 2023): optimal CVD risk reduction at
#                     ~7,200 steps/day; every 1,000 additional steps → lower CVD.
#   sedentary  0.20 — Biswas/Pandey (Ann Intern Med 2015 / JAMA Cardiol 2016):
#                     each +1h sedentary → ~5% CVD risk; HR 1.04 per hour
#                     (ScienceDirect meta-analysis, 24 studies).
#   bmi        0.15 — Dwivedi et al. (Curr Cardiol Rep, 2020): obesity associated
#                     with increased CVD events in general population; non-linear
#                     dose-response confirmed in 122-article meta-analysis.
#   water      0.10 — Hydration linked to blood viscosity and cardiac workload;
#                     moderate weight vs above factors (EFSA + StatPearls 2025).
#
# ── OBESITY ───────────────────────────────────────────────────────────────────
#   bmi        0.35 — Naeini et al. (PMC, 2024, 82 studies, 2.7M patients):
#                     BMI most direct adiposity marker; U-shaped mortality curve
#                     with sharp increase >35 kg/m².
#   steps      0.30 — Paluch et al. (JAMA Network Open, 2024): body weight and
#                     waist circumference decrease linearly with aerobic exercise
#                     volume; walking ~primary modifiable input for weight.
#   sedentary  0.20 — ScienceDirect (2019): higher BMI amplifies sedentary-
#                     associated mortality; sedentary + obesity = compound risk.
#   sleep      0.10 — Antza et al. (J Endocrinol, 2021): sleep <6h linked to
#                     weight gain via leptin/ghrelin dysregulation.
#   water      0.05 — Adequate hydration modestly reduces caloric intake and
#                     improves metabolism (NHANES analysis, 2022).
#
# ══════════════════════════════════════════════════════════════════════════════
# SIGMOID CHOICE
# ══════════════════════════════════════════════════════════════════════════════
# sigmoid(x) = 1 / (1 + e^(-x)) maps any real → (0, 1) smoothly.
# Properties that make it ideal here:
#   • Continuous and differentiable everywhere (no hard cutoffs)
#   • Saturates gracefully at extremes: very poor habits → risk ≈ 1.0,
#     very good habits → risk ≈ 0.0
#   • Steepness can be tuned via the gain parameter k
#   • Numerically stable and widely used in health risk modelling
# We centre at 0 (neutral impact sum) and tune k so:
#   all-optimal  → risk ≈ 0.12   (lifestyle cannot eliminate genetic risk)
#   all-neutral  → risk ≈ 0.50   (average lifestyle = average population risk)
#   all-harmful  → risk ≈ 0.88   (very poor habits = elevated risk)

import math
from typing import Optional


# ── Sigmoid ───────────────────────────────────────────────────────────────────

def sigmoid(x: float, k: float = 2.5) -> float:
    """
    Smooth mapping from (-∞, +∞) → (0, 1).
    k controls steepness; k=2.5 gives ~0.12 at x=-1 and ~0.88 at x=+1.
    We pass the NEGATIVE weighted impact because:
      high positive impact (healthy) → low risk
      high negative impact (unhealthy) → high risk
    """
    return 1.0 / (1.0 + math.exp(-k * x))


# ── BMI impact: continuous, evidence-based ───────────────────────────────────

def bmi_impact(bmi: float) -> float:
    """
    Returns impact in [-1.0, +1.0] for BMI.

    Source: Naeini et al. (PMC, 2024): U-shaped mortality curve, nadir 25–30.
            Brown et al. (Diabetes Care, 2023): exponential T2D risk per BMI unit.

    Regions (WHO + literature):
      BMI < 16        → -1.0  (severe underweight: high mortality risk)
      16  → 18.5      → -1.0 to 0.0  (underweight ramp)
      18.5 → 25       → 0.0 to +1.0  (healthy ramp to optimal)
      25   → 27.5     → +1.0          (optimal plateau: lowest mortality nadir)
      27.5 → 30       → +1.0 to 0.0  (overweight ramp down)
      30   → 35       → 0.0 to -0.5  (obese class I: moderate risk)
      35   → 40       → -0.5 to -1.0 (obese class II: high risk)
      > 40            → -1.0          (severe obesity: very high risk)
    """
    if bmi < 16:
        return -1.0
    if bmi < 18.5:
        return -1.0 + ((bmi - 16) / 2.5)           # -1 → 0 over 16–18.5
    if bmi < 25:
        return (bmi - 18.5) / 6.5                   # 0 → +1 over 18.5–25
    if bmi <= 27.5:
        return 1.0                                   # optimal plateau
    if bmi <= 30:
        return 1.0 - ((bmi - 27.5) / 2.5)           # +1 → 0 over 27.5–30
    if bmi <= 35:
        return -((bmi - 30) / 5.0) * 0.5            # 0 → -0.5 over 30–35
    if bmi <= 40:
        return -0.5 - ((bmi - 35) / 5.0) * 0.5     # -0.5 → -1.0 over 35–40
    return -1.0


# ── Weighted score builders ───────────────────────────────────────────────────

def _weighted_impact(
    metric_impacts: dict[str, Optional[float]],
    weights: dict[str, float],
) -> tuple[float, float, dict]:
    """
    Combines available metric impacts using their weights.
    Missing metrics (None) are excluded and weights redistributed.

    Returns:
        (normalised_impact, total_weight_used, contributions_dict)

    contributions_dict structure per key:
        {
          "impact": float,          # raw metric impact in [-1, +1]
          "weight": float,          # original weight
          "effective_weight": float,# after redistribution
          "contribution": float,    # impact × effective_weight
        }
    """
    available = {k: v for k, v in metric_impacts.items() if v is not None}
    if not available:
        return 0.0, 0.0, {}

    total_w = sum(weights[k] for k in available)
    contributions = {}
    weighted_sum = 0.0

    for key, impact in available.items():
        eff_w = weights[key] / total_w          # redistribute to sum to 1
        contrib = impact * eff_w
        weighted_sum += contrib
        contributions[key] = {
            "impact":           round(impact, 4),
            "weight":           weights[key],
            "effective_weight": round(eff_w, 4),
            "contribution":     round(contrib, 4),
        }

    return weighted_sum, total_w, contributions


# ── Disease-specific scorers ──────────────────────────────────────────────────

DIABETES_WEIGHTS = {
    "sedentary": 0.30,
    "bmi":       0.25,
    "sleep":     0.25,
    "steps":     0.15,
    "water":     0.05,
}

HEART_WEIGHTS = {
    "sleep":     0.30,
    "steps":     0.25,
    "sedentary": 0.20,
    "bmi":       0.15,
    "water":     0.10,
}

OBESITY_WEIGHTS = {
    "bmi":       0.35,
    "steps":     0.30,
    "sedentary": 0.20,
    "sleep":     0.10,
    "water":     0.05,
}


def diabetes_risk(
    sleep_impact: Optional[float],
    steps_impact: Optional[float],
    sedentary_impact: Optional[float],
    water_impact: Optional[float],
    bmi: Optional[float],
    sigmoid_k: float = 2.5,
) -> dict:
    """
    Diabetes lifestyle risk score.

    Returns:
        {
          "risk": 0.71,          # 0=low risk, 1=high risk
          "contributions": {...}  # per-metric breakdown
        }

    Evidence: Wilmot et al. Diabetologia 2012; Brown et al. Diabetes Care 2023;
              Korean ENM cohort 2023; Nauman et al. Lancet Public Health 2025.
    """
    bmi_imp = bmi_impact(bmi) if bmi is not None else None

    impacts = {
        "sedentary": sedentary_impact,
        "bmi":       bmi_imp,
        "sleep":     sleep_impact,
        "steps":     steps_impact,
        "water":     water_impact,
    }

    norm_impact, _, contributions = _weighted_impact(impacts, DIABETES_WEIGHTS)

    # Negate: positive health impact → lower risk
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
    sigmoid_k: float = 2.5,
) -> dict:
    """
    Cardiovascular disease lifestyle risk score.

    Returns:
        {
          "risk": 0.45,
          "contributions": {...}
        }

    Evidence: Cao et al. JAHA 2017; Stens et al. JACC 2023;
              Biswas et al. Ann Intern Med 2015; Dwivedi et al. Curr Cardiol Rep 2020.
    """
    bmi_imp = bmi_impact(bmi) if bmi is not None else None

    impacts = {
        "sleep":     sleep_impact,
        "steps":     steps_impact,
        "sedentary": sedentary_impact,
        "bmi":       bmi_imp,
        "water":     water_impact,
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
    sigmoid_k: float = 2.5,
) -> dict:
    """
    Obesity lifestyle risk score.

    Note: BMI is both an input metric AND the primary outcome for obesity.
    Including it reflects current BMI as a baseline predictor of future
    weight trajectory, consistent with longitudinal obesity research.

    Returns:
        {
          "risk": 0.60,
          "contributions": {...}
        }

    Evidence: Naeini et al. PMC 2024; Paluch et al. JAMA Network Open 2024;
              ScienceDirect meta-analysis 2019; Antza et al. J Endocrinol 2021.
    """
    bmi_imp = bmi_impact(bmi) if bmi is not None else None

    impacts = {
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
    # Pre-computed impacts from wellness_score.py (pass directly to avoid recomputing)
    sleep_imp: Optional[float] = None,
    steps_imp: Optional[float] = None,
    sedentary_imp: Optional[float] = None,
    water_imp: Optional[float] = None,
) -> dict:
    """
    Single entry point. Accepts raw averages OR pre-computed impacts.
    If impacts not provided, computes them from wellness_score functions.

    Returns full risk report:
    {
      "diabetes":      { "risk": 0.71, "risk_label": "High", "contributions": {...} },
      "heart_disease": { "risk": 0.45, "risk_label": "Moderate", "contributions": {...} },
      "obesity":       { "risk": 0.60, "risk_label": "Moderate", "contributions": {...} },
    }
    """
    # Lazy import to avoid circular dependency
    from core.wellness_score import (
        sleep_impact as _sleep_imp,
        steps_impact as _steps_imp,
        sedentary_impact as _sed_imp,
        water_impact as _water_imp,
    )

    s_imp  = sleep_imp     if sleep_imp     is not None else (_sleep_imp(avg_sleep)           if avg_sleep     is not None else None)
    st_imp = steps_imp     if steps_imp     is not None else (_steps_imp(int(avg_steps))      if avg_steps     is not None else None)
    se_imp = sedentary_imp if sedentary_imp is not None else (_sed_imp(avg_sedentary)         if avg_sedentary is not None else None)
    w_imp  = water_imp     if water_imp     is not None else (_water_imp(int(avg_water))      if avg_water     is not None else None)

    return {
        "diabetes":      diabetes_risk(s_imp, st_imp, se_imp, w_imp, bmi),
        "heart_disease": heart_disease_risk(s_imp, st_imp, se_imp, w_imp, bmi),
        "obesity":       obesity_risk(s_imp, st_imp, se_imp, w_imp, bmi),
    }


# ── Helper ────────────────────────────────────────────────────────────────────

def _risk_label(risk: float) -> str:
    """Human-readable risk tier for display."""
    if risk < 0.30:
        return "Low"
    if risk < 0.50:
        return "Moderate-Low"
    if risk < 0.65:
        return "Moderate"
    if risk < 0.80:
        return "Moderate-High"
    return "High"