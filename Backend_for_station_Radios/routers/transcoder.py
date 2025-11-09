from __future__ import annotations

from datetime import date
from fastapi import APIRouter, Query

from ..transcoder_client import get_transcoder_logs
from ..models.transcoder_models import TranscoderLogs

router = APIRouter(prefix="/transcoder", tags=["transcoder"])

@router.get("/{ip}/logs", response_model=TranscoderLogs)
def transcoder_logs(ip: str, since: date = Query(...), search: str = Query("") ):
    return get_transcoder_logs(ip, since=since, search=search)
