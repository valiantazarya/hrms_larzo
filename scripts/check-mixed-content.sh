#!/bin/bash

# Script to check for mixed content errors in frontend build
# Usage: ./scripts/check-mixed-content.sh

set -e

echo "🔍 Checking for mixed content issues..."

FRONTEND_DIR="frontend"
DIST_DIR="$FRONTEND_DIR/dist"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if dist directory exists
if [ ! -d "$DIST_DIR" ]; then
    echo -e "${YELLOW}⚠️  dist/ directory not found. Building frontend first...${NC}"
    cd "$FRONTEND_DIR"
    npm run build
    cd ..
fi

echo ""
echo "📦 Checking built files for HTTP URLs..."

# Find all JS files in dist
JS_FILES=$(find "$DIST_DIR" -name "*.js" -type f)

ERRORS_FOUND=0
HTTP_URLS=()

# Check for HTTP URLs in JS files
for file in $JS_FILES; do
    # Check for http:// URLs (excluding localhost which is OK for dev)
    if grep -q "http://[^l]" "$file" 2>/dev/null; then
        # Extract HTTP URLs (excluding localhost)
        HTTP_MATCHES=$(grep -o "http://[^\"'` ]*" "$file" 2>/dev/null | grep -v "localhost" || true)
        
        if [ ! -z "$HTTP_MATCHES" ]; then
            echo -e "${RED}❌ Found HTTP URLs in: $file${NC}"
            echo "$HTTP_MATCHES" | while read -r url; do
                echo -e "   ${RED}  → $url${NC}"
                HTTP_URLS+=("$url")
            done
            ERRORS_FOUND=$((ERRORS_FOUND + 1))
        fi
    fi
done

# Check for specific problematic patterns
echo ""
echo "🔎 Checking for specific mixed content patterns..."

# Check for http://azarya.space or http://your-domain
PROBLEMATIC_PATTERNS=(
    "http://azarya.space"
    "http://.*api"
    "http://.*/api/v1"
)

PATTERN_ERRORS=0
for pattern in "${PROBLEMATIC_PATTERNS[@]}"; do
    MATCHES=$(grep -r -o "$pattern" "$DIST_DIR" 2>/dev/null | grep -v "localhost" || true)
    if [ ! -z "$MATCHES" ]; then
        echo -e "${RED}❌ Found problematic pattern: $pattern${NC}"
        echo "$MATCHES" | head -5 | while read -r match; do
            echo -e "   ${RED}  → $match${NC}"
        done
        PATTERN_ERRORS=$((PATTERN_ERRORS + 1))
    fi
done

# Check environment variables
echo ""
echo "🔧 Checking environment configuration..."

if [ -f "$FRONTEND_DIR/.env.production" ]; then
    echo "📄 Found .env.production:"
    if grep -q "VITE_API_URL.*http://" "$FRONTEND_DIR/.env.production" 2>/dev/null; then
        echo -e "${YELLOW}⚠️  VITE_API_URL in .env.production uses HTTP:${NC}"
        grep "VITE_API_URL" "$FRONTEND_DIR/.env.production" | grep "http://"
    else
        echo -e "${GREEN}✅ VITE_API_URL configuration looks good${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  .env.production not found (will use auto-detection)${NC}"
fi

# Summary
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ $ERRORS_FOUND -eq 0 ] && [ $PATTERN_ERRORS -eq 0 ]; then
    echo -e "${GREEN}✅ No mixed content issues found!${NC}"
    echo ""
    echo "The build is safe to deploy."
    exit 0
else
    echo -e "${RED}❌ Mixed content issues detected!${NC}"
    echo ""
    echo "Found $ERRORS_FOUND file(s) with HTTP URLs"
    echo "Found $PATTERN_ERRORS problematic pattern(s)"
    echo ""
    echo "Run ./scripts/fix-mixed-content.sh to fix these issues"
    exit 1
fi
