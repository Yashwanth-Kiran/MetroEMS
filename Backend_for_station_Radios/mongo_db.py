from __future__ import annotations
import os
from typing import Any

_MONGO_CLIENT = None
_DB = None


def get_db() -> Any:
    global _MONGO_CLIENT, _DB
    if _DB is not None:
        return _DB
    url = os.getenv("MONGO_URL", "mongodb://localhost:27017/metroems")
    try:
        from pymongo import MongoClient  # type: ignore
        _MONGO_CLIENT = MongoClient(url)
        # database name is last segment after '/'
        dbname = url.rsplit('/', 1)[-1] or 'metroems'
        _DB = _MONGO_CLIENT[dbname]
        return _DB
    except Exception:
        # Fallback: in-memory shims
        class _Coll(list):
            def insert_one(self, doc):
                self.append(doc)
                return type('R', (), {'inserted_id': len(self)})
            def find(self, q=None, *a, **k):
                return [d for d in self]
            def find_one(self, q=None, *a, **k):
                return self[0] if self else None
            def update_one(self, q, u, upsert=False):
                return None
        class _DBShim(dict):
            def __getitem__(self, k):
                if k not in self:
                    self[k] = _Coll()
                return dict.__getitem__(self, k)
        _DB = _DBShim()
        return _DB
