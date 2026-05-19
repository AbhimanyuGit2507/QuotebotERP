from fastapi import FastAPI, Header, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from .schemas import MatchRequest, MatchResponse, FeedbackRequest
from .pipeline import run_matching
import os
import uuid

app = FastAPI(title="Item Intelligence Sidecar")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

INTERNAL_KEY = os.environ.get("INTERNAL_API_KEY")

async def require_internal_key(x_internal_key: str | None = Header(None)):
    if not INTERNAL_KEY:
        # allow if not configured (dev convenience)
        return
    if x_internal_key != INTERNAL_KEY:
        raise HTTPException(status_code=401, detail="Unauthorized")

@app.post("/match", response_model=MatchResponse)
async def match(request: MatchRequest, x_internal_key: str | None = Header(None)):
    await require_internal_key(x_internal_key)
    items = run_matching(request)
    resp = MatchResponse(
        run_id=str(uuid.uuid4()),
        mode='manual',
        suggestion_threshold=0.8,
        auto_accept_threshold=0.92,
        items=items,
    )
    return resp


@app.post("/item-intelligence/match", response_model=MatchResponse)
async def match_compat(request: MatchRequest, x_internal_key: str | None = Header(None)):
    await require_internal_key(x_internal_key)
    items = run_matching(request)
    resp = MatchResponse(
        run_id=str(uuid.uuid4()),
        mode='manual',
        suggestion_threshold=0.8,
        auto_accept_threshold=0.92,
        items=items,
    )
    return resp

@app.post("/feedback")
async def feedback(req: FeedbackRequest, x_internal_key: str | None = Header(None)):
    await require_internal_key(x_internal_key)
    # For now, just acknowledge. Persistence will be handled by caller via backend API.
    return {"status": "ok"}


@app.post("/item-intelligence/feedback")
async def feedback_compat(req: FeedbackRequest, x_internal_key: str | None = Header(None)):
    await require_internal_key(x_internal_key)
    return {"status": "ok"}

@app.get("/health")
async def health():
    return {"status": "ok"}
