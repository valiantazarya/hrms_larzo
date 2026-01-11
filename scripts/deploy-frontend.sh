#!/bin/bash

# Script to deploy frontend build to server
# Usage: ./scripts/deploy-frontend.sh [server_user@server_host] [remote_path]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

FRONTEND_DIR="frontend"
DIST_DIR="$FRONTEND_DIR/dist"

# Check if dist exists
if [ ! -d "$DIST_DIR" ]; then
    echo -e "${RED}❌ dist/ directory not found!${NC}"
    echo "   Run ./scripts/fix-mixed-content.sh first to build the frontend"
    exit 1
fi

# Check for mixed content before deploying
echo "🔍 Checking for mixed content issues before deployment..."
if ! ./scripts/check-mixed-content.sh 2>/dev/null; then
    echo ""
    echo -e "${RED}❌ Mixed content issues detected!${NC}"
    echo "   Please fix them before deploying."
    echo "   Run: ./scripts/fix-mixed-content.sh"
    exit 1
fi

echo ""
echo "📦 Preparing deployment..."

# If server details provided, deploy via SSH
if [ $# -ge 2 ]; then
    SERVER="$1"
    REMOTE_PATH="$2"
    
    echo "🚀 Deploying to $SERVER:$REMOTE_PATH"
    
    # Create backup on server
    echo "💾 Creating backup on server..."
    ssh "$SERVER" "if [ -d '$REMOTE_PATH/dist' ]; then mv '$REMOTE_PATH/dist' '$REMOTE_PATH/dist.backup.$(date +%Y%m%d_%H%M%S)'; fi" || true
    
    # Copy new build
    echo "📤 Uploading new build..."
    rsync -avz --delete "$DIST_DIR/" "$SERVER:$REMOTE_PATH/dist/"
    
    # Reload nginx (if needed)
    echo "🔄 Reloading nginx..."
    ssh "$SERVER" "sudo systemctl reload nginx" || echo -e "${YELLOW}⚠️  Could not reload nginx (may need manual reload)${NC}"
    
    echo ""
    echo -e "${GREEN}✅ Deployment complete!${NC}"
    echo ""
    echo "📋 Next steps:"
    echo "   1. Clear browser cache (Ctrl+Shift+R)"
    echo "   2. Test the application"
    echo "   3. Verify HTTPS is working"
    
else
    # Local deployment instructions
    echo "📋 Deployment instructions:"
    echo ""
    echo "The built frontend is in: $DIST_DIR"
    echo ""
    echo "To deploy manually:"
    echo "   1. Copy the dist/ folder to your server:"
    echo "      scp -r $DIST_DIR/* user@server:/path/to/frontend/dist/"
    echo ""
    echo "   2. Or use rsync:"
    echo "      rsync -avz --delete $DIST_DIR/ user@server:/path/to/frontend/dist/"
    echo ""
    echo "   3. Reload nginx on server:"
    echo "      ssh user@server 'sudo systemctl reload nginx'"
    echo ""
    echo "Or provide server details to deploy automatically:"
    echo "   ./scripts/deploy-frontend.sh user@server /path/to/frontend"
fi
