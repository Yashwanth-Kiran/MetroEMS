from __future__ import annotations

from pydantic import BaseModel
from typing import Any, Dict, Optional, List


class ObcNetstats(BaseModel):
    raw: Dict[str, Any]


class ObcStorageInfo(BaseModel):
    """Storage information for OBC"""
    total: Optional[str] = None
    free: Optional[str] = None
    used: Optional[str] = None
    percentage: Optional[str] = None


class ObcSummary(BaseModel):
    ip: str
    cpu: Optional[float] = None
    uptime: Optional[str] = None
    disk: Optional[Dict[str, Any]] = None
    netstats: Optional[Dict[str, Any]] = None
    config: Optional[Dict[str, Any]] = None

    # Enrichment from MetroNMS
    latency_ms: Optional[float] = None
    throughput: Optional[Dict[str, Any]] = None
    temp_c: Optional[float] = None
    cpu_from_nms: Optional[float] = None
    
    # OBC-specific fields
    cab_number: Optional[str] = None
    position: Optional[str] = None
    encoder_ip: Optional[str] = None
    ntp_server: Optional[str] = None
    storage: Optional[ObcStorageInfo] = None
    status: Optional[str] = "online"
    os_version: Optional[str] = None
    kernel: Optional[str] = None
    cpu_model: Optional[str] = None
    total_memory: Optional[str] = None
    gps_status: Optional[str] = None


class ObcMetrics(BaseModel):
    """Real-time metrics for OBC"""
    device_ip: str
    cpu_usage: float = 0.0
    memory_usage: float = 0.0
    temperature: float = 0.0
    storage_usage: float = 0.0
    gps_accuracy: Optional[float] = None
    network_latency: Optional[float] = None
    timestamp: Optional[str] = None


class ObcConfig(BaseModel):
    """Configuration settings for OBC"""
    # Network settings
    ip_address: Optional[str] = None
    subnet_mask: Optional[str] = "255.255.255.0"
    gateway: Optional[str] = None
    dns_server: Optional[str] = None
    
    # Encoder settings
    encoder_ip: Optional[str] = None
    encoder_port: Optional[str] = "554"
    stream_protocol: Optional[str] = "RTSP"
    video_quality: Optional[str] = "High"
    
    # GPS/Location settings
    gps_enabled: Optional[str] = "true"
    update_interval: Optional[str] = "5s"
    position_accuracy: Optional[str] = "High"
    altitude_tracking: Optional[str] = "enabled"
    
    # System settings
    ntp_server: Optional[str] = None
    timezone: Optional[str] = "UTC"
    auto_update: Optional[str] = "enabled"
    log_level: Optional[str] = "INFO"


class ObcLogEntry(BaseModel):
    """Single log entry"""
    timestamp: str
    level: str  # INFO, WARNING, ERROR
    message: str
    source: Optional[str] = "obc"


class ObcLogsResponse(BaseModel):
    """Response containing OBC logs"""
    device_ip: str
    logs: List[ObcLogEntry]
    total_count: int
