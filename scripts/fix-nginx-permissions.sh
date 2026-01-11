#!/bin/bash

# Fix Nginx Permissions for Frontend Files
# Run this script on your production server

set -e

WEB_DIR="/var/www/hrms_larzo/frontend/dist"
NGINX_USER="www-data"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "🔐 Fixing Nginx Permissions..."
echo ""

# Step 1: Check if directory exists
echo "📁 Step 1: Checking directory..."
if [ ! -d "$WEB_DIR" ]; then
    echo -e "${RED}❌${NC} Directory not found: $WEB_DIR"
    echo "   Creating directory..."
    sudo mkdir -p "$WEB_DIR"
    echo -e "${GREEN}✅${NC} Directory created"
else
    echo -e "${GREEN}✅${NC} Directory exists: $WEB_DIR"
fi
echo ""

# Step 2: Check current permissions
echo "🔍 Step 2: Current permissions:"
ls -ld "$WEB_DIR" | awk '{print "   " $0}'
echo ""

# Step 3: Fix ownership
echo "👤 Step 3: Setting ownership to $NGINX_USER:$NGINX_USER..."
sudo chown -R $NGINX_USER:$NGINX_USER /var/www/hrms_larzo
echo -e "${GREEN}✅${NC} Ownership set"
echo ""

# Step 4: Set directory permissions (755 = rwxr-xr-x)
echo "📂 Step 4: Setting directory permissions (755)..."
sudo find /var/www/hrms_larzo -type d -exec chmod 755 {} \;
echo -e "${GREEN}✅${NC} Directory permissions set"
echo ""

# Step 5: Set file permissions (644 = rw-r--r--)
echo "📄 Step 5: Setting file permissions (644)..."
sudo find /var/www/hrms_larzo -type f -exec chmod 644 {} \;
echo -e "${GREEN}✅${NC} File permissions set"
echo ""

# Step 6: Verify permissions
echo "✅ Step 6: Verifying permissions..."
if [ -f "$WEB_DIR/index.html" ]; then
    PERMS=$(stat -c "%a %U:%G" "$WEB_DIR/index.html")
    echo "   index.html: $PERMS"
    if [[ "$PERMS" == *"www-data"* ]]; then
        echo -e "${GREEN}✅${NC} Permissions look correct"
    else
        echo -e "${YELLOW}⚠️${NC}  Ownership might still be wrong"
    fi
else
    echo -e "${YELLOW}⚠️${NC}  index.html not found - files might not be deployed yet"
    echo "   Make sure to copy your frontend build files to $WEB_DIR"
fi
echo ""

# Step 7: Test nginx config
echo "🧪 Step 7: Testing nginx configuration..."
if sudo nginx -t; then
    echo -e "${GREEN}✅${NC} Nginx configuration is valid"
else
    echo -e "${RED}❌${NC} Nginx configuration has errors!"
    exit 1
fi
echo ""

# Step 8: Reload nginx
echo "🔄 Step 8: Reloading nginx..."
sudo systemctl reload nginx
echo -e "${GREEN}✅${NC} Nginx reloaded"
echo ""

# Step 9: Verify access
echo "🌐 Step 9: Verifying access..."
sleep 2
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost/ || echo "000")
if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "301" ] || [ "$HTTP_CODE" = "302" ]; then
    echo -e "${GREEN}✅${NC} Frontend is accessible (HTTP $HTTP_CODE)"
else
    echo -e "${YELLOW}⚠️${NC}  Got HTTP $HTTP_CODE - might need to check nginx config"
fi
echo ""

echo "✅✅✅ Permission Fix Complete! ✅✅✅"
echo ""
echo "📋 Summary:"
echo "   Directory: $WEB_DIR"
echo "   Owner: $NGINX_USER:$NGINX_USER"
echo "   Directories: 755 (rwxr-xr-x)"
echo "   Files: 644 (rw-r--r--)"
echo ""
echo "💡 If files are still not accessible:"
echo "   1. Make sure files exist in $WEB_DIR"
echo "   2. Check nginx error log: sudo tail -f /var/log/nginx/error.log"
echo "   3. Verify nginx config: sudo nginx -t"
echo "   4. Check SELinux (if enabled): getenforce"
