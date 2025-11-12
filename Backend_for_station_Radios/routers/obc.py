from __future__ import annotations

from fastapi import APIRouter, Query
from typing import Optional
import datetime
import random

from ..obc_client import (
    get_obc_summary,
    get_obc_netstats,
    get_obc_cpu,
    get_obc_uptime,
    get_obc_disk,
    get_obc_config,
)
from ..models.obc_models import (
    ObcSummary, ObcMetrics, ObcConfig, ObcLogEntry, ObcLogsResponse, ObcStorageInfo
)

router = APIRouter(prefix="/obc", tags=["obc"])

@router.get("/{ip}/summary", response_model=ObcSummary)
def obc_summary(ip: str, nodeId: Optional[int] = Query(default=None)):
    # Check if this is a demo device
    is_demo = ip.startswith("10.205.2.")
    
    if is_demo:
        # Return demo data
        return ObcSummary(
            ip=ip,
            cpu=random.uniform(20, 60),
            uptime="45 days 12 hours",
            cab_number="5921",
            position="Prd d 15 h 20 m",
            encoder_ip="10.205.3.250",
            ntp_server="10.205.0.2",
            storage=ObcStorageInfo(
                total="467.89 GB",
                free="174.07 GB",
                used="293.82 GB",
                percentage="37.20%"
            ),
            status="online",
            os_version="Ubuntu 20.04 LTS",
            kernel="5.4.0-150-generic",
            cpu_model="Intel i7-8565U",
            total_memory="16 GB",
            gps_status="Active",
            temp_c=random.uniform(40, 60),
            latency_ms=random.uniform(5, 20)
        )
    
    # For real devices, use existing function
    return get_obc_summary(ip, node_id=nodeId)


@router.get("/{ip}/metrics", response_model=ObcMetrics)
def obc_metrics(ip: str):
    """Get real-time metrics for an OBC device"""
    is_demo = ip.startswith("10.205.2.")
    
    if is_demo:
        return ObcMetrics(
            device_ip=ip,
            cpu_usage=random.uniform(20, 65),
            memory_usage=random.uniform(30, 70),
            temperature=random.uniform(40, 65),
            storage_usage=random.uniform(35, 40),
            gps_accuracy=random.uniform(1, 5),
            network_latency=random.uniform(5, 25),
            timestamp=datetime.datetime.utcnow().isoformat()
        )
    
    return ObcMetrics(
        device_ip=ip,
        cpu_usage=0.0,
        memory_usage=0.0,
        temperature=0.0,
        storage_usage=0.0,
        timestamp=datetime.datetime.utcnow().isoformat()
    )


@router.get("/{ip}/config", response_model=ObcConfig)
def obc_config_get(ip: str):
    """Get current configuration for an OBC device"""
    is_demo = ip.startswith("10.205.2.")
    
    if is_demo:
        return ObcConfig(
            ip_address=ip,
            subnet_mask="255.255.255.0",
            gateway="10.205.2.1",
            dns_server="8.8.8.8",
            encoder_ip="10.205.3.250",
            encoder_port="554",
            stream_protocol="RTSP",
            video_quality="High",
            gps_enabled="true",
            update_interval="5s",
            position_accuracy="High",
            altitude_tracking="enabled",
            ntp_server="10.205.0.2",
            timezone="UTC",
            auto_update="enabled",
            log_level="INFO"
        )
    
    # For real devices, use existing function
    return get_obc_config(ip)


@router.post("/{ip}/config")
def obc_config_update(ip: str, config: dict):
    """Update configuration for an OBC device"""
    is_demo = ip.startswith("10.205.2.")
    
    if is_demo:
        return {
            "status": "success",
            "message": "Configuration updated successfully",
            "device_ip": ip,
            "updated_fields": list(config.keys())
        }
    
    return {
        "status": "error",
        "message": "Configuration update not supported for non-demo devices"
    }


@router.get("/{ip}/logs", response_model=ObcLogsResponse)
def obc_logs(ip: str, level: Optional[str] = None, limit: int = 100):
    """Get logs from an OBC device"""
    is_demo = ip.startswith("10.205.2.")
    
    if not is_demo:
        return ObcLogsResponse(
            device_ip=ip,
            logs=[],
            total_count=0
        )
    
    # Generate demo logs
    log_levels = ["INFO", "WARNING", "ERROR"]
    log_messages = [
        "OBC system initialized successfully",
        "GPS position updated: Lat 40.7128, Lon -74.0060",
        "Storage usage above 35%",
        "Encoder connection established",
        "NTP sync failed, using local time",
        "Train position updated: Prd d 15 h 20 m",
        "Network configuration updated",
        "Temperature threshold exceeded",
        "Disk space check completed",
        "GPS satellite lock acquired"
    ]
    
    logs = []
    for i in range(min(limit, 20)):
        log_level = random.choice(log_levels)
        if level and log_level.lower() != level.lower():
            continue
            
        logs.append(ObcLogEntry(
            timestamp=(datetime.datetime.utcnow() - datetime.timedelta(seconds=i * 5)).isoformat(),
            level=log_level,
            message=random.choice(log_messages),
            source="obc"
        ))
    
    logs.sort(key=lambda x: x.timestamp, reverse=True)
    
    return ObcLogsResponse(
        device_ip=ip,
        logs=logs,
        total_count=len(logs)
    )


@router.get("/{ip}/netstats")
def obc_netstats(ip: str):
    return get_obc_netstats(ip)

@router.get("/{ip}/cpu")
def obc_cpu(ip: str):
    return {"cpu": get_obc_cpu(ip)}

@router.get("/{ip}/uptime")
def obc_uptime(ip: str):
    return {"uptime": get_obc_uptime(ip)}

@router.get("/{ip}/disk")
def obc_disk(ip: str):
    return get_obc_disk(ip)
