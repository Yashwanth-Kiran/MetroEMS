from __future__ import annotations

from fastapi import APIRouter, Query
from typing import List

from ..metronms_client import get_events
from ..models.event_models import Event

router = APIRouter(prefix="/events", tags=["events"])

@router.get("/metronms", response_model=List[Event])
def events_list(filter: str = Query(""), limit: int = Query(50), offset: int = Query(0)):
    # Pass raw filter query directly; caller must construct appropriate filter string.
    # Example: filter="severity=MAJOR&uei=*"
    return get_events(filter_query=filter, limit=limit, offset=offset)
