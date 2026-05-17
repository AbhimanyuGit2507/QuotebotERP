#!/bin/bash

# Quotebot Deployment Setup Helper
# Generates secrets and prepares for Vercel + Render deployment

set -e

BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

clear

echo -e "${BLUE}"
echo "╔═══════════════════════════════════════════════╗"
echo "║  Quotebot Deployment Setup                    ║"
echo "║  Vercel (Frontend) + Render (Backend)         ║"
echo "╚═══════════════════════════════════════════════╝"
echo -e "${NC}"
echo ""

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
echo -e "${BLUE}🔍 Checking prerequisites...${NC}"
echo ""

if ! command_exists git; then
    echo -e "${RED}✗ Git is not installed${NC}"
    echo "  Install: sudo apt install git"
    exit 1
else
    echo -e "${GREEN}✓ Git is installed${NC}"
fi

if ! command_exists openssl; then
    echo -e "${YELLOW}⚠ OpenSSL not found, will use alternative method${NC}"
    USE_OPENSSL=false
else
    echo -e "${GREEN}✓ OpenSSL is installed${NC}"
    USE_OPENSSL=true
fi

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Generate JWT Secret
echo -e "${BLUE}🔐 Generating JWT Secret...${NC}"
echo ""

if [ "$USE_OPENSSL" = true ]; then
    JWT_SECRET=$(openssl rand -base64 48)
else
    # Fallback method using /dev/urandom
    JWT_SECRET=$(cat /dev/urandom | tr -dc 'a-zA-Z0-9' | fold -w 64 | head -n 1)
fi

echo -e "${GREEN}✓ JWT Secret generated!${NC}"
echo ""
echo -e "${YELLOW}Copy this JWT_SECRET (you'll need it for Render):${NC}"
echo ""
echo -e "${GREEN}$JWT_SECRET${NC}"
echo ""
echo -e "${YELLOW}⚠️  Save this secret somewhere safe! You'll need to paste it into Render.${NC}"
echo ""

read -p "Press Enter after you've copied the JWT secret..."
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Check if git repository is initialized
echo -e "${BLUE}📦 Checking Git repository...${NC}"
echo ""

if [ -d .git ]; then
    echo -e "${GREEN}✓ Git repository already initialized${NC}"
    
    # Check if there are uncommitted changes
    if ! git diff-index --quiet HEAD -- 2>/dev/null; then
        echo -e "${YELLOW}⚠️  You have uncommitted changes${NC}"
        read -p "Do you want to commit all changes now? (y/n): " -n 1 -r
        echo ""
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            git add .
            git commit -m "Prepare for deployment"
            echo -e "${GREEN}✓ Changes committed${NC}"
        fi
    else
        echo -e "${GREEN}✓ No uncommitted changes${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  Git repository not initialized${NC}"
    read -p "Initialize git repository now? (y/n): " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        git init
        git add .
        git commit -m "Initial commit - Ready for deployment"
        git branch -M main
        echo -e "${GREEN}✓ Git repository initialized${NC}"
    else
        echo -e "${RED}✗ Cannot proceed without git repository${NC}"
        exit 1
    fi
fi

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Check GitHub remote
echo -e "${BLUE}🌐 Checking GitHub remote...${NC}"
echo ""

if git remote get-url origin >/dev/null 2>&1; then
    REPO_URL=$(git remote get-url origin)
    echo -e "${GREEN}✓ GitHub remote configured${NC}"
    echo -e "  Repository: ${YELLOW}$REPO_URL${NC}"
else
    echo -e "${YELLOW}⚠️  No GitHub remote configured${NC}"
    echo ""
    echo "Next steps:"
    echo "1. Create a new repository at: https://github.com/new"
    echo "2. Run these commands:"
    echo ""
    echo -e "${YELLOW}git remote add origin https://github.com/YOUR-USERNAME/quotebot.git${NC}"
    echo -e "${YELLOW}git push -u origin main${NC}"
    echo ""
fi

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Environment Variables Summary
echo -e "${BLUE}📋 Environment Variables Needed${NC}"
echo ""
echo -e "${YELLOW}For Render Backend:${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo -e "DATABASE_URL=${YELLOW}<provided-by-render>${NC}"
echo -e "NODE_ENV=${GREEN}production${NC}"
echo -e "JWT_SECRET=${GREEN}$JWT_SECRET${NC}"
echo -e "OPENAI_API_KEY=${YELLOW}sk-your-openai-api-key${NC}"
echo -e "LLM_PROVIDER=${GREEN}openai${NC}"
echo -e "FRONTEND_URL=${YELLOW}http://localhost:3000${NC} ${BLUE}# Update after Vercel deployment${NC}"
echo -e "AUTO_EMAIL_SYNC_ENABLED=${GREEN}true${NC}"
echo -e "AUTO_SEND_QUOTATION=${GREEN}true${NC}"
echo -e "BACKEND_RFQ_PIPELINE_ENABLED=${GREEN}true${NC}"
echo ""
echo -e "${YELLOW}Optional (for Gmail):${NC}"
echo -e "GMAIL_CLIENT_ID=${YELLOW}your-gmail-client-id${NC}"
echo -e "GMAIL_CLIENT_SECRET=${YELLOW}your-gmail-client-secret${NC}"
echo ""
echo -e "${YELLOW}For Vercel Frontend:${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo -e "REACT_APP_API_URL=${YELLOW}https://your-backend.onrender.com/api${NC}"
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# OpenAI API Key reminder
echo -e "${BLUE}🔑 API Keys Needed${NC}"
echo ""
echo "1. ${YELLOW}OpenAI API Key${NC} (Required for RFQ processing)"
echo "   Get it from: ${BLUE}https://platform.openai.com/api-keys${NC}"
echo ""
echo "2. ${YELLOW}Gmail OAuth Credentials${NC} (Optional - for email integration)"
echo "   Get it from: ${BLUE}https://console.cloud.google.com${NC}"
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Deployment checklist
echo -e "${BLUE}📝 Next Steps${NC}"
echo ""
echo "1. ${GREEN}✓${NC} JWT secret generated"
echo "2. Create GitHub repository at ${BLUE}https://github.com/new${NC}"
echo "3. Push code to GitHub"
echo "4. Create Render account at ${BLUE}https://render.com${NC}"
echo "5. Create Vercel account at ${BLUE}https://vercel.com${NC}"
echo "6. Follow the deployment guide:"
echo "   ${YELLOW}cat DEPLOY-VERCEL-RENDER.md${NC}"
echo "   ${YELLOW}cat DEPLOYMENT-CHECKLIST.md${NC}"
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Create a file with the JWT secret
echo "$JWT_SECRET" > .jwt-secret.txt
echo -e "${GREEN}✓ JWT secret also saved to: .jwt-secret.txt${NC}"
echo -e "${YELLOW}  (This file is git-ignored for security)${NC}"
echo ""

# Offer to open deployment guide
read -p "Open deployment guide now? (y/n): " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    if command_exists less; then
        less DEPLOY-VERCEL-RENDER.md
    elif command_exists more; then
        more DEPLOY-VERCEL-RENDER.md
    else
        cat DEPLOY-VERCEL-RENDER.md
    fi
fi

echo ""
echo -e "${GREEN}╔═══════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  Setup Complete! Ready for Deployment        ║${NC}"
echo -e "${GREEN}╚═══════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${YELLOW}Next: Follow DEPLOY-VERCEL-RENDER.md to deploy!${NC}"
echo ""
