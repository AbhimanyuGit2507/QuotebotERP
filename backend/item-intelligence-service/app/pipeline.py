from .schemas import MatchRequest, ItemMatchResult, MatchCandidate
from rapidfuzz import fuzz
from text_unidecode import unidecode
from typing import List, Optional
import re
import uuid
import logging

logger = logging.getLogger(__name__)

# Lazy-load semantic transformer
_semantic_encoder = None

def get_semantic_encoder():
    """Lazy-load sentence transformer model on first use."""
    global _semantic_encoder
    if _semantic_encoder is None:
        try:
            from sentence_transformers import SentenceTransformer
            logger.info("Loading sentence transformer model...")
            _semantic_encoder = SentenceTransformer('all-MiniLM-L6-v2')
            logger.info("Sentence transformer loaded successfully")
        except Exception as e:
            logger.error(f"Failed to load semantic encoder: {e}")
            _semantic_encoder = False  # Mark as unavailable
    return _semantic_encoder if _semantic_encoder is not False else None


def normalize_text(s: str) -> str:
    s = s or ""
    s = unidecode(s)
    s = s.lower().strip()
    s = re.sub(r"[^a-z0-9 ]+", " ", s)
    s = re.sub(r"\s+", " ", s)
    # naive plural stripping
    if s.endswith('s') and len(s) > 3:
        s = s[:-1]
    return s


def tokens(s: str):
    return set((s or "").split())


def score_pair(a: str, b: str) -> float:
    # Combine token sort and partial ratio for robustness
    s1 = fuzz.token_sort_ratio(a, b)
    s2 = fuzz.partial_ratio(a, b)
    return float(max(s1, s2)) / 100.0


def compute_semantic_similarity(input_text: str, candidate_text: str) -> float:
    """Compute semantic similarity using sentence transformers."""
    try:
        encoder = get_semantic_encoder()
        if not encoder:
            return 0.0
        
        embeddings = encoder.encode([input_text, candidate_text])
        from sklearn.metrics.pairwise import cosine_similarity
        similarity = cosine_similarity([embeddings[0]], [embeddings[1]])[0][0]
        return float(similarity)
    except Exception as e:
        logger.error(f"Error computing semantic similarity: {e}")
        return 0.0


def blend_scores(fuzzy_score: float, semantic_score: float, semantic_weight: float) -> float:
    """Blend fuzzy and semantic scores."""
    fuzzy_weight = 1.0 - semantic_weight
    return (fuzzy_score * fuzzy_weight) + (semantic_score * semantic_weight)


def run_matching(request: MatchRequest) -> List[ItemMatchResult]:
    # thresholds (could be per-tenant later)
    auto_accept_threshold = 0.92
    suggestion_threshold = 0.80

    candidates = request.candidates or []
    normalized_candidates = [
        {
            "id": c.id,
            "text": c.text,
            "norm": normalize_text(c.text),
            "aliases": [normalize_text(a) for a in (c.metadata or {}).get('aliases', [])] if c.metadata else [],
            "metadata": c.metadata,
        }
        for c in candidates
    ]

    out: List[ItemMatchResult] = []
    for itm in request.items:
        in_norm = normalize_text(itm.text)
        in_tokens = tokens(in_norm)
        candidates_scores = []

        # prefilter: require at least one token overlap or alias match
        for c in normalized_candidates:
            candidate_tokens = tokens(c['norm'])
            alias_tokens = set()
            for a in c.get('aliases', []) or []:
                alias_tokens |= tokens(a)

            overlap = bool(in_tokens & candidate_tokens) or bool(in_tokens & alias_tokens)
            if not overlap and len(candidates) > 50:
                # for large catalogs, skip non-overlapping candidates
                continue

            fuzzy_score = score_pair(in_norm, c['norm']) if c['norm'] else 0.0
            # boost if alias matches exactly
            if any(in_norm == a for a in c.get('aliases', []) or []):
                fuzzy_score = max(fuzzy_score, 0.95)

            # Compute semantic score if enabled
            if request.semantic_reranker_enabled:
                semantic_score = compute_semantic_similarity(itm.text, c.get('text', ''))
                final_score = blend_scores(
                    fuzzy_score,
                    semantic_score,
                    request.semantic_weight or 0.5
                )
            else:
                final_score = fuzzy_score

            candidates_scores.append({
                'candidate_id': c.get('id'),
                'product_name': c.get('text'),
                'confidence': final_score,
                'metadata': c.get('metadata'),
            })

        candidates_scores_sorted = sorted(candidates_scores, key=lambda x: x['confidence'], reverse=True)
        top_k = request.top_k or 3
        suggestions = [MatchCandidate(candidate_id=s.get('candidate_id'), product_name=s.get('product_name'), confidence=s.get('confidence'), metadata=s.get('metadata')) for s in candidates_scores_sorted[:top_k]]

        best = suggestions[0] if suggestions else None
        best_conf = best.confidence if best else 0.0

        if best_conf >= auto_accept_threshold:
            decision = 'auto_accept'
        elif best_conf >= suggestion_threshold:
            decision = 'manual_review'
        else:
            decision = 'unresolved'

        out.append(
            ItemMatchResult(
                input_id=itm.id,
                input_text=itm.text,
                confidence=best_conf,
                decision=decision,
                suggestions=suggestions,
                best_match=best,
            ),
        )

    # wrap as top-level response structure is assembled by the caller
    return out

