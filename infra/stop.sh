#!/bin/bash

# Terapotik Infrastructure Stop Script

echo "🛑 Stopping Terapotik Infrastructure..."

# Stop and remove containers
docker-compose down

echo "✅ Infrastructure stopped!"
echo ""
echo "💡 Options:"
echo "   - To restart: ./start.sh"
echo "   - To reset data: docker-compose down -v" 