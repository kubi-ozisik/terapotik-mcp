#!/bin/bash

echo "🚀 Deploying Terapotik API..."

# Stop existing API container if running
echo "📦 Stopping existing API container..."
docker stop terapotik-api-ts 2>/dev/null || echo "No existing API container to stop"
docker rm terapotik-api-ts 2>/dev/null || echo "No existing API container to remove"

# Build and start the new API container
echo "🔨 Building and starting API container..."
docker-compose up --build -d api

# Wait for the container to be healthy
echo "⏳ Waiting for API to be healthy..."
timeout=60
counter=0
while [ $counter -lt $timeout ]; do
    if docker exec terapotik-api-ts curl -f http://localhost:3200/api/v1/health >/dev/null 2>&1; then
        echo "✅ API is healthy!"
        break
    fi
    echo "⏳ Waiting for API... ($counter/$timeout)"
    sleep 2
    counter=$((counter + 2))
done

if [ $counter -ge $timeout ]; then
    echo "❌ API failed to become healthy within $timeout seconds"
    echo "📋 Container logs:"
    docker logs terapotik-api-ts --tail 20
    exit 1
fi

# Test the API
echo "🧪 Testing API endpoints..."
echo "Health check:"
curl -s http://localhost:3200/api/v1/health | jq . || echo "Health check failed"

echo ""
echo "🎉 API deployment complete!"
echo "📊 Container status:"
docker ps | grep terapotik-api-ts

echo ""
echo "🔗 Available endpoints:"
echo "  - Health: http://localhost:3200/api/v1/health"
echo "  - API: http://localhost:3200/api"
echo "  - External: https://terapotik-api.smeet.app"
