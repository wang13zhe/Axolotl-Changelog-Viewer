#!/bin/bash
# Build Linux AppImage for Axolotl Changelog Viewer
# Run on Linux with appimagetool installed

set -e

APP_NAME="AxolotlChangelogViewer"
APP_DIR="AppDir"

echo "==> Building Linux AppImage..."

# Clean
rm -rf "$APP_DIR"
mkdir -p "$APP_DIR/usr/share/$APP_NAME"

# Copy web files
cp Axolotl-Changelog-Viewer.html "$APP_DIR/usr/share/$APP_NAME/"

# Create AppRun (launcher)
cat > "$APP_DIR/AppRun" << 'EOF'
#!/bin/bash
# Open the self-contained HTML in the default browser
HTML="$APPDIR/usr/share/AxolotlChangelogViewer/Axolotl-Changelog-Viewer.html"
if command -v xdg-open &> /dev/null; then
    xdg-open "$HTML"
elif command -v sensible-browser &> /dev/null; then
    sensible-browser "$HTML"
else
    echo "No browser found. Please open this file manually:"
    echo "$HTML"
fi
EOF
chmod +x "$APP_DIR/AppRun"

# Create desktop file
cat > "$APP_DIR/$APP_NAME.desktop" << EOF
[Desktop Entry]
Type=Application
Name=Axolotl Changelog Viewer
Comment=Interactive changelog visualization for Axolotl Launcher
Exec=AppRun
Icon=$APP_NAME
Categories=Development;Utility;
Terminal=false
EOF

# Download appimagetool if not present
if [ ! -f appimagetool ]; then
    echo "==> Downloading appimagetool..."
    wget -q "https://github.com/AppImage/AppImageKit/releases/download/continuous/appimagetool-x86_64.AppImage" -O appimagetool
    chmod +x appimagetool
fi

# Build AppImage
echo "==> Building AppImage..."
ARCH=x86_64
if [ "$(uname -m)" = "aarch64" ]; then
    ARCH=aarch64
fi
./appimagetool "$APP_DIR" "$APP_NAME-linux-$ARCH.AppImage" --desktop-integration false

echo ""
echo "==> Done! AppImage: $APP_NAME-linux-$ARCH.AppImage"
echo "    Run: chmod +x $APP_NAME-linux-$ARCH.AppImage && ./$APP_NAME-linux-$ARCH.AppImage"
