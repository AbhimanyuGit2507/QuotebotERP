Item Intelligence Sidecar

Run locally (development):

1. Create a virtualenv and install requirements:

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

2. Start the server:

```bash
INTERNAL_API_KEY=dev-internal-key uvicorn app.main:app --reload --port 3801
```

API endpoints:
- POST /match - returns match candidates for input items. Provide `candidates` list in the request for local-first matching.
- POST /feedback - accepts basic feedback payloads (not persisted yet).
