#!/bin/bash
# Build macOS .app Bundle for Axolotl Changelog Viewer
# Run on macOS

set -e

APP_NAME="AxolotlChangelogViewer"
APP_DIR="$APP_NAME.app"

echo "==> Building macOS .app Bundle..."

# Clean
rm -rf "$APP_DIR"
mkdir -p "$APP_DIR/Contents/MacOS"
mkdir -p "$APP_DIR/Contents/Resources"

# Copy web files
cp Axolotl-Changelog-Viewer.html "$APP_DIR/Contents/Resources/"

# Create launcher script
cat > "$APP_DIR/Contents/MacOS/$APP_NAME" << 'EOF'
#!/bin/bash
# Open the self-contained HTML in the default browser (Safari/Chrome/Firefox)
# macOS calls Web rendering, no full browser bundled
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
APP_DIR="$(dirname "$SCRIPT_DIR")"
HTML="$APP_DIR/Contents/Resources/Axolotl-Changelog-Viewer.html"
open "$HTML"
EOF
chmod +x "$APP_DIR/Contents/MacOS/$APP_NAME"

# Create Info.plist
cat > "$APP_DIR/Contents/Info.plist" << EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleName</key>
    <string>Axolotl Changelog Viewer</string>
    <key>CFBundleDisplayName</key>
    <string>Axolotl Changelog Viewer</string>
    <key>CFBundleIdentifier</key>
    <string>com.axolotl.changelogviewer</string>
    <key>CFBundleVersion</key>
    <string>1.0</string>
    <key>CFBundleShortVersionString</key>
    <string>1.0</string>
    <key>CFBundlePackageType</key>
    <string>APPL</string>
    <key>CFBundleExecutable</key>
    <string>$APP_NAME</string>
    <key>LSMinimumSystemVersion</key>
    <string>10.13</string>
    <key>NSHighResolutionCapable</key>
    <true/>
    <key>LSUIElement</key>
    <false/>
</dict>
</plist>
EOF

echo ""
echo "==> Done! App: $APP_DIR"
echo "    First run: right-click → Open, or System Settings → Privacy & Security"
