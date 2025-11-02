# 🔨 Data Tracker - Build Guide

**Author**: Pankoj Roy

This comprehensive guide covers everything you need to know about building, developing, and distributing the Data Tracker application.

📖 [← Back to README](README.md) • 🎯 [Features Guide](FEATURES_GUIDE.md)

---

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Development Setup](#development-setup)
3. [Project Structure](#project-structure)
4. [Building the Application](#building-the-application)
5. [Features Overview](#features-overview)
6. [Customization](#customization)
7. [Troubleshooting](#troubleshooting)
8. [Distribution](#distribution)

---

## Prerequisites

### System Requirements
- **Operating System**: Windows 10/11 (64-bit)
- **Node.js**: Version 16.x or higher
- **npm**: Version 8.x or higher
- **RAM**: Minimum 4GB (8GB recommended)
- **Disk Space**: ~1GB for development (including node_modules)

### Required Software
```bash
# Check Node.js version
node --version

# Check npm version
npm --version
```

---

## Development Setup

### 1. Clone the Repository
```bash
git clone https://github.com/Uchiha-Itachi001/Data_Tracker.git
cd Data_Tracker
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Run Development Mode
```bash
npm start
```

The application will launch in development mode with hot-reloading enabled.

---

## Project Structure

```
data-tracker/
├── main.js                 # Electron main process
├── preload.js             # Preload script for IPC communication
├── package.json           # Project configuration & dependencies
├── README.md              # Project documentation
├── BUILD_GUIDE.md         # This file
├── assets/
│   ├── icon.ico          # Application icon (Windows)
│   ├── icon.png          # Application icon (PNG)
│   └── tray.png          # System tray icon
└── src/
    ├── index.html        # Main application UI
    ├── widget.html       # Floating speed widget UI
    ├── renderer.js       # Main window renderer logic
    └── styles.css        # Global styles
```

---

## Building the Application

### Production Build

#### Build for Windows (NSIS Installer)
```bash
npm run build
```

This creates:
- `dist/DataTracker-Setup-0.1.0.exe` - NSIS Installer (~93 MB)
- `dist/win-unpacked/` - Unpacked application files (~327 MB)

### Build Configuration

The build is configured in `package.json`:

```json
{
  "build": {
    "appId": "com.datatracker.app",
    "productName": "DataTracker",
    "compression": "maximum",
    "asar": true,
    "win": {
      "target": "nsis",
      "icon": "assets/icon.ico"
    },
    "nsis": {
      "oneClick": false,
      "allowToChangeInstallationDirectory": true,
      "createDesktopShortcut": true,
      "createStartMenuShortcut": true
    }
  }
}
```

### Build Optimizations Applied
1. **ASAR Compression**: Enabled for smaller file size
2. **Maximum Compression**: Reduces installer size by ~95%
3. **Excluded Files**: Source maps, mobile configs removed
4. **x64 Only**: Single architecture for Windows
5. **Native Module Unpacking**: `systeminformation` unpacked for proper operation

---

## Features Overview

### 🎯 Core Features

#### 1. Real-Time Network Monitoring
- **Live Speed Display**: Download/Upload speeds updated every second
- **Network Information**: SSID, signal strength, link speed, MAC address
- **Connection Uptime**: Tracks how long you've been connected
- **Multi-Network Support**: Track usage across different networks

#### 2. Floating Speed Widget
- **Always-on-Top**: Stays above all windows (even fullscreen)
- **Customizable**: Adjust size, colors, opacity, font size
- **Draggable**: Drag from top-center circular handle
- **Double-Click to Open**: Double-click widget to open main app
- **Hover Effects**: Interactive animations on hover
- **Auto-Show**: Optional auto-launch with system

#### 3. Data Usage Tracking
- **Daily Tracking**: Records data usage per day
- **Historical View**: Click any date to view device history
- **Network-Specific**: Tracks usage per network (SSID)
- **Device Detection**: Identifies connected devices
- **Persistent Storage**: Data saved locally in JSON format

#### 4. User Interface
- **Glassmorphism Design**: Modern frosted glass effect
- **Dark Theme**: Professional dark theme throughout
- **Responsive Layout**: 3-column optimized layout
- **Smooth Animations**: Polished transitions and effects
- **Hover Effects**: Interactive elements with visual feedback
- **System Tray**: Minimize to tray, quick access menu

#### 5. Settings & Customization
- **Widget Customization**:
  - Width: 100-400px
  - Height: 40-150px
  - Background Color: Color picker
  - Text Color: Color picker
  - Opacity: 0.1-1.0
  - Font Size: 10-24px
  
- **Auto-Launch**: Start with Windows
- **Auto-Show Widget**: Show widget on startup
- **Data Management**: Reset all tracked data

---

## Customization

### Changing App Icons

Replace these files with your custom icons:
- `assets/icon.ico` - Windows executable icon (256x256)
- `assets/icon.png` - Application icon (512x512 recommended)
- `assets/tray.png` - System tray icon (32x32)

### Modifying Colors

Edit `src/styles.css` or inline styles in HTML files:

```css
/* Main theme colors */
--color-primary: #3b82f6;
--color-secondary: #8b5cf6;
--color-accent: #ec4899;
--color-background: #0f172a;
```

### Widget Appearance

Edit `src/widget.html` styles:
```css
.widget-container {
    background: rgba(15, 23, 42, 0.95);
    border-radius: 12px;
}
```

---

## Troubleshooting

### Common Issues

#### 1. "Cannot find module 'systeminformation'" Error

**Solution**: The module needs to be unpacked from ASAR. This is already configured in `package.json`:
```json
"asarUnpack": ["node_modules/systeminformation/**/*"]
```

Rebuild the app with `npm run build`.

#### 2. Widget Not Staying on Top

**Solution**: Widget uses `screen-saver` level priority and refreshes every 2 seconds:
```javascript
widgetWindow.setAlwaysOnTop(true, 'screen-saver');
```

#### 3. Large App Size

**Current optimizations**:
- Installer: ~93 MB (reduced from 1.86 GB)
- Unpacked: ~327 MB (reduced from 2.32 GB)
- Total reduction: 95% for installer, 86% for unpacked

#### 4. Menu Bar Appearing (Alt Key)

**Solution**: Menu bar is disabled in code:
```javascript
mainWindow.setMenu(null);
widgetWindow.setMenu(null);
```

This prevents access to dev tools and file menus.

---

## Distribution

### Creating Installer

1. **Update Version**: Edit `package.json`
   ```json
   "version": "0.1.0"
   ```

2. **Build**: Run build command
   ```bash
   npm run build
   ```

3. **Test**: Install and test the generated `.exe`
   ```
   dist/DataTracker-Setup-0.1.0.exe
   ```

4. **Distribute**: Share the installer file

### Installation Process

Users can:
1. Run the NSIS installer
2. Choose installation directory
3. Opt-in for desktop/start menu shortcuts
4. Launch application

### Uninstallation

Data is preserved by default. Users can:
- Use Windows Settings → Apps
- Or use the uninstaller in installation directory

---

## Advanced Configuration

### Changing Update Interval

Edit `main.js`:
```javascript
// Network monitoring interval (default: 1000ms)
setInterval(async () => {
  // Network monitoring code
}, 1000);
```

### Modifying Storage Location

Data is stored in:
```
%APPDATA%\data-tracker-store\data\daily.json
```

Change in `main.js`:
```javascript
const DATA_FILE_DIR = path.join(app.getPath('userData'), 'data');
```

### Widget Always-on-Top Priority

Levels available:
- `normal`
- `floating`
- `torn-off-menu`
- `modal-panel`
- `main-menu`
- `status`
- `pop-up-menu`
- `screen-saver` ← Currently used (highest)

---

## Development Tips

### Debug Mode

Enable DevTools in development:
```javascript
// In main.js for main window
mainWindow.webContents.openDevTools();

// For widget
widgetWindow.webContents.openDevTools();
```

### Testing Widget Features

1. Enable widget: Toggle in main app
2. Test drag: Use top-center circular handle
3. Test double-click: Double-click widget body
4. Test customization: Adjust settings in main app

### Monitoring Performance

Check Electron's built-in performance tools:
```javascript
console.log(process.getProcessMemoryInfo());
```

---

## Build Checklist

Before building for distribution:

- [ ] Update version in `package.json`
- [ ] Test all features in development mode
- [ ] Test widget always-on-top with fullscreen apps
- [ ] Verify data persistence across app restarts
- [ ] Test installer creation
- [ ] Install and test from installer
- [ ] Test uninstall process
- [ ] Verify auto-launch works
- [ ] Check file size optimization
- [ ] Remove debug/console logs

---

## Technology Stack

- **Electron**: v39.0.0 - Desktop app framework
- **Node.js**: JavaScript runtime
- **systeminformation**: v5.12.5 - System/network information
- **electron-store**: v8.1.0 - Persistent data storage
- **auto-launch**: v5.0.6 - Auto-start functionality
- **electron-builder**: v26.0.12 - App packaging
- **TailwindCSS**: v4.1.16 - Utility-first CSS
- **Feather Icons**: Icon library

---

## Performance Metrics

### Application Size
- **Installer**: 92.93 MB
- **Unpacked App**: 327.34 MB
- **Total dist folder**: 420.37 MB

### Memory Usage
- **Idle**: ~80-100 MB
- **Active Monitoring**: ~120-150 MB
- **Widget Only**: ~40-60 MB

### CPU Usage
- **Idle**: <1%
- **Active**: 1-3%
- **Peak**: 5-8% during startup

---

## License & Copyright

**Copyright © 2025 Pankoj Roy**

All rights reserved.

---

## Support & Contact

- **GitHub**: [Uchiha-Itachi001](https://github.com/Uchiha-Itachi001)
- **Repository**: [Data_Tracker](https://github.com/Uchiha-Itachi001/Data_Tracker)

---

## Version History

### v0.1.0 (Initial Release)
- ✅ Real-time network monitoring
- ✅ Floating speed widget
- ✅ Data usage tracking
- ✅ Multi-network support
- ✅ Interactive date-based history
- ✅ Widget customization
- ✅ Always-on-top widget
- ✅ Double-click to open main app
- ✅ Hover effects and animations
- ✅ System tray integration
- ✅ Auto-launch support
- ✅ Menu bar removed for security

---

## 📚 Related Documentation

- **[📖 README](README.md)** - Project overview, features, and quick start guide
- **[🎯 Features Guide](FEATURES_GUIDE.md)** - Detailed documentation of all features with code examples

---

**Built with ❤️ by Pankoj Roy**
