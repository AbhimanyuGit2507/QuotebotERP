#!/bin/bash

# Quotebot Service Restart Script
# Clears existing instances and starts fresh backend + frontend with OAuth credentials

echo "🔄 Stopping existing backend and frontend instances..."

# Kill any existing node processes for backend/frontend
pkill -f "nest start" 2>/dev/null || true
pkill -f "react-scripts start" 2>/dev/null || true
pkill -f "npm run start:dev" 2>/dev/null || true
pkill -9 node 2>/dev/null || true

# Wait for ports to be freed
echo "⏳ Waiting for ports to be released..."
sleep 3

# Verify ports are free
if lsof -i :3001 >/dev/null 2>&1; then
  echo "⚠️  Port 3001 still in use, force clearing..."
  lsof -i :3001 | awk 'NR!=1 {print $2}' | xargs kill -9 2>/dev/null || true
  sleep 2
fi

if lsof -i :3000 >/dev/null 2>&1; then
  echo "⚠️  Port 3000 still in use, force clearing..."
  lsof -i :3000 | awk 'NR!=1 {print $2}' | xargs kill -9 2>/dev/null || true
  sleep 2
fi

echo "✅ Ports cleared"

# Load backend environment so the same OAuth and Gemini credentials are used everywhere.
if [ -f /home/avi/Projects/Quotebot/backend/.env ]; then
  set -a
  . /home/avi/Projects/Quotebot/backend/.env
  set +a
fi

export GMAIL_REDIRECT_URI="http://localhost:3001/api/email-integrations/oauth/callback"

# LLM retry and pipeline tuning (increase retries, backoff, and reduce extraction burst)
export RFQ_LLM_MAX_RETRIES="4"
export RFQ_LLM_RETRY_BASE_MS="2000"
export RFQ_EXTRACT_DELAY_MS="1000"
export RFQ_LLM_FALLBACK_ORDER="gemini,cerebras,groq"
export BACKEND_RFQ_PIPELINE_INTERVAL_MS="120000"
export FRONTEND_URL="http://localhost:3000"
export INTERNAL_API_KEY="dev-internal-key"
export TEST_INTERNAL_TENANT_ID="cmmvzc6z60003bze8i4uhs03l"

echo "🔐 OAuth credentials configured"

# Start backend
echo "🚀 Starting backend on port 3001..."
cd /home/avi/Projects/Quotebot/backend
npm run start:dev > backend.log 2>&1 &
BACKEND_PID=$!
echo "   Backend PID: $BACKEND_PID"

# Start frontend
echo "🚀 Starting frontend on port 3000..."
cd /home/avi/Projects/Quotebot/frontend
npm start > frontend.log 2>&1 &
FRONTEND_PID=$!
echo "   Frontend PID: $FRONTEND_PID"

echo ""
echo "⏳ Waiting for services to start (20 seconds)..."
sleep 20

# Check if services are running
echo ""
echo "✓ Checking service status..."

if lsof -i :3001 >/dev/null 2>&1; then
  echo "✅ Backend running on http://localhost:3001"
else
  echo "❌ Backend failed to start. Check backend.log:"
  tail -20 /home/avi/Projects/Quotebot/backend/backend.log
fi

if lsof -i :3000 >/dev/null 2>&1; then
  echo "✅ Frontend running on http://localhost:3000"
else
  echo "❌ Frontend failed to start. Check frontend.log:"
  tail -20 /home/avi/Projects/Quotebot/frontend/frontend.log
fi

echo ""
echo "📋 Service logs:"
echo "   Backend:  /home/avi/Projects/Quotebot/backend/backend.log"
echo "   Frontend: /home/avi/Projects/Quotebot/frontend/frontend.log"
echo ""
echo "🌐 Access the app at: http://localhost:3000"
echo "📧 Test OAuth at: http://localhost:3000/system-config?tab=communication"
