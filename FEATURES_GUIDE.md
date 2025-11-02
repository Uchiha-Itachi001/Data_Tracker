# 🎯 Data Tracker - Complete Features Guide

**Author**: Pankoj Roy

This comprehensive guide covers every feature implemented in the Data Tracker application with detailed explanations, code examples, and usage instructions.

📖 [← Back to README](README.md) • 🔨 [Build Guide](BUILD_GUIDE.md)

---

## 📋 Table of Contents

1. [Real-Time Network Monitoring](#1-real-time-network-monitoring)
2. [Floating Speed Widget](#2-floating-speed-widget)
3. [Data Usage Tracking](#3-data-usage-tracking)
4. [Multi-Network Support](#4-multi-network-support)
5. [Interactive Date-Based History](#5-interactive-date-based-history)
6. [Widget Customization](#6-widget-customization)
7. [Always-on-Top Widget](#7-always-on-top-widget)
8. [System Tray Integration](#8-system-tray-integration)
9. [Auto-Launch on Startup](#9-auto-launch-on-startup)
10. [Data Management](#10-data-management)
11. [UI/UX Features](#11-uiux-features)
12. [Security Features](#12-security-features)

---

## 1. Real-Time Network Monitoring

### Description
Monitors network statistics in real-time, updating every second with current download/upload speeds and connection information.

### Implementation Details

#### Code Location: `main.js`

```javascript
// Network monitoring interval - updates every 1 second
const NETWORK_MONITOR_INTERVAL = 1000;

let lastRxBytes = 0;
let lastTxBytes = 0;
let lastCheckTime = Date.now();

async function monitorNetwork() {
  try {
    const networkStats = await si.networkStats();
    
    if (networkStats && networkStats.length > 0) {
      const activeInterface = networkStats.find(iface => iface.operstate === 'up');
      
      if (activeInterface) {
        const now = Date.now();
        const timeDiff = (now - lastCheckTime) / 1000; // Convert to seconds
        
        // Calculate speeds
        const rxBytes = activeInterface.rx_bytes;
        const txBytes = activeInterface.tx_bytes;
        
        const downloadSpeedBytesPerSec = (rxBytes - lastRxBytes) / timeDiff;
        const uploadSpeedBytesPerSec = (txBytes - lastTxBytes) / timeDiff;
        
        // Update last values
        lastRxBytes = rxBytes;
        lastTxBytes = txBytes;
        lastCheckTime = now;
        
        // Send to renderer
        const payload = {
          downloadSpeedBytesPerSec,
          uploadSpeedBytesPerSec,
          totalDownload: rxBytes,
          totalUpload: txBytes
        };
        
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('network-update', payload);
        }
        
        if (widgetWindow && !widgetWindow.isDestroyed() && widgetWindow.isVisible()) {
          widgetWindow.webContents.send('network-update', payload);
        }
      }
    }
  } catch (error) {
    console.error('Network monitoring error:', error);
  }
}

// Start monitoring
setInterval(monitorNetwork, NETWORK_MONITOR_INTERVAL);
```

#### Features:
- **Speed Calculation**: Calculates bytes transferred per second
- **Active Interface Detection**: Automatically finds active network interface
- **Dual Updates**: Sends data to both main window and widget
- **Error Handling**: Gracefully handles monitoring errors

#### Usage:
The monitoring starts automatically when the app launches and runs continuously in the background.

---

## 2. Floating Speed Widget

### Description
A floating, always-visible widget that displays real-time download/upload speeds with customizable appearance.

### Implementation Details

#### Code Location: `main.js` - Widget Creation

```javascript
function createWidgetWindow() {
  // Prevent multiple widget windows
  if (widgetWindow && !widgetWindow.isDestroyed()) {
    return;
  }

  widgetWindow = new BrowserWindow({
    width: 180,
    height: 60,
    frame: false,              // Remove window frame
    transparent: true,         // Transparent background
    alwaysOnTop: true,        // Stay above other windows
    resizable: false,         // Fixed size
    skipTaskbar: true,        // Don't show in taskbar
    type: 'toolbar',          // Special window type for always-on-top
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  // Remove menu bar
  widgetWindow.setMenu(null);

  // Set highest priority always-on-top
  widgetWindow.setAlwaysOnTop(true, 'screen-saver');

  // Make visible on all workspaces/virtual desktops
  widgetWindow.setVisibleOnAllWorkspaces(true, { 
    visibleOnFullScreen: true 
  });

  widgetWindow.loadFile(path.join(__dirname, 'src', 'widget.html'));

  // Re-assert always on top when window loses focus
  widgetWindow.on('blur', () => {
    if (widgetWindow && !widgetWindow.isDestroyed()) {
      widgetWindow.setAlwaysOnTop(true, 'screen-saver');
    }
  });

  // Maintain top position every 2 seconds
  setInterval(() => {
    if (widgetWindow && !widgetWindow.isDestroyed() && widgetWindow.isVisible()) {
      widgetWindow.setAlwaysOnTop(true, 'screen-saver');
      widgetWindow.moveTop();
    }
  }, 2000);

  // Auto-show logic
  const autoShow = store.get('autoShowWidget', false);
  const widgetEnabled = store.get('widgetEnabled', false);

  if (autoShow || widgetEnabled) {
    widgetWindow.show();
  } else {
    widgetWindow.hide();
  }
}
```

#### Widget UI: `src/widget.html`

```html
<div class="widget-container p-2">
    <!-- Drag handle with icon - appears on hover in top center -->
    <div class="drag-handle">
        <i data-feather="move" class="drag-icon"></i>
    </div>
    
    <div class="flex items-center justify-between h-full">
        <!-- Download Speed -->
        <div class="flex items-center space-x-1 speed-section">
            <i data-feather="download" class="network-icon w-3 h-3"></i>
            <div>
                <div class="flex items-baseline">
                    <span id="download-speed" class="speed-display">--</span>
                    <span class="speed-unit">KB/s</span>
                </div>
            </div>
        </div>

        <!-- Separator -->
        <div class="w-px h-6 bg-slate-600 mx-1 separator"></div>

        <!-- Upload Speed -->
        <div class="flex items-center space-x-1 speed-section">
            <i data-feather="upload" class="network-icon w-3 h-3"></i>
            <div>
                <div class="flex items-baseline">
                    <span id="upload-speed" class="speed-display">--</span>
                    <span class="speed-unit">KB/s</span>
                </div>
            </div>
        </div>
    </div>
</div>
```

#### Speed Update Logic: `src/widget.html`

```javascript
function bytesToHuman(b) {
    if (b === undefined || b === null) return '--';
    const units = ['B', 'KB', 'MB', 'GB'];
    let v = b, i = 0;
    while (v >= 1024 && i < units.length - 1) {
        v /= 1024;
        i++;
    }
    return {
        value: v.toFixed(v >= 100 ? 0 : v >= 10 ? 1 : 2),
        unit: units[i]
    };
}

window.electronAPI.onNetworkUpdate((p) => {
    // Handle download speed
    const downloadSpeedData = bytesToHuman(p.downloadSpeedBytesPerSec);
    const newDownloadSpeed = parseFloat(downloadSpeedData.value);

    if (Math.abs(newDownloadSpeed - lastDownloadSpeed) > 10) {
        downloadSpeedEl.classList.add('speed-change');
        setTimeout(() => downloadSpeedEl.classList.remove('speed-change'), 600);
    }

    downloadSpeedEl.textContent = downloadSpeedData.value;
    downloadSpeedEl.nextElementSibling.textContent = `${downloadSpeedData.unit}/s`;
    lastDownloadSpeed = newDownloadSpeed;

    // Handle upload speed (similar logic)
    const uploadSpeedData = bytesToHuman(p.uploadSpeedBytesPerSec);
    const newUploadSpeed = parseFloat(uploadSpeedData.value);

    if (Math.abs(newUploadSpeed - lastUploadSpeed) > 10) {
        uploadSpeedEl.classList.add('speed-change');
        setTimeout(() => uploadSpeedEl.classList.remove('speed-change'), 600);
    }

    uploadSpeedEl.textContent = uploadSpeedData.value;
    uploadSpeedEl.nextElementSibling.textContent = `${uploadSpeedData.unit}/s`;
    lastUploadSpeed = newUploadSpeed;
});
```

#### Features:
- **Frameless Design**: No window borders for clean look
- **Transparent Background**: Blends with desktop
- **Always-on-Top**: Stays above all windows including fullscreen
- **Auto Unit Conversion**: Automatically converts B/KB/MB/GB
- **Speed Change Animation**: Visual feedback when speed changes significantly

---

## 3. Data Usage Tracking

### Description
Tracks daily data usage with persistent storage, showing historical data for each day.

### Implementation Details

#### Storage Structure: JSON File

```javascript
// Storage location
const DATA_FILE_DIR = path.join(app.getPath('userData'), 'data');
const DATA_FILE = path.join(DATA_FILE_DIR, 'daily.json');

// Data structure
{
  "2025-11-02": {
    "rx_tx_bytes": 9720345391,
    "rx_bytes": 9057924244,
    "tx_bytes": 662421147,
    "last_rx": 582098282,
    "last_tx": 123254373,
    "networks": {
      "Galaxy A12E59E": {
        "interface": "Wi-Fi",
        "rx_tx_bytes": 810291024,
        "rx_bytes": 677943534,
        "tx_bytes": 132347490,
        "firstSeen": 1762079070160,
        "lastSeen": 1762090767917
      }
    }
  }
}
```

#### Data Reading/Writing: `main.js`

```javascript
function ensureDataFile() {
  if (!fs.existsSync(DATA_FILE_DIR))
    fs.mkdirSync(DATA_FILE_DIR, { recursive: true });
  if (!fs.existsSync(DATA_FILE))
    fs.writeFileSync(DATA_FILE, JSON.stringify({}), "utf8");
}

function readData() {
  ensureDataFile();
  try {
    const content = fs.readFileSync(DATA_FILE, "utf8");
    const data = JSON.parse(content || "{}");
    
    // Validate data structure
    if (typeof data !== "object" || data === null) {
      console.warn("Invalid data structure, resetting to empty object");
      return {};
    }
    return data;
  } catch (e) {
    console.error("Error reading data file:", e);
    return {};
  }
}

function writeData(obj) {
  ensureDataFile();
  try {
    // Validate data
    if (typeof obj !== "object" || obj === null) {
      console.error("Attempted to write invalid data structure:", obj);
      return;
    }
    
    // Create backup before writing
    const backupPath = DATA_FILE + ".backup";
    if (fs.existsSync(DATA_FILE)) {
      fs.copyFileSync(DATA_FILE, backupPath);
    }
    
    fs.writeFileSync(DATA_FILE, JSON.stringify(obj, null, 2), "utf8");
    console.log(`Data saved successfully with ${Object.keys(obj).length} entries`);
  } catch (e) {
    console.error("Error writing data file:", e);
    
    // Try to restore from backup if write failed
    const backupPath = DATA_FILE + ".backup";
    if (fs.existsSync(backupPath)) {
      try {
        fs.copyFileSync(backupPath, DATA_FILE);
        console.log("Restored data from backup");
      } catch (backupError) {
        console.error("Failed to restore from backup:", backupError);
      }
    }
  }
}
```

#### Usage Tracking Logic: `main.js`

```javascript
async function trackDataUsage() {
  try {
    const networkStats = await si.networkStats();
    const activeInterface = networkStats.find(iface => iface.operstate === 'up');
    
    if (activeInterface) {
      const data = readData();
      const today = getLocalDateKey(); // "YYYY-MM-DD"
      
      if (!data[today]) {
        data[today] = {
          rx_tx_bytes: 0,
          rx_bytes: 0,
          tx_bytes: 0,
          last_rx: activeInterface.rx_bytes,
          last_tx: activeInterface.tx_bytes,
          networks: {}
        };
      }
      
      // Calculate delta
      const rxDelta = activeInterface.rx_bytes - data[today].last_rx;
      const txDelta = activeInterface.tx_bytes - data[today].last_tx;
      
      // Update totals
      data[today].rx_bytes += rxDelta;
      data[today].tx_bytes += txDelta;
      data[today].rx_tx_bytes = data[today].rx_bytes + data[today].tx_bytes;
      data[today].last_rx = activeInterface.rx_bytes;
      data[today].last_tx = activeInterface.tx_bytes;
      
      writeData(data);
    }
  } catch (error) {
    console.error('Data tracking error:', error);
  }
}

// Track every second
setInterval(trackDataUsage, 1000);
```

#### Features:
- **Persistent Storage**: Data saved to local JSON file
- **Backup System**: Automatic backup before each write
- **Error Recovery**: Restores from backup on write failure
- **Daily Aggregation**: Tracks data per day with date keys
- **Delta Calculation**: Calculates incremental changes

---

## 4. Multi-Network Support

### Description
Tracks data usage separately for each network (SSID) you connect to.

### Implementation Details

#### Network Detection: `main.js`

```javascript
async function detectCurrentNetwork() {
  try {
    // Get WiFi connections
    const wifiConnections = await si.wifiConnections();
    
    if (wifiConnections && wifiConnections.length > 0) {
      const activeWifi = wifiConnections[0];
      return {
        ssid: activeWifi.ssid,
        interface: activeWifi.iface,
        type: 'Wi-Fi',
        signalLevel: activeWifi.signalLevel,
        linkSpeed: activeWifi.txRate
      };
    }
    
    // Fallback to network interfaces
    const networkInterfaces = await si.networkInterfaces();
    const activeInterface = networkInterfaces.find(iface => 
      iface.operstate === 'up' && iface.ip4 && iface.ip4 !== '127.0.0.1'
    );
    
    if (activeInterface) {
      return {
        ssid: activeInterface.iface,
        interface: activeInterface.iface,
        type: 'Ethernet',
        mac: activeInterface.mac
      };
    }
  } catch (error) {
    console.error('Network detection error:', error);
  }
  
  return null;
}
```

#### Per-Network Tracking: `main.js`

```javascript
async function trackNetworkData() {
  const network = await detectCurrentNetwork();
  
  if (network) {
    const data = readData();
    const today = getLocalDateKey();
    
    if (!data[today]) {
      data[today] = {
        rx_tx_bytes: 0,
        rx_bytes: 0,
        tx_bytes: 0,
        networks: {}
      };
    }
    
    const ssid = network.ssid;
    
    if (!data[today].networks[ssid]) {
      data[today].networks[ssid] = {
        interface: network.interface,
        rx_tx_bytes: 0,
        rx_bytes: 0,
        tx_bytes: 0,
        firstSeen: Date.now(),
        lastSeen: Date.now()
      };
    }
    
    // Update network-specific data
    const networkStats = await si.networkStats();
    const activeInterface = networkStats.find(iface => iface.operstate === 'up');
    
    if (activeInterface) {
      const rxBytes = activeInterface.rx_bytes;
      const txBytes = activeInterface.tx_bytes;
      
      data[today].networks[ssid].rx_bytes = rxBytes;
      data[today].networks[ssid].tx_bytes = txBytes;
      data[today].networks[ssid].rx_tx_bytes = rxBytes + txBytes;
      data[today].networks[ssid].lastSeen = Date.now();
      
      writeData(data);
    }
  }
}
```

#### Network Icon Display: `src/renderer.js`

```javascript
function getNetworkIcon(ssid) {
  const ssidLower = ssid.toLowerCase();
  
  if (ssidLower.includes('mobile') || 
      ssidLower.includes('hotspot') || 
      ssidLower.includes('phone')) {
    return { icon: 'smartphone', color: '#10b981', label: 'Mobile Hotspot' };
  }
  
  if (ssidLower.includes('ethernet') || 
      ssidLower.includes('eth')) {
    return { icon: 'rss', color: '#3b82f6', label: 'Ethernet' };
  }
  
  if (ssidLower.includes('router')) {
    return { icon: 'wifi', color: '#f59e0b', label: 'Router' };
  }
  
  if (ssidLower.includes('pc') || 
      ssidLower.includes('computer')) {
    return { icon: 'monitor', color: '#8b5cf6', label: 'PC Network' };
  }
  
  return { icon: 'wifi', color: '#60a5fa', label: 'Wi-Fi' };
}
```

#### Features:
- **Automatic Detection**: Identifies WiFi and Ethernet connections
- **SSID Tracking**: Separates data by network name
- **Network Types**: Identifies Mobile Hotspot, Router, PC, WiFi, Ethernet
- **Color-Coded Icons**: Visual representation of network types
- **Historical Network Data**: Tracks first/last seen timestamps

---

## 5. Interactive Date-Based History

### Description
Click on any date in the usage history to view detailed device/network information for that specific day.

### Implementation Details

#### Date Click Handler: `src/renderer.js`

```javascript
async function handleDateClick(dateKey) {
  try {
    const data = await window.electronAPI.getDailyData();
    const dayData = data[dateKey];
    
    if (!dayData || !dayData.networks) {
      alert('No device history found for this date.');
      return;
    }
    
    // Display device history modal
    showDeviceHistoryModal(dateKey, dayData.networks);
  } catch (error) {
    console.error('Error loading date history:', error);
  }
}

function showDeviceHistoryModal(date, networks) {
  const modal = document.getElementById('device-history-modal');
  const deviceList = document.getElementById('device-history-list');
  const dateTitle = document.getElementById('device-history-date');
  
  // Format date
  const dateObj = new Date(date);
  dateTitle.textContent = dateObj.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  
  // Clear previous content
  deviceList.innerHTML = '';
  
  // Add each network
  Object.entries(networks).forEach(([ssid, networkData]) => {
    const deviceCard = createDeviceCard(ssid, networkData);
    deviceList.appendChild(deviceCard);
  });
  
  // Show modal
  modal.classList.remove('hidden');
  modal.classList.add('flex');
}
```

#### Device Card Creation: `src/renderer.js`

```javascript
function createDeviceCard(ssid, networkData) {
  const card = document.createElement('div');
  card.className = 'device-history-card';
  
  const networkInfo = getNetworkIcon(ssid);
  
  card.innerHTML = `
    <div class="flex items-center justify-between">
      <div class="flex items-center space-x-3">
        <div class="device-icon" style="color: ${networkInfo.color};">
          <i data-feather="${networkInfo.icon}" class="w-6 h-6"></i>
        </div>
        <div>
          <h4 class="font-semibold text-white">${ssid}</h4>
          <p class="text-sm text-slate-400">${networkInfo.label}</p>
        </div>
      </div>
      <div class="text-right">
        <div class="text-lg font-bold text-white">
          ${formatBytes(networkData.rx_tx_bytes)}
        </div>
        <div class="text-sm text-slate-400">Total</div>
      </div>
    </div>
    
    <div class="grid grid-cols-2 gap-4 mt-4">
      <div class="stat-box">
        <div class="stat-label">
          <i data-feather="download" class="w-4 h-4"></i>
          Download
        </div>
        <div class="stat-value text-blue-400">
          ${formatBytes(networkData.rx_bytes)}
        </div>
      </div>
      
      <div class="stat-box">
        <div class="stat-label">
          <i data-feather="upload" class="w-4 h-4"></i>
          Upload
        </div>
        <div class="stat-value text-purple-400">
          ${formatBytes(networkData.tx_bytes)}
        </div>
      </div>
    </div>
    
    <div class="text-xs text-slate-500 mt-3">
      Connection Time: ${formatConnectionTime(networkData.firstSeen, networkData.lastSeen)}
    </div>
  `;
  
  feather.replace();
  return card;
}
```

#### Features:
- **Interactive Dates**: Click any date to see details
- **Device Cards**: Beautiful cards showing each network
- **Connection Duration**: Shows when you connected/disconnected
- **Data Breakdown**: Download/Upload separated
- **Network Type Icons**: Visual identification of network types

---

## 6. Widget Customization

### Description
Fully customizable widget appearance including size, colors, opacity, and font size.

### Implementation Details

#### Settings UI: `src/index.html`

```html
<div id="widget-customization-modal" class="modal">
    <div class="modal-content">
        <h2>Widget Customization</h2>
        
        <!-- Width Slider -->
        <div class="setting-group">
            <label>Width: <span id="widget-width-value">180</span>px</label>
            <input type="range" id="widget-width" 
                   min="100" max="400" value="180" step="10">
        </div>
        
        <!-- Height Slider -->
        <div class="setting-group">
            <label>Height: <span id="widget-height-value">60</span>px</label>
            <input type="range" id="widget-height" 
                   min="40" max="150" value="60" step="5">
        </div>
        
        <!-- Background Color -->
        <div class="setting-group">
            <label>Background Color</label>
            <input type="color" id="widget-bg-color" value="#0f172a">
        </div>
        
        <!-- Text Color -->
        <div class="setting-group">
            <label>Text Color</label>
            <input type="color" id="widget-text-color" value="#f8fafc">
        </div>
        
        <!-- Opacity Slider -->
        <div class="setting-group">
            <label>Opacity: <span id="widget-opacity-value">0.95</span></label>
            <input type="range" id="widget-opacity" 
                   min="0.1" max="1" value="0.95" step="0.05">
        </div>
        
        <!-- Font Size Slider -->
        <div class="setting-group">
            <label>Font Size: <span id="widget-font-size-value">14</span>px</label>
            <input type="range" id="widget-font-size" 
                   min="10" max="24" value="14" step="1">
        </div>
    </div>
</div>
```

#### Customization Handler: `src/renderer.js`

```javascript
function applyWidgetCustomization() {
  const settings = {
    width: parseInt(document.getElementById('widget-width').value),
    height: parseInt(document.getElementById('widget-height').value),
    bgColor: document.getElementById('widget-bg-color').value,
    textColor: document.getElementById('widget-text-color').value,
    opacity: parseFloat(document.getElementById('widget-opacity').value),
    fontSize: parseInt(document.getElementById('widget-font-size').value)
  };
  
  // Send to widget
  window.electronAPI.updateWidgetSettings(settings);
  
  // Save to store
  localStorage.setItem('widgetSettings', JSON.stringify(settings));
}

// Apply on change
document.querySelectorAll('#widget-customization-modal input').forEach(input => {
  input.addEventListener('input', () => {
    // Update value displays
    const valueSpan = document.getElementById(`${input.id}-value`);
    if (valueSpan) {
      valueSpan.textContent = input.value;
    }
    
    applyWidgetCustomization();
  });
});
```

#### Widget Style Update: `src/widget.html`

```javascript
window.electronAPI.onWidgetStyleUpdate((settings) => {
    const widgetContainer = document.querySelector('.widget-container');
    const speedDisplays = document.querySelectorAll('.speed-display');
    const speedUnits = document.querySelectorAll('.speed-unit');
    const networkIcons = document.querySelectorAll('.network-icon');

    if (widgetContainer) {
        widgetContainer.style.width = `${settings.width}px`;
        widgetContainer.style.height = `${settings.height}px`;
        widgetContainer.style.background = `rgba(${hexToRgb(settings.bgColor)}, ${settings.opacity})`;
        widgetContainer.style.backdropFilter = `blur(20px)`;
    }

    speedDisplays.forEach(display => {
        if (display) {
            display.style.color = settings.textColor;
            display.style.fontSize = `${settings.fontSize}px`;
        }
    });

    speedUnits.forEach(unit => {
        if (unit) {
            unit.style.color = settings.textColor;
            unit.style.fontSize = `${Math.max(8, settings.fontSize - 4)}px`;
        }
    });

    networkIcons.forEach(icon => {
        if (icon) {
            icon.style.color = settings.textColor;
        }
    });

    // Update window size
    if (window.electronAPI && window.electronAPI.updateWindowSize) {
        window.electronAPI.updateWindowSize(settings.width + 20, settings.height + 10);
    }
});
```

#### Features:
- **Width Control**: 100-400px range
- **Height Control**: 40-150px range
- **Color Pickers**: Background and text colors
- **Opacity Control**: 0.1-1.0 transparency
- **Font Size**: 10-24px range
- **Real-time Preview**: Changes apply instantly
- **Persistent Settings**: Saved to localStorage

---

## 7. Always-on-Top Widget

### Description
Widget stays above all windows, including fullscreen applications, with multiple fallback mechanisms.

### Implementation Details

#### Priority Levels: `main.js`

```javascript
// Set highest priority always-on-top
widgetWindow.setAlwaysOnTop(true, 'screen-saver'); // Highest level

// Available levels (from lowest to highest):
// - 'normal'
// - 'floating'
// - 'torn-off-menu'
// - 'modal-panel'
// - 'main-menu'
// - 'status'
// - 'pop-up-menu'
// - 'screen-saver' ← Used (highest)
```

#### Fullscreen Compatibility: `main.js`

```javascript
// Make visible on all workspaces (Windows virtual desktops)
widgetWindow.setVisibleOnAllWorkspaces(true, { 
  visibleOnFullScreen: true  // Key for fullscreen compatibility
});
```

#### Blur Event Handler: `main.js`

```javascript
// Re-assert always on top when window loses focus
widgetWindow.on('blur', () => {
  if (widgetWindow && !widgetWindow.isDestroyed()) {
    widgetWindow.setAlwaysOnTop(true, 'screen-saver');
  }
});
```

#### Periodic Refresh: `main.js`

```javascript
// Maintain top position every 2 seconds
// This helps maintain top position even when fullscreen apps are launched
setInterval(() => {
  if (widgetWindow && !widgetWindow.isDestroyed() && widgetWindow.isVisible()) {
    widgetWindow.setAlwaysOnTop(true, 'screen-saver');
    widgetWindow.moveTop();
  }
}, 2000);
```

#### Toolbar Window Type: `main.js`

```javascript
widgetWindow = new BrowserWindow({
  type: 'toolbar', // Special window type that stays above most windows
  // ... other options
});
```

#### Features:
- **Screen-Saver Level**: Highest priority window level
- **Fullscreen Support**: Visible even in fullscreen apps
- **Blur Recovery**: Re-asserts priority when losing focus
- **Periodic Refresh**: Re-applies every 2 seconds
- **Toolbar Type**: Special window classification
- **Virtual Desktop Support**: Visible on all workspaces

---

## 8. System Tray Integration

### Description
Minimize to system tray with quick access menu for common actions.

### Implementation Details

#### Tray Creation: `main.js`

```javascript
function createTray() {
  const iconPath = path.join(__dirname, 'assets', 'tray.png');
  const image = fs.existsSync(iconPath)
    ? nativeImage.createFromPath(iconPath)
    : null;
    
  tray = new Tray(image || nativeImage.createEmpty());
  
  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show App',
      click: () => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.show();
          mainWindow.focus();
        } else {
          createWindows();
        }
      },
    },
    {
      label: 'Toggle Widget',
      click: () => {
        if (widgetWindow && !widgetWindow.isDestroyed()) {
          if (widgetWindow.isVisible()) {
            widgetWindow.hide();
            store.set('widgetEnabled', false);
          } else {
            widgetWindow.setAlwaysOnTop(true, 'screen-saver');
            widgetWindow.moveTop();
            widgetWindow.show();
            store.set('widgetEnabled', true);
          }
        } else {
          createWidgetWindow();
        }
      },
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        app.isQuitting = true;
        app.quit();
      },
    },
  ]);
  
  tray.setToolTip('Data Tracker');
  tray.setContextMenu(contextMenu);
  
  // Double-click to show main window
  tray.on('double-click', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.show();
      mainWindow.focus();
    }
  });
}
```

#### Main Window Tray Behavior: `main.js`

```javascript
// Handle main window close event - hide to tray
mainWindow.on('close', (event) => {
  if (!app.isQuitting) {
    event.preventDefault();
    mainWindow.hide();
    // Remove from taskbar when hidden
    mainWindow.setSkipTaskbar(true);
  }
});

mainWindow.on('closed', () => {
  mainWindow = null;
});

// When user clicks taskbar icon while window is hidden, show it
mainWindow.on('show', () => {
  // Restore to taskbar when shown
  mainWindow.setSkipTaskbar(false);
  mainWindow.focus();
});
```

#### Features:
- **System Tray Icon**: Custom icon in notification area
- **Context Menu**: Right-click for quick actions
- **Show App**: Restore main window
- **Toggle Widget**: Show/hide widget
- **Quit**: Close application completely
- **Double-Click**: Quick restore main window
- **Minimize to Tray**: Close button hides to tray
- **Taskbar Management**: Removes from taskbar when hidden

---

## 9. Auto-Launch on Startup

### Description
Option to automatically start the application when Windows boots up.

### Implementation Details

#### Auto-Launch Setup: `main.js`

```javascript
const AutoLaunch = require('auto-launch');

const autoLauncher = new AutoLaunch({
  name: 'DataTracker',
  path: app.getPath('exe'),  // Path to executable
});
```

#### Get Auto-Launch Status: `main.js`

```javascript
ipcMain.handle("get-auto-launch", async () => {
  try {
    const isEnabled = await autoLauncher.isEnabled();
    return isEnabled;
  } catch (error) {
    console.error("Error checking auto-launch status:", error);
    return false;
  }
});
```

#### Toggle Auto-Launch: `main.js`

```javascript
ipcMain.handle("toggle-auto-launch", async (event, enabled) => {
  try {
    if (enabled) {
      await autoLauncher.enable();
      console.log("Auto-launch enabled");
    } else {
      await autoLauncher.disable();
      console.log("Auto-launch disabled");
    }
    return true;
  } catch (error) {
    console.error("Error toggling auto-launch:", error);
    return false;
  }
});
```

#### UI Toggle: `src/renderer.js`

```javascript
async function loadSettings() {
  // Load auto-launch status
  const autoLaunchEnabled = await window.electronAPI.getAutoLaunch();
  const autoLaunchToggle = document.getElementById('auto-launch-toggle');
  autoLaunchToggle.checked = autoLaunchEnabled;
}

// Toggle handler
document.getElementById('auto-launch-toggle').addEventListener('change', async (e) => {
  const enabled = e.target.checked;
  const success = await window.electronAPI.toggleAutoLaunch(enabled);
  
  if (success) {
    showNotification(
      enabled ? 'Auto-launch enabled' : 'Auto-launch disabled',
      'success'
    );
  } else {
    e.target.checked = !enabled; // Revert on failure
    showNotification('Failed to change auto-launch setting', 'error');
  }
});
```

#### Features:
- **Windows Integration**: Uses Windows startup registry
- **Toggle Control**: Easy on/off switch in settings
- **Status Persistence**: Remembers user preference
- **Error Handling**: Gracefully handles permission issues
- **Visual Feedback**: Shows success/error notifications

---

## 10. Data Management

### Description
Tools to manage tracked data including reset functionality.

### Implementation Details

#### Reset Data: `main.js`

```javascript
ipcMain.handle("reset-data", () => {
  try {
    // Reset the data file to empty object
    fs.writeFileSync(DATA_FILE, JSON.stringify({}), "utf8");
    console.log("Data reset successfully");
    return true;
  } catch (error) {
    console.error("Failed to reset data:", error);
    return false;
  }
});
```

#### Reset UI: `src/renderer.js`

```javascript
document.getElementById('reset-data-btn').addEventListener('click', async () => {
  const confirmed = confirm(
    'Are you sure you want to reset all tracked data? This action cannot be undone.'
  );
  
  if (confirmed) {
    const success = await window.electronAPI.resetData();
    
    if (success) {
      showNotification('All data has been reset successfully', 'success');
      // Reload data display
      await loadDailyUsage();
    } else {
      showNotification('Failed to reset data', 'error');
    }
  }
});
```

#### Data Export: `src/renderer.js`

```javascript
async function exportData() {
  try {
    const data = await window.electronAPI.getDailyData();
    const dataStr = JSON.stringify(data, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `data-tracker-export-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    
    URL.revokeObjectURL(url);
    showNotification('Data exported successfully', 'success');
  } catch (error) {
    console.error('Export error:', error);
    showNotification('Failed to export data', 'error');
  }
}
```

#### Features:
- **Reset All Data**: Clear all tracking history
- **Confirmation Dialog**: Prevents accidental deletion
- **Data Export**: Download data as JSON file
- **Backup System**: Automatic backup before operations
- **Success Notifications**: Visual feedback for actions

---

## 11. UI/UX Features

### Description
Modern, polished user interface with smooth animations and interactive elements.

### Implementation Details

#### Glassmorphism Design: `src/styles.css`

```css
.card {
    background: rgba(15, 23, 42, 0.8);
    backdrop-filter: blur(20px);
    border: 1px solid rgba(71, 85, 105, 0.3);
    border-radius: 16px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
}
```

#### Hover Effects: `src/widget.html`

```css
/* Widget hover effects */
.widget-container:hover {
    transform: translateY(-2px);
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
    background: rgba(15, 23, 42, 0.98);
}

.widget-container:hover::before {
    transform: scale(1);
}

/* Speed display hover */
.speed-display:hover {
    transform: scale(1.05);
    color: #60a5fa;
}

/* Icon hover */
.network-icon:hover {
    transform: scale(1.15);
    filter: drop-shadow(0 2px 4px rgba(96, 165, 250, 0.5));
}

/* Speed section hover */
.speed-section:hover {
    background: rgba(71, 85, 105, 0.2);
}

/* Separator hover */
.widget-container:hover .separator {
    background: linear-gradient(to bottom, #3b82f6, #8b5cf6);
    box-shadow: 0 0 8px rgba(59, 130, 246, 0.5);
}
```

#### Drag Handle: `src/widget.html`

```css
.drag-handle {
    -webkit-app-region: drag;
    position: absolute;
    top: -8px;
    left: 50%;
    transform: translateX(-50%);
    width: 24px;
    height: 24px;
    z-index: 10;
    cursor: move;
    background: rgba(71, 85, 105, 0.95);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0;
    transition: all 0.3s ease;
    backdrop-filter: blur(10px);
    border: 2px solid rgba(148, 163, 184, 0.5);
}

.widget-container:hover .drag-handle {
    opacity: 1;
}

.drag-handle:hover {
    opacity: 1;
    background: rgba(71, 85, 105, 1);
    transform: translateX(-50%) scale(1.15);
    border-color: rgba(96, 165, 250, 0.8);
    box-shadow: 0 0 12px rgba(96, 165, 250, 0.6);
}
```

#### Speed Change Animation: `src/widget.html`

```css
.speed-change {
    animation: speedPulse 0.6s ease-out;
}

@keyframes speedPulse {
    0% {
        transform: scale(1);
    }
    50% {
        transform: scale(1.05);
    }
    100% {
        transform: scale(1);
    }
}
```

#### Double-Click to Open: `src/widget.html`

```javascript
// Add double-click handler to widget container
document.querySelector('.widget-container').addEventListener('dblclick', (e) => {
    // Don't trigger if double-clicking the drag handle
    if (!e.target.classList.contains('drag-handle')) {
        if (window.electronAPI && window.electronAPI.openMainApp) {
            window.electronAPI.openMainApp();
        }
    }
});
```

#### Gradient Animations: `src/styles.css`

```css
@keyframes gradient {
    0% {
        background-position: 0% 50%;
    }
    50% {
        background-position: 100% 50%;
    }
    100% {
        background-position: 0% 50%;
    }
}

.gradient-bg {
    background: linear-gradient(
        270deg,
        #3b82f6,
        #8b5cf6,
        #ec4899,
        #3b82f6
    );
    background-size: 400% 400%;
    animation: gradient 15s ease infinite;
}
```

#### Features:
- **Glassmorphism**: Frosted glass effect with backdrop blur
- **Smooth Transitions**: All animations use ease timing
- **Hover Effects**: Interactive feedback on all elements
- **Gradient Animations**: Animated gradient backgrounds
- **Speed Pulse**: Visual feedback for speed changes
- **Drag Handle**: Circular handle that appears on hover
- **Double-Click**: Opens main app from widget
- **Color-Coded Stats**: Blue for download, Purple for upload
- **Icon Animations**: Scale and glow effects

---

## 12. Security Features

### Description
Security measures to prevent unauthorized access to development tools and features.

### Implementation Details

#### Menu Bar Removal: `main.js`

```javascript
// Remove menu bar completely to prevent access to dev tools
mainWindow.setMenu(null);
widgetWindow.setMenu(null);

// This prevents users from:
// - Pressing Alt to access menu
// - Using File > Open DevTools
// - Accessing View menu
// - Any other menu-based actions
```

#### Context Isolation: `main.js`

```javascript
mainWindow = new BrowserWindow({
    width: 820,
    height: 600,
    webPreferences: {
        preload: path.join(__dirname, 'preload.js'),
        nodeIntegration: false,      // Disable Node.js in renderer
        contextIsolation: true,       // Isolate contexts
        enableRemoteModule: false,    // Disable remote module
    },
});
```

#### Preload Script Security: `preload.js`

```javascript
const { contextBridge, ipcRenderer } = require("electron");

// Only expose specific, safe APIs
contextBridge.exposeInMainWorld("electronAPI", {
  getDailyData: () => ipcRenderer.invoke("get-daily-data"),
  getNetworkInfo: () => ipcRenderer.invoke("get-network-info"),
  toggleWidget: (enabled) => ipcRenderer.invoke("toggle-widget", enabled),
  resetData: () => ipcRenderer.invoke("reset-data"),
  // ... only whitelisted methods
});

// Users cannot access:
// - require()
// - process
// - Node.js modules
// - File system directly
```

#### External Link Handling: `main.js`

```javascript
// Open external links in default browser instead of Electron window
mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
});

// Handle navigation to external links
mainWindow.webContents.on("will-navigate", (event, url) => {
    if (url !== mainWindow.webContents.getURL()) {
        event.preventDefault();
        shell.openExternal(url);
    }
});
```

#### Disk Cache Disabled: `main.js`

```javascript
// Disable disk cache to prevent "Access is denied" errors
app.commandLine.appendSwitch("disable-http-cache");
app.commandLine.appendSwitch("disable-gpu-shader-disk-cache");
```

#### Single Instance Lock: `main.js`

```javascript
// Prevent multiple app instances
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
    app.quit();
} else {
    app.on("second-instance", () => {
        // Someone tried to run a second instance, show the existing window
        if (mainWindow && !mainWindow.isDestroyed()) {
            if (mainWindow.isMinimized()) mainWindow.restore();
            if (!mainWindow.isVisible()) mainWindow.show();
            mainWindow.focus();
        }
    });
}
```

#### Features:
- **No Menu Bar**: Users cannot access Alt menu or dev tools
- **Context Isolation**: Renderer process isolated from Node.js
- **No Node Integration**: Renderer cannot use require() or Node APIs
- **Preload Whitelist**: Only specific APIs exposed
- **External Links**: Open in default browser, not in app
- **Cache Disabled**: Prevents file access errors
- **Single Instance**: Only one app can run at a time
- **No Remote Module**: Remote access disabled

---

## Additional Features

### IPC Communication

#### Main Process IPC Handlers: `main.js`

```javascript
// Get daily data
ipcMain.handle("get-daily-data", () => {
    return readData();
});

// Get network info
ipcMain.handle("get-network-info", async () => {
    const wifiConnections = await si.wifiConnections();
    const networkInterfaces = await si.networkInterfaces();
    const networkStats = await si.networkStats();
    
    return {
        wifi: wifiConnections,
        interfaces: networkInterfaces,
        stats: networkStats
    };
});

// Toggle widget
ipcMain.handle("toggle-widget", (event, enabled) => {
    if (enabled) {
        if (!widgetWindow || widgetWindow.isDestroyed()) {
            createWidgetWindow();
        } else {
            widgetWindow.setAlwaysOnTop(true, 'screen-saver');
            widgetWindow.moveTop();
            widgetWindow.show();
        }
    } else {
        if (widgetWindow && !widgetWindow.isDestroyed()) {
            widgetWindow.hide();
        }
    }
});

// Update widget settings
ipcMain.handle("update-widget-settings", (event, settings) => {
    if (widgetWindow && !widgetWindow.isDestroyed()) {
        widgetWindow.webContents.send("update-widget-style", settings);
    }
});

// Update window size
ipcMain.handle("update-window-size", (event, width, height) => {
    if (widgetWindow && !widgetWindow.isDestroyed()) {
        widgetWindow.setSize(width, height);
    }
});

// Toggle auto-show widget
ipcMain.handle("toggle-auto-show-widget", async (event, enabled) => {
    store.set("autoShowWidget", enabled);
});

// Get auto-show widget status
ipcMain.handle("get-auto-show-widget", () =>
    store.get("autoShowWidget", false)
);

// Save widget enabled state
ipcMain.handle("save-widget-enabled", (event, enabled) => {
    store.set("widgetEnabled", enabled);
});

// Open main app from widget
ipcMain.handle("open-main-app", () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.show();
        mainWindow.focus();
    } else {
        createWindows();
    }
});
```

### Helper Functions

#### Byte Formatting: `src/renderer.js`

```javascript
function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}
```

#### Date Formatting: `main.js`

```javascript
function getLocalDateKey() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}
```

#### Connection Time Formatting: `src/renderer.js`

```javascript
function formatConnectionTime(firstSeen, lastSeen) {
    const duration = lastSeen - firstSeen;
    const hours = Math.floor(duration / (1000 * 60 * 60));
    const minutes = Math.floor((duration % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
        return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
}
```

---

## Copyright & License

**Copyright © 2025 Pankoj Roy**

All rights reserved.

---

## Support

For issues, feature requests, or contributions, please visit the [GitHub repository](https://github.com/Uchiha-Itachi001/Data_Tracker).

---

## 📚 Related Documentation

- **[📖 README](README.md)** - Project overview, features, and quick start guide
- **[🔨 Build Guide](BUILD_GUIDE.md)** - Comprehensive guide for building, developing, and distributing the application

---

**Built with ❤️ by Pankoj Roy**
