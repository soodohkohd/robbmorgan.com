#!/bin/bash
#
# Build and deploy robbmorgan.com to Azure App Service (Linux).
#
# Adjust the values below if the target ever moves to a different
# App Service or resource group.

set -euo pipefail

clear

APP_NAME="robbmorgan"
RESOURCE_GROUP="sdk"

# Resolve paths relative to this script so it can be run from anywhere.
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$ROOT_DIR/code"
DIST_DIR="$PROJECT_DIR/dist/robbmorgan-com/browser"
ZIP_PATH="/tmp/robbmorgan-com.zip"

# pm2 ships pre-installed on the Linux Node image. `--spa` makes it
# rewrite every unmatched route to index.html so deep links (/blog,
# /resume, etc.) work after refresh.
STARTUP_CMD="pm2 serve /home/site/wwwroot --no-daemon --spa"

# ---------- 1. Auth ----------
if ! az account show &>/dev/null; then
  echo "🔐 Launching Azure login prompt..."
  az login
else
  user=$(az account show --query user.name -o tsv)
  echo "👤 Logged in as: $user"
fi

# ---------- 2. Build ----------
echo
echo "🔧 Building Angular app..."
cd "$PROJECT_DIR"
npm run build

if [ ! -d "$DIST_DIR" ]; then
  echo "❌ Build output not found at $DIST_DIR" >&2
  exit 1
fi

# ---------- 3. Zip ----------
echo
echo "📦 Zipping build output..."
rm -f "$ZIP_PATH"
(cd "$DIST_DIR" && zip -rq "$ZIP_PATH" .)
echo "   → $ZIP_PATH ($(du -h "$ZIP_PATH" | cut -f1))"

# ---------- 4. Startup command (idempotent SPA fallback) ----------
echo
echo "⚙️  Ensuring SPA-fallback startup command on the App Service..."
current_startup=$(az webapp config show \
  --name "$APP_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --query appCommandLine -o tsv 2>/dev/null || echo "")

if [ "$current_startup" != "$STARTUP_CMD" ]; then
  az webapp config set \
    --name "$APP_NAME" \
    --resource-group "$RESOURCE_GROUP" \
    --startup-file "$STARTUP_CMD" >/dev/null
  echo "   ✓ startup command set: $STARTUP_CMD"
else
  echo "   ✓ already set"
fi

# ---------- 5. Deploy ----------
echo
echo "🚀 Deploying zip to Azure App Service..."
az webapp deploy \
  --name "$APP_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --src-path "$ZIP_PATH" \
  --type zip \
  --clean true \
  --restart true

echo
echo "✅ Deployment complete!"
echo "   → https://$APP_NAME.azurewebsites.net"
