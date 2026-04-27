"""
LogBot ORM models.

Shared table:
  inventory           — owned by finbot; logbot extends it with optimization columns

LogBot-only tables (log_ prefix avoids conflicts):
  log_skus            — product metadata (description, unit_of_measure)
  log_suppliers       — supplier records
  log_sku_suppliers   — SKU ↔ supplier links
  log_demand_history  — historical demand records
  log_alerts          — supply chain alerts
"""

import uuid
from datetime import datetime
from sqlalchemy import Column, String, Float, Integer, DateTime, ForeignKey, Text, Boolean
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from .database import Base


def _uuid():
    return str(uuid.uuid4())


# ─── Shared table (extended from finbot) ─────────────────────────────────────

class Inventory(Base):
    """
    Shared inventory table — finbot writes quantity/unit_price,
    logbot writes reorder_point/safety_stock/eoq/warehouse_location.
    Natural key: product_name.
    """
    __tablename__ = "inventory"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    product_name = Column(String, unique=True, nullable=False)
    quantity = Column(Integer, default=0)
    unit_price = Column(Float, nullable=True)

    # logbot optimization fields
    reorder_point = Column(Float, nullable=True)
    safety_stock = Column(Float, nullable=True)
    eoq = Column(Float, nullable=True)
    warehouse_location = Column(String, nullable=True)
    last_updated = Column(DateTime, nullable=True)


# ─── LogBot-only tables ───────────────────────────────────────────────────────

class LogSKU(Base):
    """Product metadata — richer than finbot's product_name string."""
    __tablename__ = "log_skus"

    id = Column(String, primary_key=True, default=_uuid)
    name = Column(String, nullable=False, unique=True)   # matches inventory.product_name
    category = Column(String)
    description = Column(Text)
    unit_of_measure = Column(String, default="units")
    created_at = Column(DateTime, default=datetime.utcnow)

    supplier_links = relationship("LogSKUSupplier", back_populates="sku")
    demand_history = relationship("LogDemandHistory", back_populates="sku")
    alerts = relationship("LogAlert", back_populates="sku")


class LogSupplier(Base):
    __tablename__ = "log_suppliers"

    id = Column(String, primary_key=True, default=_uuid)
    name = Column(String, nullable=False, unique=True)
    lead_time_days = Column(Integer, default=7)
    min_order_qty = Column(Float, default=1.0)
    unit_cost = Column(Float, nullable=False)
    reliability_score = Column(Float, default=1.0)
    contact_info = Column(Text)

    sku_links = relationship("LogSKUSupplier", back_populates="supplier")


class LogSKUSupplier(Base):
    __tablename__ = "log_sku_suppliers"

    id = Column(String, primary_key=True, default=_uuid)
    sku_id = Column(String, ForeignKey("log_skus.id"), nullable=False)
    supplier_id = Column(String, ForeignKey("log_suppliers.id"), nullable=False)
    preferred = Column(Boolean, default=False)

    sku = relationship("LogSKU", back_populates="supplier_links")
    supplier = relationship("LogSupplier", back_populates="sku_links")


class LogDemandHistory(Base):
    __tablename__ = "log_demand_history"

    id = Column(String, primary_key=True, default=_uuid)
    sku_id = Column(String, ForeignKey("log_skus.id"), nullable=False)
    date = Column(DateTime, nullable=False)
    quantity = Column(Float, nullable=False)
    source = Column(String, default="manual")

    sku = relationship("LogSKU", back_populates="demand_history")


class LogAlert(Base):
    __tablename__ = "log_alerts"

    id = Column(String, primary_key=True, default=_uuid)
    sku_id = Column(String, ForeignKey("log_skus.id"), nullable=False)
    alert_type = Column(String, nullable=False)
    message = Column(Text, nullable=False)
    severity = Column(String, default="medium")
    stockout_probability = Column(Float)
    triggered_at = Column(DateTime, default=datetime.utcnow)
    resolved = Column(Boolean, default=False)
    resolved_at = Column(DateTime)

    sku = relationship("LogSKU", back_populates="alerts")
