"""
Encoder data models for API requests and responses.
"""
from pydantic import BaseModel
from typing import Optional, Dict, Any, List


class EncoderQuadSettings(BaseModel):
    """Quad encoder settings"""
    encoder: Optional[str] = None
    profile: Optional[str] = "main"
    xpos: Optional[str] = "0"
    ypos: Optional[str] = "0"


class EncoderRTSPSettings(BaseModel):
    """RTSP/RTP stream settings"""
    camIdUrl: Optional[str] = None
    camIdUrl2: Optional[str] = None
    camIdUrl3: Optional[str] = None
    camIdUrl4: Optional[str] = None


class EncoderHDMISettings(BaseModel):
    """HDMI input settings"""
    inputStatus: Optional[str] = "Connected"
    resolution: Optional[str] = "1920x1080"


class EncoderSummary(BaseModel):
    """Summary information for encoder device"""
    device_ip: str
    device_type: str = "Encoder"
    model: Optional[str] = "E801"
    firmware_version: Optional[str] = "2.8.4"
    hardware_version: Optional[str] = "Rev C"
    serial_number: Optional[str] = None
    uptime: Optional[str] = None
    status: str = "online"
    
    # Encoder-specific settings
    quad: Optional[EncoderQuadSettings] = None
    rtsp: Optional[EncoderRTSPSettings] = None
    hdmi: Optional[EncoderHDMISettings] = None


class EncoderMetrics(BaseModel):
    """Real-time metrics for encoder"""
    device_ip: str
    cpu_usage: float = 0.0
    memory_usage: float = 0.0
    temperature: float = 0.0
    bandwidth: float = 0.0
    input_bitrate: Optional[float] = None
    output_bitrate: Optional[float] = None
    dropped_frames: int = 0
    timestamp: Optional[str] = None


class EncoderConfig(BaseModel):
    """Configuration settings for encoder"""
    # Video settings
    resolution: Optional[str] = "1920x1080"
    framerate: Optional[str] = "30"
    bitrate: Optional[str] = "4000"
    codec: Optional[str] = "H.264"
    
    # Network settings
    ip_address: Optional[str] = None
    subnet_mask: Optional[str] = "255.255.255.0"
    gateway: Optional[str] = None
    multicast_address: Optional[str] = None
    
    # Streaming settings
    protocol: Optional[str] = "RTSP"
    port: Optional[str] = "554"
    stream_name: Optional[str] = "stream1"
    encryption: Optional[str] = "None"
    
    # Audio settings
    audio_codec: Optional[str] = "AAC"
    sample_rate: Optional[str] = "48000"
    channels: Optional[str] = "2"
    audio_bitrate: Optional[str] = "128"


class EncoderConfigUpdate(BaseModel):
    """Request model for updating encoder configuration"""
    config: Dict[str, Any]


class EncoderLogEntry(BaseModel):
    """Single log entry"""
    timestamp: str
    level: str  # INFO, WARNING, ERROR
    message: str
    source: Optional[str] = "encoder"


class EncoderLogsResponse(BaseModel):
    """Response containing encoder logs"""
    device_ip: str
    logs: List[EncoderLogEntry]
    total_count: int
