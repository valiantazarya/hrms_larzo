#!/bin/bash

# Revert Symlink - Restore Direct File Structure
# This script removes the symlink and restores files directly in /var/www/hrms_larzo/frontend/dist

set -e

SYMLINK_PATH="/var/www/hrms_larzo/frontend/dist"
SOURCE_PATH="/root/hrms_larzo/frontend/dist"
WEB_DIR="/var/www/hrms_larzo/frontend/dist"
NGINX_USER="www-data"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "🔄 Reverting Symlink - Restoring Direct File Structure..."
echo ""

# Step 1: Check if symlink exists
echo "🔍 Step 1: Checking if symlink exists..."
if [ -L "$SYMLINK_PATH" ]; then
    echo -e "${GREEN}✅${NC} Symlink found: $SYMLINK_PATH"
    LINK_TARGET=$(readlink -f "$SYMLINK_PATH")
    echo "   Points to: $LINK_TARGET"
elif [ -d "$SYMLINK_PATH" ]; then
    echo -e "${YELLOW}⚠️${NC}  Directory exists (not a symlink): $SYMLINK_PATH"
    read -p "   Continue anyway? This will backup and recreate the directory (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
else
    echo -e "${YELLOW}⚠️${NC}  Path doesn't exist: $SYMLINK_PATH"
    echo "   Will create new directory"
fi
echo ""

# Step 2: Backup existing files (if any)
echo "💾 Step 2: Creating backup..."
BACKUP_DIR="/var/www/hrms_larzo/frontend/dist.backup.$(date +%Y%m%d_%H%M%S)"
if [ -e "$SYMLINK_PATH" ]; then
    echo "   Backing up to: $BACKUP_DIR"
    sudo cp -r "$SYMLINK_PATH" "$BACKUP_DIR" 2>/dev/null || true
    echo -e "${GREEN}✅${NC} Backup created"
else
    echo -e "${YELLOW}⚠️${NC}  Nothing to backup"
fi
echo ""

# Step 3: Remove symlink or directory
echo "🗑️  Step 3: Removing symlink/directory..."
if [ -L "$SYMLINK_PATH" ]; then
    sudo rm "$SYMLINK_PATH"
    echo -e "${GREEN}✅${NC} Symlink removed"
elif [ -d "$SYMLINK_PATH" ]; then
    sudo rm -rf "$SYMLINK_PATH"
    echo -e "${GREEN}✅${NC} Directory removed"
fi
echo ""

# Step 4: Create new directory
echo "📁 Step 4: Creating new directory..."
sudo mkdir -p "$WEB_DIR"
echo -e "${GREEN}✅${NC} Directory created: $WEB_DIR"
echo ""

# Step 5: Copy files from source (if source exists)
echo "📋 Step 5: Copying files from source..."
if [ -d "$SOURCE_PATH" ] && [ "$(ls -A $SOURCE_PATH 2>/dev/null)" ]; then
    echo "   Source: $SOURCE_PATH"
    echo "   Destination: $WEB_DIR"
    sudo cp -r "$SOURCE_PATH"/* "$WEB_DIR"/ 2>/dev/null || {
        echo -e "${YELLOW}⚠️${NC}  Some files might not have copied. Continuing..."
    }
    echo -e "${GREEN}✅${NC} Files copied"
    
    FILE_COUNT=$(find "$WEB_DIR" -type f 2>/dev/null | wc -l)
    echo "   Files copied: $FILE_COUNT"
else
    echo -e "${YELLOW}⚠️${NC}  Source directory not found or empty: $SOURCE_PATH"
    echo "   Directory created but empty. You'll need to:"
    echo "   1. Build your frontend: cd ~/hrms_larzo/frontend && npm run build"
    echo "   2. Copy files: sudo cp -r ~/hrms_larzo/frontend/dist/* $WEB_DIR/"
fi
echo ""

# Step 6: Set ownership
echo "👤 Step 6: Setting ownership to $NGINX_USER:$NGINX_USER..."
sudo chown -R $NGINX_USER:$NGINX_USER "$WEB_DIR"
echo -e "${GREEN}✅${NC} Ownership set"
echo ""

# Step 7: Set permissions
echo "🔐 Step 7: Setting permissions..."
sudo find "$WEB_DIR" -type d -exec chmod 755 {} \;
sudo find "$WEB_DIR" -type f -exec chmod 644 {} \;
echo -e "${GREEN}✅${NC} Permissions set (755 for dirs, 644 for files)"
echo ""

# Step 8: Verify structure
echo "✅ Step 8: Verifying structure..."
if [ -f "$WEB_DIR/index.html" ]; then
    echo -e "${GREEN}✅${NC} index.html found"
    PERMS=$(stat -c "%a %U:%G" "$WEB_DIR/index.html" 2>/dev/null || echo "unknown")
    echo "   Permissions: $PERMS"
else
    echo -e "${YELLOW}⚠️${NC}  index.html not found - directory might be empty"
fi

# Check if it's a symlink (should not be)
if [ -L "$WEB_DIR" ]; then
    echo -e "${RED}❌${NC} Still a symlink! Something went wrong."
    exit 1
else
    echo -e "${GREEN}✅${NC} Confirmed: Not a symlink (direct directory)"
fi
echo ""

# Step 9: Test nginx config
echo "🧪 Step 9: Testing nginx configuration..."
if sudo nginx -t; then
    echo -e "${GREEN}✅${NC} Nginx configuration is valid"
else
    echo -e "${RED}❌${NC} Nginx configuration has errors!"
    exit 1
fi
echo ""

# Step 10: Reload nginx
echo "🔄 Step 10: Reloading nginx..."
sudo systemctl reload nginx
echo -e "${GREEN}✅${NC} Nginx reloaded"
echo ""

# Step 11: Verify access
echo "🌐 Step 11: Verifying access..."
sleep 2
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost/ || echo "000")
if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "301" ] || [ "$HTTP_CODE" = "302" ]; then
    echo -e "${GREEN}✅${NC} Frontend is accessible (HTTP $HTTP_CODE)"
else
    echo -e "${YELLOW}⚠️${NC}  Got HTTP $HTTP_CODE"
    echo "   Check nginx error log: sudo tail -f /var/log/nginx/error.log"
fi
echo ""

echo "✅✅✅ Symlink Reverted Successfully! ✅✅✅"
echo ""
echo "📋 Summary:"
echo "   Removed symlink: $SYMLINK_PATH"
echo "   Created directory: $WEB_DIR"
echo "   Owner: $NGINX_USER:$NGINX_USER"
echo "   Permissions: 755 (dirs), 644 (files)"
if [ -d "$BACKUP_DIR" ]; then
    echo "   Backup saved: $BACKUP_DIR"
fi
echo ""
echo "💡 Next Steps:"
echo "   If files are missing, build and copy:"
echo "   cd ~/hrms_larzo/frontend"
echo "   npm run build"
echo "   sudo cp -r dist/* $WEB_DIR/"
echo "   sudo chown -R $NGINX_USER:$NGINX_USER $WEB_DIR"
