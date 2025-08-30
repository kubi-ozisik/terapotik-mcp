#!/bin/bash

# Terapotik Infrastructure Management Script

echo "🚀 Starting Terapotik Infrastructure..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

# Start the infrastructure
docker-compose up -d

# Wait for services to be healthy
echo "⏳ Waiting for services to be ready..."
sleep 5

# Check Redis health
if docker-compose exec redis redis-cli ping > /dev/null 2>&1; then
    echo "✅ Redis is ready!"
    echo "   - Redis URL: redis://localhost:6379"
    echo "   - Redis Commander: http://localhost:8081"
else
    echo "❌ Redis failed to start"
fi

echo ""
echo "🎉 Infrastructure is ready!"
echo ""
echo "📋 Services:"
echo "   - Redis: localhost:6379"
echo "   - Redis Commander (Web UI): http://localhost:8081"
echo ""
echo "🔧 Next.js Configuration:"
echo "   Add to your .env.local:"
echo "   REDIS_URL=redis://localhost:6379"
echo ""
echo "🛑 To stop: docker-compose down"
echo "🗑️  To reset: docker-compose down -v" 