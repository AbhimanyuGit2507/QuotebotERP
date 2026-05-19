from pydantic import BaseModel
from typing import List, Optional

class InputItem(BaseModel):
    id: Optional[str]
    text: str
    quantity: Optional[float]

class Candidate(BaseModel):
    id: Optional[str]
    text: str
    metadata: Optional[dict] = None

class MatchRequest(BaseModel):
    tenant_id: Optional[str]
    items: List[InputItem]
    candidates: Optional[List[Candidate]] = None
    top_k: Optional[int] = 3

class MatchCandidate(BaseModel):
    candidate_id: Optional[str]
    product_name: str
    confidence: float
    metadata: Optional[dict] = None


class ItemMatchResult(BaseModel):
    input_id: Optional[str]
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
    tenant_id: Optional[str]
    input_id: Optional[str]
    chosen_candidate_id: Optional[str]
    accepted: bool
    comment: Optional[str] = None
