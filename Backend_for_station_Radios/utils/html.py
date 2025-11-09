"""
Tiny HTML helper utilities used by Proxim HTTP scrapers.
"""
from __future__ import annotations

from bs4 import BeautifulSoup, Tag
from typing import Iterable, Optional, Pattern, Union
import re
from urllib.parse import urljoin

TextPattern = Union[str, Pattern[str]]


def normalize_text(text: Optional[str]) -> str:
    """Return a whitespace-normalized string ('' for None)."""
    if not text:
        return ""
    # collapse internal whitespace and strip
    return re.sub(r"\s+", " ", str(text)).strip()


def text_of(node: Optional[Tag]) -> str:
    """Extract visible text from a BeautifulSoup Tag and normalize it."""
    if not node:
        return ""
    return normalize_text(node.get_text(" ", strip=True))


a_HERE_RE = re.compile(r"\bhere\b", re.I)


def find_link_by_text(soup: BeautifulSoup, pattern: TextPattern) -> Optional[Tag]:
    """Find first anchor whose visible text matches the given pattern.
    Pattern can be a case-insensitive substring or compiled regex.
    """
    if isinstance(pattern, str):
        pat = re.compile(re.escape(pattern), re.I)
    else:
        pat = pattern
    for a in soup.find_all("a"):
        if pat.search(text_of(a)):
            return a
    return None


def find_link_near_text(soup: BeautifulSoup, *keywords: str) -> Optional[Tag]:
    """Best-effort: locate a link element near a block containing all keywords.
    We'll scan text nodes and look at their parents for sibling anchors.
    """
    kws = [re.compile(re.escape(k), re.I) for k in keywords if k]
    if not kws:
        return None
    # Search for any element/node containing all keywords
    for node in soup.find_all(text=True):
        t = normalize_text(str(node))
        if all(k.search(t) for k in kws):
            # prefer an anchor in the same parent
            parent = node.parent if hasattr(node, "parent") else None
            if parent:
                a = parent.find("a")
                if a:
                    return a
            # otherwise try the next siblings
            parent = parent or soup
            sib = parent.find_next("a")
            if sib:
                return sib
    # Fallback: any standalone HERE link
    return find_link_by_text(soup, a_HERE_RE)


def absolute_url(base: str, href: str) -> str:
    """Join base and href into an absolute URL, safely."""
    return urljoin(base, href or "")
