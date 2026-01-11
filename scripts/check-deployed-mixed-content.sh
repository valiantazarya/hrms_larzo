#!/bin/bash

# Script to check for mixed content in deployed frontend files on server
# Usage: ./scripts/check-deployed-mixed-content.sh [server_user@server_host] [remote_path]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

if [ $# -lt 2 ]; then
    echo "Usage: $0 [user@server] [remote_path_to_frontend_dist]"
    echo "Example: $0 ubuntu@azarya.space /home/ubuntu/hrms_larzo/frontend/dist"
    exit 1
fi

SERVER="$1"
REMOTE_PATH="$2"

echo "🔍 Checking deployed files on $SERVER:$REMOTE_PATH"
echo ""

# Check if remote directory exists
if ! ssh "$SERVER" "[ -d '$REMOTE_PATH' ]"; then
    echo -e "${RED}❌ Directory not found: $REMOTE_PATH${NC}"
    exit 1
fi

# Find and check JS files on server
echo "📦 Checking JavaScript files for HTTP URLs..."

HTTP_FOUND=$(ssh "$SERVER" "find '$REMOTE_PATH' -name '*.js' -type f -exec grep -l 'http://azarya\.space\|http://.*/api' {} \; 2>/dev/null | wc -l" || echo "0")

if [ "$HTTP_FOUND" -gt 0 ]; then
    echo -e "${RED}❌ Found HTTP URLs in $HTTP_FOUND JavaScript file(s)!${NC}"
    echo ""
    echo "Files with HTTP URLs:"
    ssh "$SERVER" "find '$REMOTE_PATH' -name '*.js' -type f -exec grep -l 'http://azarya\.space\|http://.*/api' {} \; 2>/dev/null" | head -10
    
    echo ""
    echo -e "${YELLOW}⚠️  Mixed content errors will occur!${NC}"
    echo ""
    echo "To fix:"
    echo "   1. Run: ./scripts/fix-mixed-content.sh"
    echo "   2. Then: ./scripts/deploy-frontend.sh $SERVER $(dirname $REMOTE_PATH)"
    exit 1
else
    echo -e "${GREEN}✅ No HTTP URLs found in deployed JavaScript files${NC}"
fi

# Check for HTTPS URLs
HTTPS_FOUND=$(ssh "$SERVER" "find '$REMOTE_PATH' -name '*.js' -type f -exec grep -l 'https://.*/api' {} \; 2>/dev/null | wc -l" || echo "0")

if [ "$HTTPS_FOUND" -gt 0 ]; then
    echo -e "${GREEN}✅ Found HTTPS URLs in JavaScript files (good!)${NC}"
fi

# Check specific problematic patterns
echo ""
echo "🔎 Checking for specific patterns..."

PATTERNS=(
    "http://azarya.space"
    "http://.*api/v1"
)

for pattern in "${PATTERNS[@]}"; do
    MATCHES=$(ssh "$SERVER" "grep -r '$pattern' '$REMOTE_PATH' 2>/dev/null | grep -v 'localhost' | wc -l" || echo "0")
    if [ "$MATCHES" -gt 0 ]; then
        echo -e "${RED}❌ Found $MATCHES occurrence(s) of: $pattern${NC}"
    fi
done

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ "$HTTP_FOUND" -eq 0 ]; then
    echo -e "${GREEN}✅ No mixed content issues detected in deployed files!${NC}"
    exit 0
else
    echo -e "${RED}❌ Mixed content issues found!${NC}"
    exit 1
fi
