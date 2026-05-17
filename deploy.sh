#!/bin/bash

# Quotebot Deployment Script
# Helps with Docker deployment and testing

set -e

BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}"
echo "╔═══════════════════════════════════════╗"
echo "║   Quotebot Deployment Helper          ║"
echo "╔═══════════════════════════════════════╗"
echo -e "${NC}"

# Function to check if .env exists
check_env() {
    if [ ! -f .env ]; then
        echo -e "${YELLOW}⚠️  .env file not found!${NC}"
        echo -e "Creating from .env.production.example..."
        cp .env.production.example .env
        echo -e "${YELLOW}⚠️  Please edit .env with your actual values before deploying!${NC}"
        echo ""
        read -p "Press Enter to continue after editing .env, or Ctrl+C to exit..."
    fi
}

# Function to build and start services
deploy_docker() {
    echo -e "${BLUE}🐳 Building and deploying with Docker...${NC}"
    
    check_env
    
    echo -e "${BLUE}📦 Building containers...${NC}"
    docker-compose build
    
    echo -e "${BLUE}🚀 Starting services...${NC}"
    docker-compose up -d
    
    echo -e "${GREEN}✅ Deployment complete!${NC}"
    echo ""
    echo -e "${BLUE}📊 Service Status:${NC}"
    docker-compose ps
    echo ""
    echo -e "${BLUE}🌐 Access your application:${NC}"
    echo -e "   Frontend: ${GREEN}http://localhost:3000${NC}"
    echo -e "   Backend:  ${GREEN}http://localhost:3001${NC}"
    echo ""
    echo -e "${BLUE}📝 View logs:${NC}"
    echo -e "   All services: ${YELLOW}docker-compose logs -f${NC}"
    echo -e "   Backend only: ${YELLOW}docker-compose logs -f backend${NC}"
    echo -e "   Frontend only: ${YELLOW}docker-compose logs -f frontend${NC}"
}

# Function to stop services
stop_services() {
    echo -e "${BLUE}🛑 Stopping services...${NC}"
    docker-compose down
    echo -e "${GREEN}✅ Services stopped${NC}"
}

# Function to view logs
view_logs() {
    echo -e "${BLUE}📝 Viewing logs (Ctrl+C to exit)...${NC}"
    docker-compose logs -f
}

# Function to rebuild services
rebuild() {
    echo -e "${BLUE}🔄 Rebuilding services...${NC}"
    docker-compose down
    docker-compose build --no-cache
    docker-compose up -d
    echo -e "${GREEN}✅ Rebuild complete!${NC}"
}

# Function to check status
check_status() {
    echo -e "${BLUE}📊 Service Status:${NC}"
    docker-compose ps
    echo ""
    
    echo -e "${BLUE}🏥 Health Checks:${NC}"
    
    # Check backend
    if curl -s http://localhost:3001/health > /dev/null 2>&1; then
        echo -e "   Backend:  ${GREEN}✓ Healthy${NC}"
    else
        echo -e "   Backend:  ${RED}✗ Unhealthy${NC}"
    fi
    
    # Check frontend
    if curl -s http://localhost:3000 > /dev/null 2>&1; then
        echo -e "   Frontend: ${GREEN}✓ Healthy${NC}"
    else
        echo -e "   Frontend: ${RED}✗ Unhealthy${NC}"
    fi
    
    # Check database
    if docker-compose exec -T db pg_isready -U postgres > /dev/null 2>&1; then
        echo -e "   Database: ${GREEN}✓ Healthy${NC}"
    else
        echo -e "   Database: ${RED}✗ Unhealthy${NC}"
    fi
}

# Function to run database migrations
run_migrations() {
    echo -e "${BLUE}🔄 Running database migrations...${NC}"
    docker-compose exec backend npx prisma migrate deploy
    echo -e "${GREEN}✅ Migrations complete!${NC}"
}

# Function to seed database
seed_database() {
    echo -e "${BLUE}🌱 Seeding database...${NC}"
    docker-compose exec backend npm run db:seed
    echo -e "${GREEN}✅ Database seeded!${NC}"
}

# Function to backup database
backup_database() {
    echo -e "${BLUE}💾 Creating database backup...${NC}"
    BACKUP_FILE="backup_$(date +%Y%m%d_%H%M%S).sql"
    docker-compose exec -T db pg_dump -U postgres quotebot_db > "$BACKUP_FILE"
    echo -e "${GREEN}✅ Backup created: $BACKUP_FILE${NC}"
}

# Function to show Railway deployment guide
show_railway_guide() {
    echo -e "${BLUE}🚂 Railway Deployment Guide:${NC}"
    echo ""
    echo "1. Sign up at https://railway.app"
    echo "2. Create new project from GitHub"
    echo "3. Add PostgreSQL database to project"
    echo "4. Configure backend service:"
    echo "   - Root Directory: backend"
    echo "   - Build Command: npm install && npx prisma generate && npm run build"
    echo "   - Start Command: npx prisma migrate deploy && npm run start:prod"
    echo "5. Add environment variables from .env.production.example"
    echo "6. Deploy frontend to Vercel:"
    echo "   - Root Directory: frontend"
    echo "   - Framework: Create React App"
    echo ""
    echo "For detailed instructions, see: DEPLOYMENT.md"
}

# Main menu
show_menu() {
    echo ""
    echo -e "${BLUE}Choose an action:${NC}"
    echo "1. Deploy with Docker (build and start)"
    echo "2. Stop services"
    echo "3. View logs"
    echo "4. Rebuild services (fresh build)"
    echo "5. Check service status"
    echo "6. Run database migrations"
    echo "7. Seed database"
    echo "8. Backup database"
    echo "9. Show Railway deployment guide"
    echo "0. Exit"
    echo ""
    read -p "Enter your choice [0-9]: " choice
    
    case $choice in
        1) deploy_docker ;;
        2) stop_services ;;
        3) view_logs ;;
        4) rebuild ;;
        5) check_status ;;
        6) run_migrations ;;
        7) seed_database ;;
        8) backup_database ;;
        9) show_railway_guide ;;
        0) echo -e "${GREEN}Goodbye!${NC}"; exit 0 ;;
        *) echo -e "${RED}Invalid choice${NC}"; show_menu ;;
    esac
}

# Run main menu
show_menu
