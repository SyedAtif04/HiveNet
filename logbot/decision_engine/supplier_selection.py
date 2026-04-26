"""
Supplier selection via constraint-based optimization.
Uses OR-Tools (cp_model) when available; falls back to weighted scoring.
"""

from typing import List, Dict, Optional


_DEFAULT_WEIGHTS = {"cost": 0.4, "lead_time": 0.3, "reliability": 0.3}


def select_optimal_supplier(
    suppliers: List[Dict],
    required_qty: float,
    weights: Optional[Dict[str, float]] = None,
) -> Dict:
    """
    Select the best supplier for a given required quantity.

    Each supplier dict must have:
        id, name, lead_time_days, min_order_qty, unit_cost, reliability_score

    weights: {"cost": float, "lead_time": float, "reliability": float} — must sum to 1.0.
             Defaults to 40% cost / 30% lead time / 30% reliability.

    Returns the winning supplier dict with "score" and "rationale" fields added.
    """
    if not suppliers:
        raise ValueError("No suppliers provided")

    w = {**_DEFAULT_WEIGHTS, **(weights or {})}

    # Prefer OR-Tools optimisation; fall back to weighted scoring
    or_idx = _try_ortools(suppliers, required_qty)
    if or_idx is not None:
        best = dict(suppliers[or_idx])
        best["score"] = 1.0
        best["method"] = "or-tools"
        best["rationale"] = (
            f"Selected by OR-Tools constraint optimization "
            f"(minimise cost, reliability ≥ 0.6, min_order_qty ≤ {required_qty})."
        )
        return best

    # Weighted scoring fallback
    eligible = [s for s in suppliers if s.get("min_order_qty", 0) <= required_qty] or suppliers

    costs = [s.get("unit_cost", 0) or 0.0 for s in eligible]
    leads = [s.get("lead_time_days", 0) or 0.0 for s in eligible]

    max_cost = max(costs) or 1.0
    max_lead = max(leads) or 1.0

    scored = []
    for s, cost, lead in zip(eligible, costs, leads):
        rel = s.get("reliability_score", 0.0) or 0.0
        score = (
            w["cost"] * (1 - cost / max_cost)
            + w["lead_time"] * (1 - lead / max_lead)
            + w["reliability"] * rel
        )
        scored.append({**s, "score": round(score, 4)})

    best = max(scored, key=lambda x: x["score"])
    best["method"] = "weighted-scoring"
    best["rationale"] = (
        f"Selected via weighted scoring — cost {w['cost']*100:.0f}% / "
        f"lead time {w['lead_time']*100:.0f}% / reliability {w['reliability']*100:.0f}%. "
        f"Score: {best['score']:.3f}."
    )
    return best


def _try_ortools(suppliers: List[Dict], required_qty: float) -> Optional[int]:
    """
    Return index of optimal supplier using OR-Tools cp_model, or None if unavailable/infeasible.

    Constraints:
      - Exactly one supplier selected
      - min_order_qty <= required_qty
      - reliability_score >= 0.6
    Objective: minimise unit_cost.
    """
    try:
        from ortools.sat.python import cp_model
    except ImportError:
        return None

    model = cp_model.CpModel()
    n = len(suppliers)
    x = [model.NewBoolVar(f"x_{i}") for i in range(n)]

    model.Add(sum(x) == 1)

    for i, s in enumerate(suppliers):
        if s.get("reliability_score", 1.0) < 0.6:
            model.Add(x[i] == 0)
        if s.get("min_order_qty", 0) > required_qty:
            model.Add(x[i] == 0)

    costs_scaled = [int((s.get("unit_cost") or 0) * 100) for s in suppliers]
    model.Minimize(sum(x[i] * costs_scaled[i] for i in range(n)))

    solver = cp_model.CpSolver()
    status = solver.Solve(model)

    if status in (cp_model.OPTIMAL, cp_model.FEASIBLE):
        for i in range(n):
            if solver.Value(x[i]) == 1:
                return i
    return None
