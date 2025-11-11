from __future__ import annotations

from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime


class TranscoderLogEntry(BaseModel):
    timestamp: Optional[str] = None
    level: Optional[str] = None
    message: str


class TranscoderLogs(BaseModel):
    ip: str
    since: str
    search: str
    entries: List[TranscoderLogEntry]


class TranscoderSummary(BaseModel):
    """Summary information for a transcoder device"""
    ip: str
    type: str = "transcoder"
    vendor: Optional[str] = None
    model: Optional[str] = None
    name: Optional[str] = None
    sysName: Optional[str] = None
    sysDescr: Optional[str] = None
    firmware: Optional[str] = None
    hardwareVersion: Optional[str] = None
    uptimeSeconds: Optional[int] = None
    online: bool = False
    cpu: Optional[float] = None
    memory: Optional[float] = None
    temperature: Optional[float] = None
    inputSignal: Optional[str] = None
    outputStream: Optional[str] = None


class TranscoderMetrics(BaseModel):
    """Real-time metrics for a transcoder device"""
    timestamp: Optional[str] = None
    cpu: Optional[float] = None
    memory: Optional[float] = None
    temperature: Optional[float] = None
    inputSignal: Optional[str] = None
    outputStream: Optional[str] = None
    bitrate: Optional[float] = None
    
    class Config:
        # Automatically set timestamp if not provided
        @staticmethod
        def schema_extra(schema, model):
            if 'timestamp' not in schema.get('properties', {}):
                schema['properties']['timestamp'] = {
                    'type': 'string',
                    'default': datetime.utcnow().isoformat()
                }

