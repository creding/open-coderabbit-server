#!/bin/bash

# CodeRabbit Server Docker Management Script

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
IMAGE_NAME="coderabbit-server"
CONTAINER_NAME="coderabbit"
DEV_CONTAINER_NAME="coderabbit-dev"

print_usage() {
    echo "Usage: $0 [COMMAND]"
    echo ""
    echo "Commands:"
    echo "  build       Build the Docker image"
    echo "  dev         Start development environment with hot reload"
    echo "  start       Start production container"
    echo "  stop        Stop running containers"
    echo "  restart     Restart containers"
    echo "  logs        Show container logs"
    echo "  shell       Open shell in running container"
    echo "  clean       Remove containers and images"
    echo "  health      Check container health"
    echo "  help        Show this help message"
}

build_image() {
    echo -e "${BLUE}Building Docker image...${NC}"
    docker build -t $IMAGE_NAME .
    echo -e "${GREEN}✅ Image built successfully${NC}"
}

start_dev() {
    echo -e "${BLUE}Starting development environment...${NC}"
    docker-compose -f docker-compose.dev.yml up -d
    echo -e "${GREEN}✅ Development environment started${NC}"
    echo -e "${YELLOW}📝 Logs: docker-compose -f docker-compose.dev.yml logs -f${NC}"
    echo -e "${YELLOW}🌐 Server: http://localhost:5353${NC}"
}

start_prod() {
    echo -e "${BLUE}Starting production container...${NC}"
    docker-compose up -d
    echo -e "${GREEN}✅ Production container started${NC}"
    echo -e "${YELLOW}📝 Logs: docker-compose logs -f${NC}"
    echo -e "${YELLOW}🌐 Server: http://localhost:5353${NC}"
}

stop_containers() {
    echo -e "${BLUE}Stopping containers...${NC}"
    docker-compose down 2>/dev/null || true
    docker-compose -f docker-compose.dev.yml down 2>/dev/null || true
    echo -e "${GREEN}✅ Containers stopped${NC}"
}

restart_containers() {
    stop_containers
    sleep 2
    start_prod
}

show_logs() {
    if docker ps | grep -q $DEV_CONTAINER_NAME; then
        docker-compose -f docker-compose.dev.yml logs -f
    elif docker ps | grep -q $CONTAINER_NAME; then
        docker-compose logs -f
    else
        echo -e "${RED}❌ No running containers found${NC}"
    fi
}

open_shell() {
    if docker ps | grep -q $DEV_CONTAINER_NAME; then
        docker exec -it $DEV_CONTAINER_NAME sh
    elif docker ps | grep -q $CONTAINER_NAME; then
        docker exec -it $CONTAINER_NAME sh
    else
        echo -e "${RED}❌ No running containers found${NC}"
    fi
}

clean_docker() {
    echo -e "${BLUE}Cleaning up Docker resources...${NC}"
    stop_containers
    docker rmi $IMAGE_NAME 2>/dev/null || true
    docker system prune -f
    echo -e "${GREEN}✅ Cleanup completed${NC}"
}

check_health() {
    echo -e "${BLUE}Checking container health...${NC}"
    if curl -s http://localhost:5353/health | jq . 2>/dev/null; then
        echo -e "${GREEN}✅ Server is responding${NC}"
    else
        echo -e "${RED}❌ Server is not responding${NC}"
        echo -e "${YELLOW}Try: $0 logs${NC}"
    fi
}

# Main script logic
case "${1:-help}" in
    build)
        build_image
        ;;
    dev)
        build_image
        start_dev
        ;;
    start)
        build_image
        start_prod
        ;;
    stop)
        stop_containers
        ;;
    restart)
        restart_containers
        ;;
    logs)
        show_logs
        ;;
    shell)
        open_shell
        ;;
    clean)
        clean_docker
        ;;
    health)
        check_health
        ;;
    help|*)
        print_usage
        ;;
esac
