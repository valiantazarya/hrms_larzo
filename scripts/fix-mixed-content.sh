#!/bin/bash

# Fix Mixed Content Error - Rebuild Frontend with HTTPS API URL
# Run this on your droplet

set -e

echo "🔒 Fixing Mixed Content Error..."
echo ""

DOMAIN="azarya.space"
PROJECT_PATH="/root/hrms_larzo"
FRONTEND_PATH="$PROJECT_PATH/frontend"
DIST_PATH="$FRONTEND_PATH/dist"
WEB_DIST_PATH="/var/www/hrms_larzo/frontend/dist"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Step 1: Verify domain has SSL
echo "🔍 Step 1: Checking SSL certificate..."
if curl -s -o /dev/null -w "%{http_code}" https://$DOMAIN | grep -q "200\|301\|302"; then
    echo -e "${GREEN}✅${NC} HTTPS is working for $DOMAIN"
else
    echo -e "${YELLOW}⚠️${NC}  HTTPS might not be set up yet"
    echo "   Set up SSL first: sudo certbot --nginx -d $DOMAIN -d www.$DOMAIN"
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi
echo ""

# Step 2: Navigate to frontend
echo "📁 Step 2: Checking frontend directory..."
if [ ! -d "$FRONTEND_PATH" ]; then
    echo -e "${RED}❌${NC} Frontend directory not found: $FRONTEND_PATH"
    exit 1
fi
echo -e "${GREEN}✅${NC} Frontend directory found"
cd "$FRONTEND_PATH"
echo ""

# Step 3: Install dependencies if needed
echo "📦 Step 3: Checking dependencies..."
if [ ! -d "node_modules" ]; then
    echo "   Installing dependencies..."
    npm install
    echo -e "${GREEN}✅${NC} Dependencies installed"
else
    echo -e "${GREEN}✅${NC} Dependencies already installed"
fi
echo ""

# Step 4: Build frontend with HTTPS API URL
echo "🏗️  Step 4: Building frontend with HTTPS API URL..."
echo "   Using: VITE_API_URL=https://$DOMAIN/api/v1"
echo ""

# Clean previous build
if [ -d "dist" ]; then
    rm -rf dist
    echo "   Cleaned previous build"
fi

# Build with HTTPS API URL
export VITE_API_URL="https://$DOMAIN/api/v1"
npm run build

if [ ! -d "dist" ] || [ ! -f "dist/index.html" ]; then
    echo -e "${RED}❌${NC} Build failed!"
    exit 1
fi

echo -e "${GREEN}✅${NC} Frontend built successfully"
echo "   Build output: $DIST_PATH"
echo "   Files: $(find dist -type f | wc -l) files"
echo ""

# Step 5: Verify API URL in built files
echo "🔍 Step 5: Verifying API URL in build..."
if grep -r "https://$DOMAIN/api/v1" dist/ > /dev/null 2>&1; then
    echo -e "${GREEN}✅${NC} HTTPS API URL found in build"
elif grep -r "http://$DOMAIN/api/v1" dist/ > /dev/null 2>&1; then
    echo -e "${YELLOW}⚠️${NC}  HTTP API URL still found (should be HTTPS)"
    echo "   This might cause mixed content errors"
else
    echo -e "${YELLOW}⚠️${NC}  Could not verify API URL in build"
fi
echo ""

# Step 6: Copy to web directory
echo "📋 Step 6: Deploying to web directory..."
mkdir -p "$WEB_DIST_PATH"
rm -rf "$WEB_DIST_PATH"/*
cp -r dist/* "$WEB_DIST_PATH"/
echo -e "${GREEN}✅${NC} Files copied to $WEB_DIST_PATH"
echo ""

# Step 7: Set permissions
echo "🔐 Step 7: Setting permissions..."
chown -R www-data:www-data /var/www/hrms_larzo
chmod -R 755 /var/www/hrms_larzo
echo -e "${GREEN}✅${NC} Permissions set"
echo ""

# Step 8: Reload nginx
echo "🔄 Step 8: Reloading nginx..."
if nginx -t; then
    systemctl reload nginx
    echo -e "${GREEN}✅${NC} Nginx reloaded"
else
    echo -e "${RED}❌${NC} Nginx config has errors!"
    exit 1
fi
echo ""

# Step 9: Verify
echo "🧪 Step 9: Verifying deployment..."
sleep 2
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" https://$DOMAIN)
if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✅${NC} Frontend is accessible via HTTPS"
else
    echo -e "${YELLOW}⚠️${NC}  Got HTTP $HTTP_CODE"
fi

API_CODE=$(curl -s -o /dev/null -w "%{http_code}" https://$DOMAIN/api/v1/health)
if [ "$API_CODE" = "200" ]; then
    echo -e "${GREEN}✅${NC} API is accessible via HTTPS"
else
    echo -e "${YELLOW}⚠️${NC}  API got HTTP $API_CODE"
fi
echo ""

echo "✅✅✅ Mixed Content Fix Complete! ✅✅✅"
echo ""
echo "📋 Summary:"
echo "   Frontend rebuilt with: VITE_API_URL=https://$DOMAIN/api/v1"
echo "   Deployed to: $WEB_DIST_PATH"
echo ""
echo "🌐 Test your site:"
echo "   https://$DOMAIN"
echo ""
echo "💡 Note: Clear your browser cache if you still see mixed content errors"
