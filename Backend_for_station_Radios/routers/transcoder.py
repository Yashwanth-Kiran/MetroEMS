from __future__ import annotations

from datetime import date
from fastapi import APIRouter, Query, HTTPException
from typing import Optional, Dict, Any

from ..transcoder_client import get_transcoder_logs
from ..models.transcoder_models import TranscoderLogs, TranscoderSummary, TranscoderMetrics
from ..transcoder_snmp import TranscoderAdapter

router = APIRouter(prefix="/transcoder", tags=["transcoder"])

@router.get("/{ip}/summary", response_model=TranscoderSummary)
def transcoder_summary(ip: str):
    """Get transcoder device summary information"""
    try:
        adapter = TranscoderAdapter(ip)
        device_info = adapter.identify(ip)
        status_data = adapter.get_status()
        
        return TranscoderSummary(
            ip=ip,
            type="transcoder",
            vendor=device_info.get("vendor", "KeyWest"),
            model=device_info.get("model", "T901"),
            name=device_info.get("name", "Unknown Transcoder"),
            sysName=device_info.get("name"),
            sysDescr=device_info.get("model"),
            firmware=status_data.get("firmware_version", "Unknown"),
            hardwareVersion=status_data.get("hardware_version", "Unknown"),
            uptimeSeconds=status_data.get("uptime", 0),
            online=device_info.get("status") == "online",
            cpu=status_data.get("cpu_usage", 0),
            memory=status_data.get("memory_usage", 0),
            temperature=status_data.get("temperature", 0),
            inputSignal=status_data.get("input_signal", "N/A"),
            outputStream=status_data.get("output_stream", "N/A"),
        )
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Failed to get transcoder summary: {str(e)}")

@router.get("/{ip}/metrics")
def transcoder_metrics(ip: str):
    """Get current transcoder metrics"""
    try:
        adapter = TranscoderAdapter(ip)
        status_data = adapter.get_status()
        
        return TranscoderMetrics(
            timestamp=None,  # Will be set automatically by pydantic
            cpu=status_data.get("cpu_usage", 0),
            memory=status_data.get("memory_usage", 0),
            temperature=status_data.get("temperature", 0),
            inputSignal=status_data.get("input_signal", "N/A"),
            outputStream=status_data.get("output_stream", "N/A"),
            bitrate=status_data.get("bitrate", 0),
        )
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Failed to get transcoder metrics: {str(e)}")

@router.get("/{ip}/config")
def transcoder_config(ip: str):
    """Get transcoder configuration"""
    try:
        adapter = TranscoderAdapter(ip)
        config_data = adapter.get_config(ip, {})
        return config_data
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Failed to get transcoder config: {str(e)}")

@router.post("/{ip}/config")
def update_transcoder_config(ip: str, config: Dict[str, Any]):
    """Update transcoder configuration"""
    try:
        adapter = TranscoderAdapter(ip)
        result = adapter.set_config(ip, config, {})
        return result
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Failed to update transcoder config: {str(e)}")

@router.get("/{ip}/logs", response_model=TranscoderLogs)
def transcoder_logs(ip: str, since: date = Query(...), search: str = Query("") ):
    return get_transcoder_logs(ip, since=since, search=search)

