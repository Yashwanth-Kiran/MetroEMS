"""Lightweight HTTP helpers for backend service clients.

All higher-level client modules (OBC, Transcoder, MetroNMS) should use these
functions to perform GET requests and obtain either JSON (dict|list) or raw
text responses. Keeping the helpers tiny allows focused error handling in the
calling client where domain-specific HTTPException codes are raised.
"""

from typing import Any, Dict, List, Union
try:  # make static analysis happy even if requests not installed locally
    import requests  # type: ignore
except Exception:  # pragma: no cover - only during local analysis without deps
    requests = None  # type: ignore

JsonType = Union[Dict[str, Any], List[Any]]

def http_get_text(url: str, auth=None, timeout: float = 3.0) -> str:
    """GET a URL and return text body. Raises for non-2xx via requests.

    Parameters
    ----------
    url: str
        Fully qualified URL (including scheme) to fetch.
    auth: Any
        Optional auth object passed directly to requests.get.
    timeout: float
        Socket + connect timeout seconds (short to keep backend responsive).
    """
    if requests is None:
        raise RuntimeError("'requests' package not available")
    r = requests.get(url, auth=auth, timeout=timeout)
    r.raise_for_status()
    return r.text

def http_get_json(url: str, auth=None, timeout: float = 3.0) -> JsonType:
    """GET a URL and attempt to parse JSON, returning dict|list.

    Raises requests exceptions for connectivity / status errors and ValueError
    if JSON decoding fails (caller decides how to map to HTTP errors).
    """
    if requests is None:
        raise RuntimeError("'requests' package not available")
    r = requests.get(url, auth=auth, timeout=timeout)
    r.raise_for_status()
    # If body empty, treat as {} for convenience
    if not r.text.strip():
        return {}
    return r.json()

