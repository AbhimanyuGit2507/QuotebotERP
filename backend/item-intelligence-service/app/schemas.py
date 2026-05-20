from pydantic import BaseModel
from typing import List, Optional

class InputItem(BaseModel):
    id: Optional[str] = None
    text: str
    quantity: Optional[float] = None

class Candidate(BaseModel):
    id: Optional[str] = None
    text: str
    metadata: Optional[dict] = None

class MatchRequest(BaseModel):
    tenant_id: Optional[str] = None
    items: List[InputItem]
    candidates: Optional[List[Candidate]] = None
    top_k: Optional[int] = 3
    semantic_reranker_enabled: Optional[bool] = False
    semantic_weight: Optional[float] = 0.5

class MatchCandidate(BaseModel):
    candidate_id: Optional[str] = None
    product_name: str
    confidence: float
    metadata: Optional[dict] = None


class ItemMatchResult(BaseModel):
    input_id: Optional[str] = None
    input_text: str
    confidence: float
    decision: str
    suggestions: List[MatchCandidate]
    best_match: Optional[MatchCandidate] = None


class MatchResponse(BaseModel):
    run_id: str
    mode: str
    suggestion_threshold: float
    auto_accept_threshold: float
    items: List[ItemMatchResult]

class FeedbackRequest(BaseModel):
    tenant_id: Optional[str] = None
    input_id: Optional[str] = None
    chosen_candidate_id: Optional[str] = None
    accepted: bool
    comment: Optional[str] = None
