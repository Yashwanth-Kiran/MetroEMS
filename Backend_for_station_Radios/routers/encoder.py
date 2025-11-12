"""
Encoder device router - API endpoints for encoder management
"""
from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional
import datetime
import random

from ..models.encoder_models import (
    EncoderSummary,
    EncoderMetrics,
    EncoderConfig,
    EncoderConfigUpdate,
    EncoderLogEntry,
    EncoderLogsResponse,
    EncoderQuadSettings,
    EncoderRTSPSettings,
    EncoderHDMISettings
)

router = APIRouter(prefix="/encoder", tags=["encoder"])


@router.get("/{ip}/summary", response_model=EncoderSummary)
async def get_encoder_summary(ip: str):
    """
    Get summary information for an encoder device.
    For demo devices, returns simulated data.
    """
    # Check if this is a demo device
    is_demo = ip.startswith("192.168.77.")
    
    summary = EncoderSummary(
        device_ip=ip,
        device_type="Encoder",
        model="E801" if is_demo else "Unknown",
        firmware_version="2.8.4" if is_demo else "Unknown",
        hardware_version="Rev C" if is_demo else "Unknown",
        serial_number=f"ENC{random.randint(100000, 999999)}" if is_demo else None,
        uptime=f"{random.randint(1, 30)} days {random.randint(0, 23)} hours" if is_demo else None,
        status="online" if is_demo else "unknown",
        quad=EncoderQuadSettings(
            encoder="H.264",
            profile="main",
            xpos="0",
            ypos="0"
        ) if is_demo else None,
        rtsp=EncoderRTSPSettings(
            camIdUrl="rtsp://192.168.1.100:554/stream1",
            camIdUrl2="rtsp://192.168.1.101:554/stream1",
            camIdUrl3="rtsp://192.168.1.102:554/stream1",
            camIdUrl4="rtsp://192.168.1.103:554/stream1"
        ) if is_demo else None,
        hdmi=EncoderHDMISettings(
            inputStatus="Connected",
            resolution="1920x1080"
        ) if is_demo else None
    )
    
    return summary


@router.get("/{ip}/metrics", response_model=EncoderMetrics)
async def get_encoder_metrics(ip: str):
    """
    Get real-time metrics for an encoder device.
    For demo devices, returns simulated metrics.
    """
    # Check if this is a demo device
    is_demo = ip.startswith("192.168.77.")
    
    if is_demo:
        metrics = EncoderMetrics(
            device_ip=ip,
            cpu_usage=random.uniform(20, 75),
            memory_usage=random.uniform(30, 70),
            temperature=random.uniform(40, 65),
            bandwidth=random.uniform(35, 55),
            input_bitrate=random.uniform(3000, 5000),
            output_bitrate=random.uniform(2800, 4800),
            dropped_frames=random.randint(0, 5),
            timestamp=datetime.datetime.utcnow().isoformat()
        )
    else:
        # For real devices, would query actual hardware
        metrics = EncoderMetrics(
            device_ip=ip,
            cpu_usage=0.0,
            memory_usage=0.0,
            temperature=0.0,
            bandwidth=0.0,
            timestamp=datetime.datetime.utcnow().isoformat()
        )
    
    return metrics


@router.get("/{ip}/config", response_model=EncoderConfig)
async def get_encoder_config(ip: str):
    """
    Get current configuration for an encoder device.
    """
    # Check if this is a demo device
    is_demo = ip.startswith("192.168.77.")
    
    if is_demo:
        config = EncoderConfig(
            resolution="1920x1080",
            framerate="30",
            bitrate="4000",
            codec="H.264",
            ip_address=ip,
            subnet_mask="255.255.255.0",
            gateway="192.168.77.1",
            multicast_address="239.1.1.1",
            protocol="RTSP",
            port="554",
            stream_name="stream1",
            encryption="None",
            audio_codec="AAC",
            sample_rate="48000",
            channels="2",
            audio_bitrate="128"
        )
    else:
        # For real devices, would query actual configuration
        config = EncoderConfig(
            ip_address=ip
        )
    
    return config


@router.post("/{ip}/config")
async def update_encoder_config(ip: str, config_update: EncoderConfigUpdate):
    """
    Update configuration for an encoder device.
    For demo devices, simulates the update.
    """
    # Check if this is a demo device
    is_demo = ip.startswith("192.168.77.")
    
    if not is_demo:
        raise HTTPException(
            status_code=501,
            detail="Configuration update not implemented for non-demo devices"
        )
    
    # For demo devices, simulate successful update
    return {
        "status": "success",
        "message": "Configuration updated successfully",
        "device_ip": ip,
        "updated_fields": list(config_update.config.keys())
    }


@router.get("/{ip}/logs", response_model=EncoderLogsResponse)
async def get_encoder_logs(
    ip: str,
    level: Optional[str] = None,
    limit: int = 100
):
    """
    Get logs from an encoder device.
    For demo devices, returns simulated logs.
    """
    # Check if this is a demo device
    is_demo = ip.startswith("192.168.77.")
    
    if not is_demo:
        return EncoderLogsResponse(
            device_ip=ip,
            logs=[],
            total_count=0
        )
    
    # Generate demo logs
    log_levels = ["INFO", "WARNING", "ERROR"]
    log_messages = [
        "Encoder stream started successfully",
        "Video input detected: 1920x1080@30fps",
        "High CPU usage detected",
        "Audio codec initialized: AAC",
        "RTSP stream connection timeout",
        "Network configuration updated",
        "Firmware update available",
        "Temperature threshold exceeded",
        "Bitrate adjusted to match bandwidth",
        "New RTSP client connected"
    ]
    
    logs = []
    for i in range(min(limit, 20)):
        log_level = random.choice(log_levels)
        if level and log_level.lower() != level.lower():
            continue
            
        logs.append(EncoderLogEntry(
            timestamp=datetime.datetime.utcnow() - datetime.timedelta(seconds=i * 5),
            level=log_level,
            message=random.choice(log_messages),
            source="encoder"
        ))
    
    # Sort by timestamp descending
    logs.sort(key=lambda x: x.timestamp, reverse=True)
    
    return EncoderLogsResponse(
        device_ip=ip,
        logs=logs,
        total_count=len(logs)
    )
