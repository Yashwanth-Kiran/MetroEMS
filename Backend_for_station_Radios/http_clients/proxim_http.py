from __future__ import annotations

"""
HTTP client and scrapers for Proxim Tsunami devices.
The implementation focuses on resilient navigation and parsing across firmware flavors.
"""

import asyncio
import re
from dataclasses import dataclass
from typing import Dict, List, Optional, Tuple

import httpx
from bs4 import BeautifulSoup

from ..utils.html import absolute_url, find_link_by_text, find_link_near_text, normalize_text, text_of


# --- Exceptions ----------------------------------------------------------------
class ProximAuthError(Exception):
    pass


class ProximNavigationError(Exception):
    pass


class ProximDownloadError(Exception):
    pass


@dataclass
class _Download:
    url: str
    filename: Optional[str]


class ProximHttpClient:
    def __init__(self, ip: str, username: str, password: str, timeout: float = 10.0):
        self.ip = ip
        self.base_url = f"http://{ip}"
        self.username = username
        self.password = password
        self.timeout = timeout
        self._client: Optional[httpx.AsyncClient] = None
        self._logged_in: bool = False

    async def _ensure_client(self) -> httpx.AsyncClient:
        if self._client is None:
            self._client = httpx.AsyncClient(base_url=self.base_url, timeout=self.timeout, follow_redirects=True)
        return self._client

    async def close(self) -> None:
        if self._client is not None:
            try:
                await self._client.aclose()
            except Exception:
                pass
            self._client = None

    async def _get(self, url: str, **kw) -> httpx.Response:
        client = await self._ensure_client()
        # two attempts for resilience
        last_exc: Optional[Exception] = None
        for _ in range(2):
            try:
                return await client.get(url, **kw)
            except Exception as e:
                last_exc = e
                await asyncio.sleep(0.2)
        raise ProximNavigationError(f"GET failed for {url}: {last_exc}")

    async def _post(self, url: str, data: Dict[str, str], **kw) -> httpx.Response:
        client = await self._ensure_client()
        last_exc: Optional[Exception] = None
        for _ in range(2):
            try:
                return await client.post(url, data=data, **kw)
            except Exception as e:
                last_exc = e
                await asyncio.sleep(0.2)
        raise ProximNavigationError(f"POST failed for {url}: {last_exc}")

    async def login(self) -> None:
        """Login using either HTTP Basic or form credentials.
        After this call, cookies/session are kept in the AsyncClient.
        """
        client = await self._ensure_client()
        # First request home page to detect auth type
        resp = await self._get("/")
        if resp.status_code == 401 and resp.headers.get("www-authenticate"):
            # HTTP Basic
            try:
                await client.aclose()
            except Exception:
                pass
            self._client = httpx.AsyncClient(
                base_url=self.base_url,
                timeout=self.timeout,
                follow_redirects=True,
                auth=(self.username, self.password),
            )
            # Re-issue root
            r = await self._get("/")
            if r.status_code in (200, 302):
                self._logged_in = True
                return
            raise ProximAuthError(f"Basic auth failed (status={r.status_code})")

        # Try to find a login form
        soup = BeautifulSoup(resp.text, "lxml")
        form = soup.find("form")
        if form is None:
            # maybe no auth required
            self._logged_in = True
            return
        # Build payload using common field names
        fields = {i.get("name", ""): i.get("value", "") for i in form.find_all("input") if i.get("name")}
        # heuristics for username/password field names
        user_keys = [k for k in fields.keys() if re.search(r"user|login|name", k, re.I)]
        pass_keys = [k for k in fields.keys() if re.search(r"pass|pwd", k, re.I)]
        if user_keys:
            fields[user_keys[0]] = self.username
        if pass_keys:
            fields[pass_keys[0]] = self.password
        action = form.get("action") or "/"
        method = (form.get("method") or "post").lower()
        url = absolute_url(self.base_url + "/", action)
        r = await (self._post(url, fields) if method == "post" else self._get(url, params=fields))
        if r.status_code not in (200, 302):
            raise ProximAuthError(f"Login failed (status={r.status_code})")
        # Verify not on a login page again
        if re.search(r"login|sign\s*in|authentication", normalize_text(r.text), re.I):
            raise ProximAuthError("Login appears to have failed (login page detected)")
        self._logged_in = True

    async def _discover_retrieve_eventlog(self) -> _Download:
        """Navigate to Event Log download page and extract the link URL.
        Returns the absolute URL for the download.
        """
        client = await self._ensure_client()
        # Seed with some candidate pages that often contain navigation
        candidates = ["/", "/index.asp", "/retrieve.asp", "/cgi-bin/retrieve.cgi", "/cgi-bin/filemgmt.cgi"]
        for path in candidates:
            r = await self._get(path)
            soup = BeautifulSoup(r.text, "lxml")
            # Try to find link near the instructional text
            a = find_link_near_text(soup, "Retrieve from Device", "HTTP")
            if not a:
                # try any HERE link
                a = find_link_by_text(soup, re.compile(r"\bhere\b", re.I))
            if not a and soup.find(text=re.compile(r"Event\s*Log", re.I)):
                a = soup.find("a")
            if a and a.get("href"):
                url = absolute_url(str(r.url), a.get("href"))
                # The target page may itself have the final HERE link
                r2 = await self._get(url)
                s2 = BeautifulSoup(r2.text, "lxml")
                final = find_link_by_text(s2, re.compile(r"\bhere\b", re.I)) or find_link_near_text(s2, "Event", "Log")
                if final and final.get("href"):
                    return _Download(url=absolute_url(str(r2.url), final.get("href")), filename=None)
        raise ProximNavigationError("Could not locate Event Log download link")

    async def go_to_retrieve_event_log_download(self) -> str:
        dl = await self._discover_retrieve_eventlog()
        return dl.url

    async def download_event_log(self, raw: bool = True) -> Tuple[bytes, Optional[str]] | List[str]:
        """Download the event log. If raw=True, return (bytes, filename). If raw=False, return list[str]."""
        dl_url = await self.go_to_retrieve_event_log_download()
        r = await self._get(dl_url)
        if r.status_code != 200:
            raise ProximDownloadError(f"Download failed (status={r.status_code})")
        # Try to capture filename from Content-Disposition
        fname: Optional[str] = None
        cd = r.headers.get("content-disposition") or r.headers.get("Content-Disposition")
        if cd:
            m = re.search(r"filename\*=UTF-8''([^;]+)|filename=\"?([^\";]+)\"?", cd)
            if m:
                fname = m.group(1) or m.group(2)
        if raw:
            return (r.content, fname)
        # Decode text and split lines
        text = None
        for enc in ("utf-8", "latin-1"):
            try:
                text = r.content.decode(enc)
                break
            except Exception:
                continue
        if text is None:
            text = r.text
        # Split into non-empty lines
        lines = [normalize_text(x) for x in text.splitlines() if normalize_text(x)]
        return lines

    async def _find_page(self, keywords: List[str], extra_candidates: Optional[List[str]] = None) -> Tuple[str, BeautifulSoup]:
        """Locate a page by scanning candidates and following obvious links by text."""
        base_candidates = ["/", "/index.asp", "/status.asp", "/system.asp", "/cgi-bin/status.cgi"]
        if extra_candidates:
            base_candidates.extend(extra_candidates)
        for path in base_candidates:
            r = await self._get(path)
            soup = BeautifulSoup(r.text, "lxml")
            for kw in keywords:
                a = find_link_by_text(soup, re.compile(re.escape(kw), re.I))
                if a and a.get("href"):
                    u = absolute_url(str(r.url), a.get("href"))
                    r2 = await self._get(u)
                    return (str(r2.url), BeautifulSoup(r2.text, "lxml"))
        # fallback to last candidate
        r = await self._get(base_candidates[0])
        return (str(r.url), BeautifulSoup(r.text, "lxml"))

    async def scrape_license_features(self) -> Dict[str, Optional[str]]:
        """Scrape the License Features page and return a dict of normalized fields."""
        _, soup = await self._find_page(["License Features"], ["/license.asp", "/cgi-bin/license.cgi"])  # best-effort
        text = text_of(soup)
        # Look for key=value pairs present in many firmwares
        info: Dict[str, Optional[str]] = {
            "Product Description": None,
            "Maximum Output Bandwidth": None,
            "Maximum Input Bandwidth": None,
            "Maximum Aggregate Bandwidth": None,
            "MAC Address of the Device": None,
            "Product Family": None,
            "Product Class": None,
        }
        for k in list(info.keys()):
            m = re.search(rf"{re.escape(k)}\s*[:=]\s*([^\n\r]+)", text, re.I)
            if m:
                info[k] = normalize_text(m.group(1))
        return info

    async def scrape_ethernet_properties(self) -> Dict[str, Optional[str]]:
        """Scrape Ethernet → Interface 1 → Properties as a small dict."""
        _, soup = await self._find_page(["Ethernet", "Interface", "Properties"], ["/ethernet.asp", "/cgi-bin/ethernet.cgi"])  # best-effort
        table = soup.find("table")
        if not table:
            # fallback: use entire page text
            text = text_of(soup)
            return {
                "MAC Address": _extract_value(text, "MAC Address"),
                "Operational Speed": _extract_value(text, "Operational Speed"),
                "Operational Tx Mode": _extract_value(text, "Operational Tx Mode"),
                "Speed and Tx Mode": _extract_value(text, "Speed and Tx Mode"),
                "Admin Status": _extract_value(text, "Admin Status"),
            }
        # parse the first reasonable table
        headers = [normalize_text(th.get_text()) for th in table.find_all("th")]
        values = [normalize_text(td.get_text()) for td in table.find_all("td")]
        # Try to map by header
        mapping = {}
        for i, h in enumerate(headers):
            if i < len(values):
                mapping[h] = values[i]
        # If headers are not present as expected, fallback to direct label:value
        if not mapping:
            text = text_of(table)
            mapping = {
                "MAC Address": _extract_value(text, "MAC Address"),
                "Operational Speed": _extract_value(text, "Operational Speed"),
                "Operational Tx Mode": _extract_value(text, "Operational Tx Mode"),
                "Speed and Tx Mode": _extract_value(text, "Speed and Tx Mode"),
                "Admin Status": _extract_value(text, "Admin Status"),
            }
        return mapping

    async def scrape_local_snr_table(self) -> List[Dict[str, str]]:
        """Scrape the Local SNR Information table and return list of rows as dicts."""
        _, soup = await self._find_page(["Local SNR Information"], ["/snr.asp", "/cgi-bin/snr.cgi"])  # best-effort
        table = soup.find("table")
        if not table:
            raise ProximNavigationError("Local SNR table not found")
        # build header index
        headers = [normalize_text(th.get_text()) for th in table.find_all("th")]
        rows: List[Dict[str, str]] = []
        for tr in table.find_all("tr"):
            cols = [normalize_text(td.get_text()) for td in tr.find_all(["td"]) ]
            if len(cols) < 3:
                continue
            row: Dict[str, str] = {}
            for i, v in enumerate(cols):
                key = headers[i] if i < len(headers) else f"col{i}"
                row[key] = v
            rows.append(row)
        if not rows:
            raise ProximNavigationError("Local SNR rows not parsed")
        return rows


# --- helpers -------------------------------------------------------------------

def _extract_value(text: str, key: str) -> Optional[str]:
    m = re.search(rf"{re.escape(key)}\s*[:=]\s*([^\n\r]+)", text, re.I)
    return normalize_text(m.group(1)) if m else None
