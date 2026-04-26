"""
Inventory optimization formulas:
  Safety Stock = Z × σ(lead_time) × √(avg_demand)
  ROP          = avg_demand × lead_time + safety_stock
  EOQ          = √(2DS / H)
"""

import math
from typing import Dict


def calculate_safety_stock(z: float, sigma_lead_time: float, avg_demand: float) -> float:
    """
    Safety Stock = Z × σ(lead_time) × √(avg_demand)

    Args:
        z: Service-level Z-score (1.28=90%, 1.645=95%, 2.326=99%)
        sigma_lead_time: Standard deviation of lead time in days
        avg_demand: Average daily demand quantity
    """
    return z * sigma_lead_time * math.sqrt(avg_demand)


def calculate_rop(avg_demand: float, lead_time: float, safety_stock: float) -> float:
    """
    Reorder Point = avg_demand × lead_time + safety_stock

    Args:
        avg_demand: Average daily demand
        lead_time: Supplier lead time in days
        safety_stock: Pre-calculated safety stock quantity
    """
    return (avg_demand * lead_time) + safety_stock


def calculate_eoq(annual_demand: float, ordering_cost: float, holding_cost_per_unit: float) -> float:
    """
    Economic Order Quantity = √(2 × D × S / H)

    Args:
        annual_demand: Annual demand (D)
        ordering_cost: Fixed cost per purchase order (S)
        holding_cost_per_unit: Annual holding/carrying cost per unit (H)
    """
    if holding_cost_per_unit <= 0:
        raise ValueError("Holding cost must be positive")
    return math.sqrt((2 * annual_demand * ordering_cost) / holding_cost_per_unit)


def run_full_analysis(
    avg_daily_demand: float,
    demand_std: float,
    lead_time_days: float,
    lead_time_std: float,
    ordering_cost: float,
    holding_cost_per_unit: float,
    service_level: float = 0.95,
) -> Dict:
    """Run Safety Stock + ROP + EOQ in one call."""
    from scipy.stats import norm

    z = float(norm.ppf(service_level))
    safety_stock = calculate_safety_stock(z, lead_time_std, avg_daily_demand)
    rop = calculate_rop(avg_daily_demand, lead_time_days, safety_stock)
    annual_demand = avg_daily_demand * 365
    eoq = calculate_eoq(annual_demand, ordering_cost, holding_cost_per_unit)

    return {
        "service_level": service_level,
        "z_score": round(z, 4),
        "safety_stock": round(safety_stock, 2),
        "reorder_point": round(rop, 2),
        "eoq": round(eoq, 2),
        "avg_daily_demand": round(avg_daily_demand, 4),
        "lead_time_days": lead_time_days,
        "annual_demand": round(annual_demand, 2),
    }
