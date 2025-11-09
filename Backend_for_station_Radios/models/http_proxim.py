from __future__ import annotations

from pydantic import BaseModel
from typing import List, Optional


class ProximHttpLogDownloadResponse(BaseModel):
    filename: str
    size_bytes: int


class ProximEventLogLine(BaseModel):
    ts: Optional[str] = None
    text: str


class ProximLicenseInfo(BaseModel):
    product_description: Optional[str] = None
    max_output_mbps: Optional[float] = None
    max_input_mbps: Optional[float] = None
    max_aggregate_mbps: Optional[float] = None
    mac: Optional[str] = None
    product_family: Optional[str] = None
    product_class: Optional[str] = None


class ProximEthernetInfo(BaseModel):
    mac: Optional[str] = None
    operational_speed_mbit: Optional[float] = None
    duplex: Optional[str] = None
    admin_status: Optional[str] = None


class ProximSnrRow(BaseModel):
    index: int
    mcs_index: str
    modulation: str
    streams: int
    data_rate_mbps: float
    min_required_snr_db: int
    max_optimum_snr_db: int
