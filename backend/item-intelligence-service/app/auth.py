import os
from fastapi import Header, HTTPException

INTERNAL_KEY = os.environ.get("INTERNAL_API_KEY")

async def require_internal_key(x_internal_key: str | None = Header(None)):
    if not INTERNAL_KEY:
        return
    if x_internal_key != INTERNAL_KEY:
        raise HTTPException(status_code=401, detail="Unauthorized")
