const {
  app,
  BrowserWindow,
  Tray,
  Menu,
  ipcMain,
  nativeImage,
  shell,
} = require("electron");
const path = require("path");
const fs = require("fs");
const si = require("systeminformation");
const Store = require("electron-store");
const { exec } = require("child_process");

const store = new Store({ name: "data-tracker-store" });

// Auto-launch configuration for Windows
const AutoLaunch = require("auto-launch");
const autoLauncher = new AutoLaunch({
  name: "DataTracker",
  path: app.getPath("exe"),
});

// Track current network connection for uptime calculation
let currentNetworkState = {
  interface: null,
  ssid: null,
  connectionStartTime: null,
  lastUpdateTime: Date.now(),
};

// Helper function to get local date in YYYY-MM-DD format
function getLocalDateKey() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

let mainWindow;
let widgetWindow;
let tray;

// Flag to track if app is quitting
app.isQuitting = false;

// Single instance lock - prevent multiple app instances
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
    } else {
      // If main window was destroyed, create it again
      createWindows();
    }
  });
}

// Disable disk cache to prevent "Access is denied" errors
app.commandLine.appendSwitch("disable-http-cache");
app.commandLine.appendSwitch("disable-gpu-shader-disk-cache");

const DATA_FILE_DIR = path.join(app.getPath("userData"), "data");
const DATA_FILE = path.join(DATA_FILE_DIR, "daily.json");

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
    // Return empty object on error to prevent data loss
    return {};
  }
}

function writeData(obj) {
  ensureDataFile();
  try {
    // Validate that we're writing an object
    if (typeof obj !== "object" || obj === null) {
      console.error("Attempted to write invalid data structure:", obj);
      return;
    }
    // Create backup of existing data before writing
    const backupPath = DATA_FILE + ".backup";
    if (fs.existsSync(DATA_FILE)) {
      fs.copyFileSync(DATA_FILE, backupPath);
    }
    fs.writeFileSync(DATA_FILE, JSON.stringify(obj, null, 2), "utf8");
    console.log(
      `Data saved successfully with ${Object.keys(obj).length} entries`
    );
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

async function createWindows() {
  mainWindow = new BrowserWindow({
    width: 820,
    height: 600,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
    },
  });

  // Remove menu bar completely to prevent access to dev tools
  mainWindow.setMenu(null);

  // Clear cache to prevent access errors
  await mainWindow.webContents.session.clearCache();

  mainWindow.loadFile(path.join(__dirname, "src", "index.html"));

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

  // Handle main window close event - hide to tray
  mainWindow.on("close", (event) => {
    if (!app.isQuitting) {
      event.preventDefault();
      mainWindow.hide();
      // Remove from taskbar when hidden
      mainWindow.setSkipTaskbar(true);
    }
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  // When user clicks taskbar icon while window is hidden, show it
  mainWindow.on("show", () => {
    // Restore to taskbar when shown
    mainWindow.setSkipTaskbar(false);
    mainWindow.focus();
  });

  // Handle taskbar icon click on Windows - restore from hidden state
  mainWindow.on("restore", () => {
    mainWindow.show();
    mainWindow.focus();
  });

  createWidgetWindow();
}

function createWidgetWindow() {
  // Prevent multiple widget windows
  if (widgetWindow && !widgetWindow.isDestroyed()) {
    return; // Widget already exists
  }

  widgetWindow = new BrowserWindow({
    width: 180,
    height: 60,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: false,
    skipTaskbar: true, // Changed to true to hide from taskbar
    type: "toolbar", // Special window type that stays above most windows
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
    },
  });

  // Remove menu bar from widget too
  widgetWindow.setMenu(null);

  // Set the window to always be on top with screen-saver level
  // This ensures it stays above fullscreen windows
  widgetWindow.setAlwaysOnTop(true, "screen-saver");

  // Make it visible on all workspaces (Windows virtual desktops)
  widgetWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

  widgetWindow.loadFile(path.join(__dirname, "src", "widget.html"));

  // Open external links in default browser for widget too
  widgetWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  widgetWindow.webContents.on("will-navigate", (event, url) => {
    if (url !== widgetWindow.webContents.getURL()) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });

  // Handle widget window close event - but don't set to null to prevent closing
  widgetWindow.on("close", (event) => {
    // Prevent widget from closing when main window closes
    // Only hide it instead, unless app is quitting
    if (!app.isQuitting) {
      event.preventDefault();
      widgetWindow.hide();
      // Disable widget in store when user closes it
      store.set("widgetEnabled", false);
    }
  });

  // Re-assert always on top when window loses focus
  widgetWindow.on("blur", () => {
    if (widgetWindow && !widgetWindow.isDestroyed()) {
      widgetWindow.setAlwaysOnTop(true, "screen-saver");
    }
  });

  // Ensure widget stays on top periodically (every 2 seconds)
  // This helps maintain top position even when fullscreen apps are launched
  setInterval(() => {
    if (
      widgetWindow &&
      !widgetWindow.isDestroyed() &&
      widgetWindow.isVisible()
    ) {
      widgetWindow.setAlwaysOnTop(true, "screen-saver");
      widgetWindow.moveTop();
    }
  }, 2000);

  // Show widget if auto-show is enabled OR widget is manually enabled
  const autoShow = store.get("autoShowWidget", false);
  const widgetEnabled = store.get("widgetEnabled", false);

  if (autoShow || widgetEnabled) {
    widgetWindow.show();
  } else {
    // start hidden by default
    widgetWindow.hide();
  }
}

function createTray() {
  const iconPath = path.join(__dirname, "assets", "tray.png");
  const image = fs.existsSync(iconPath)
    ? nativeImage.createFromPath(iconPath)
    : null;
  tray = new Tray(image || nativeImage.createEmpty());
  const ctx = Menu.buildFromTemplate([
    {
      label: "Show App",
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
      label: "Toggle Widget",
      click: () => {
        if (widgetWindow && !widgetWindow.isDestroyed()) {
          if (widgetWindow.isVisible()) {
            widgetWindow.hide();
          } else {
            widgetWindow.setAlwaysOnTop(true, "screen-saver");
            widgetWindow.moveTop();
            widgetWindow.show();
          }
        }
      },
    },
    { type: "separator" },
    {
      label: "Quit",
      click: () => {
        app.isQuitting = true;
        app.quit();
      },
    },
  ]);
  tray.setToolTip("Data Tracker");
  tray.setContextMenu(ctx);

  // Double-click tray icon to show main window
  tray.on("double-click", () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.show();
      mainWindow.focus();
    } else {
      createWindows();
    }
  });
}

// track previous counter to compute speeds
let prevStats = null;

async function monitorNetwork() {
  try {
    console.log("Starting network monitor...");
    const stats = await si.networkStats();
    console.log("Network stats:", stats);
    // sum across interfaces
    let totalRx = 0;
    let totalTx = 0;
    stats.forEach((s) => {
      // rx_bytes (received/download) and tx_bytes (transmitted/upload)
      totalRx += s.rx_bytes || 0;
      totalTx += s.tx_bytes || 0;
    });
    console.log("Total RX bytes:", totalRx, "Total TX bytes:", totalTx);

    const now = Date.now();
    let downloadSpeed = 0;
    let uploadSpeed = 0;

    if (
      prevStats &&
      typeof prevStats.rx === "number" &&
      typeof prevStats.tx === "number"
    ) {
      const deltaRxBytes = totalRx - prevStats.rx;
      const deltaTxBytes = totalTx - prevStats.tx;
      const deltaSec = Math.max(1, (now - prevStats.time) / 1000);
      downloadSpeed = Math.max(0, Math.round(deltaRxBytes / deltaSec)); // download bytes/sec
      uploadSpeed = Math.max(0, Math.round(deltaTxBytes / deltaSec)); // upload bytes/sec
    }

    // Total speed for backward compatibility
    const speed = downloadSpeed + uploadSpeed;

    prevStats = { rx: totalRx, tx: totalTx, time: now };

    // update daily aggregate
    const dateKey = getLocalDateKey();
    const data = readData();
    const originalKeys = Object.keys(data); // Track original entries

    data[dateKey] = data[dateKey] || {
      rx_tx_bytes: 0,
      rx_bytes: 0,
      tx_bytes: 0,
      last_rx: totalRx,
      last_tx: totalTx,
      networks: {}, // Store network-specific data
    };

    // Get current network info for tracking
    let currentNetworkName = null;
    let currentInterface = "N/A";
    try {
      const interfaces = await si.networkInterfaces();
      const defaultInterface =
        interfaces.find((iface) => iface.default) || interfaces[0];
      if (defaultInterface) {
        currentInterface = defaultInterface.iface || "N/A";

        // Try to get WiFi network name
        try {
          const wifiConnections = await si.wifiConnections();
          const activeWifi = wifiConnections.find(
            (conn) => conn.iface === defaultInterface.iface && conn.ssid
          );
          if (activeWifi && activeWifi.ssid) {
            currentNetworkName = activeWifi.ssid;
          }
        } catch (wifiErr) {
          console.log("WiFi info not available:", wifiErr.message);
        }
      }
    } catch (err) {
      console.warn("Could not get current network info:", err.message);
    }

    // Don't track empty, "Unknown", or "N/A" networks
    if (
      !currentNetworkName ||
      currentNetworkName === "Unknown" ||
      currentNetworkName === "N/A"
    ) {
      currentNetworkName = null;
    }

    console.log(
      "Tracking network:",
      currentNetworkName,
      "on interface:",
      currentInterface
    );

    // compute increase since last snapshots
    const lastRx = data[dateKey].last_rx || totalRx;
    const lastTx = data[dateKey].last_tx || totalTx;
    const incRx = Math.max(0, totalRx - lastRx);
    const incTx = Math.max(0, totalTx - lastTx);
    const incTotal = incRx + incTx;

    data[dateKey].rx_tx_bytes = (data[dateKey].rx_tx_bytes || 0) + incTotal;
    data[dateKey].rx_bytes = (data[dateKey].rx_bytes || 0) + incRx;
    data[dateKey].tx_bytes = (data[dateKey].tx_bytes || 0) + incTx;
    data[dateKey].last_rx = totalRx;
    data[dateKey].last_tx = totalTx;

    // Initialize networks object if it doesn't exist
    if (!data[dateKey].networks) {
      data[dateKey].networks = {};
    }

    // Track network-specific usage (only if we have a valid network name)
    if (currentNetworkName) {
      if (!data[dateKey].networks[currentNetworkName]) {
        data[dateKey].networks[currentNetworkName] = {
          interface: currentInterface,
          rx_tx_bytes: 0,
          rx_bytes: 0,
          tx_bytes: 0,
          firstSeen: now,
          lastSeen: now,
        };
      }

      // Update this network's usage
      data[dateKey].networks[currentNetworkName].rx_tx_bytes += incTotal;
      data[dateKey].networks[currentNetworkName].rx_bytes += incRx;
      data[dateKey].networks[currentNetworkName].tx_bytes += incTx;
      data[dateKey].networks[currentNetworkName].lastSeen = now;
      data[dateKey].networks[currentNetworkName].interface = currentInterface;
    }

    writeData(data);

    // Verify data integrity
    const savedData = readData();
    const savedKeys = Object.keys(savedData);
    if (savedKeys.length < originalKeys.length) {
      console.warn(
        `Data loss detected! Original entries: ${originalKeys.length}, Saved entries: ${savedKeys.length}`
      );
    }

    console.log("Data updated for", dateKey, data[dateKey]);

    // Broadcast to renderer + widget
    const payload = {
      speedBytesPerSec: speed,
      downloadSpeedBytesPerSec: downloadSpeed,
      uploadSpeedBytesPerSec: uploadSpeed,
      daily: data,
      timestamp: now,
    };

    if (mainWindow && !mainWindow.isDestroyed())
      mainWindow.webContents.send("network-update", payload);
    if (widgetWindow && !widgetWindow.isDestroyed())
      widgetWindow.webContents.send("network-update", payload);
    console.log("Payload sent");
  } catch (e) {
    console.error("monitorNetwork error", e);
  }
}

app.whenReady().then(async () => {
  ensureDataFile();
  await createWindows();
  createTray();

  // Auto-launch disabled to prevent Task Manager issues
  // const autoStart = store.get("autoStart", false);
  // if (autoStart && isPackaged) {
  //   autoLauncher.enable();
  // }

  // start monitor every 1s
  setInterval(monitorNetwork, 1000);

  app.on("activate", () => {
    if (!mainWindow || mainWindow.isDestroyed()) {
      createWindows();
    } else {
      mainWindow.show();
    }
  });
});

app.on("before-quit", () => {
  app.isQuitting = true;
});

app.on("window-all-closed", () => {
  // Keep app running in tray, don't quit when all windows are closed
  // This allows the app to stay in the system tray
});

ipcMain.handle("get-daily-data", () => {
  const data = readData();
  // Ensure we return a valid object
  if (typeof data !== "object" || data === null) {
    console.warn(
      "get-daily-data: Invalid data structure, returning empty object"
    );
    return {};
  }
  console.log(`Returning ${Object.keys(data).length} data entries`);
  return data;
});

ipcMain.handle("get-store-path", () => {
  return { dataFile: DATA_FILE, userData: app.getPath("userData") };
});

ipcMain.handle("get-network-info", async () => {
  try {
    const interfaces = await si.networkInterfaces();
    const defaultInterface =
      interfaces.find((iface) => iface.default) || interfaces[0];

    if (defaultInterface) {
      // Get WiFi connection info for network name and signal strength
      let wifiInfo = null;
      try {
        const wifiConnections = await si.wifiConnections();
        wifiInfo = wifiConnections.find(
          (conn) => conn.iface === defaultInterface.iface
        );
      } catch (wifiError) {
        console.log("WiFi info not available:", wifiError.message);
      }

      // Get network stats for link speed
      let networkStats = null;
      try {
        const stats = await si.networkStats();
        networkStats = stats.find(
          (stat) => stat.iface === defaultInterface.iface
        );
      } catch (statsError) {
        console.log("Network stats not available:", statsError.message);
      }

      // Check if network has changed
      const currentInterface = defaultInterface.iface;
      const currentSsid = wifiInfo ? wifiInfo.ssid : null;
      const now = Date.now();

      // Detect network change
      if (
        currentNetworkState.interface !== currentInterface ||
        currentNetworkState.ssid !== currentSsid
      ) {
        // Network changed, reset connection start time
        currentNetworkState = {
          interface: currentInterface,
          ssid: currentSsid,
          connectionStartTime: now,
          lastUpdateTime: now,
        };
        console.log(
          "Network changed, resetting uptime:",
          currentInterface,
          currentSsid
        );
      } else {
        // Same network, update last update time
        currentNetworkState.lastUpdateTime = now;
      }

      // Format interface name
      let interfaceDisplay = defaultInterface.iface;
      if (wifiInfo && wifiInfo.frequency) {
        const freq = wifiInfo.frequency;
        if (freq >= 5000) {
          interfaceDisplay = `${defaultInterface.iface} (5GHz)`;
        } else if (freq >= 2400) {
          interfaceDisplay = `${defaultInterface.iface} (2.4GHz)`;
        }
      }

      // Format signal strength - convert dBm to percentage
      let signalStrength = "N/A";
      if (wifiInfo && wifiInfo.signalLevel !== undefined) {
        let signalDbm = wifiInfo.signalLevel;

        // If signal is already positive (percentage), use as is
        // If negative (dBm), convert to percentage
        let signalPercent;
        if (signalDbm > 0) {
          // Already a percentage
          signalPercent = Math.min(100, Math.max(0, signalDbm));
        } else {
          // Convert dBm to percentage (dBm range: -100 to -30)
          // -30 dBm = 100%, -100 dBm = 0%
          signalPercent = Math.min(
            100,
            Math.max(0, ((signalDbm + 100) / 70) * 100)
          );
        }

        let quality = "Poor";
        if (signalPercent >= 75) quality = "Very Good";
        else if (signalPercent >= 50) quality = "Good";
        signalStrength = `${Math.round(signalPercent)}% (${quality})`;
      }

      // Format link speed
      let linkSpeed = "N/A";
      if (networkStats && networkStats.ms !== undefined) {
        // Calculate approximate link speed based on response time
        const responseTime = networkStats.ms;
        if (responseTime < 10) linkSpeed = "100+ Mbps";
        else if (responseTime < 50) linkSpeed = "50-100 Mbps";
        else if (responseTime < 100) linkSpeed = "10-50 Mbps";
        else if (responseTime < 500) linkSpeed = "1-10 Mbps";
        else linkSpeed = "< 1 Mbps";
      }

      // Calculate actual network connection uptime
      let uptime = "N/A";
      if (currentNetworkState.connectionStartTime) {
        const connectionTimeMs = now - currentNetworkState.connectionStartTime;
        const hours = Math.floor(connectionTimeMs / (1000 * 60 * 60));
        const minutes = Math.floor(
          (connectionTimeMs % (1000 * 60 * 60)) / (1000 * 60)
        );
        const seconds = Math.floor((connectionTimeMs % (1000 * 60)) / 1000);

        // Format uptime with hours, minutes, and seconds
        if (hours > 0) {
          uptime = `${hours}h ${minutes}m ${seconds}s`;
        } else if (minutes > 0) {
          uptime = `${minutes}m ${seconds}s`;
        } else {
          uptime = `${seconds}s`;
        }
      }

      return {
        interface: interfaceDisplay,
        networkName: wifiInfo ? wifiInfo.ssid || "N/A" : "N/A",
        signalStrength: signalStrength,
        linkSpeed: linkSpeed,
        uptime: uptime,
      };
    }
    return null;
  } catch (error) {
    console.error("Failed to get network info:", error);
    return null;
  }
});

ipcMain.handle("get-connected-devices", async () => {
  return new Promise((resolve) => {
    // Execute arp -a command to get connected devices
    exec("arp -a", (error, stdout, stderr) => {
      if (error) {
        console.error("Error executing arp command:", error);
        resolve([]);
        return;
      }

      try {
        const devices = [];
        const lines = stdout.split("\n");

        for (const line of lines) {
          // Parse ARP table output
          // Format: Interface: IP Address Physical Address Type
          const arpRegex = /(\d+\.\d+\.\d+\.\d+)\s+([0-9a-f\-]+)\s+(\w+)/i;
          const match = line.match(arpRegex);

          if (match) {
            const [, ip, mac, type] = match;

            // Skip broadcast and multicast addresses
            if (
              ip.startsWith("255.") ||
              ip.startsWith("224.") ||
              ip.startsWith("239.")
            ) {
              continue;
            }

            // Generate a simple device name based on IP
            let deviceName = `Device ${ip.split(".").pop()}`;
            let deviceType = "Unknown";
            let icon = "monitor";

            // Try to identify device type based on MAC address
            const macLower = mac.toLowerCase();
            if (
              macLower.includes("apple") ||
              macLower.startsWith("ac:bc:32") ||
              macLower.startsWith("8c:85:90")
            ) {
              deviceType = "Apple Device";
              icon = "smartphone";
            } else if (
              macLower.includes("samsung") ||
              macLower.startsWith("00:15:99")
            ) {
              deviceType = "Samsung Device";
              icon = "smartphone";
            } else if (
              macLower.includes("huawei") ||
              macLower.startsWith("00:9a:cd")
            ) {
              deviceType = "Huawei Device";
              icon = "smartphone";
            } else if (
              macLower.includes("router") ||
              macLower.startsWith("00:0c:29")
            ) {
              deviceType = "Router";
              icon = "router";
            } else if (
              macLower.includes("computer") ||
              macLower.includes("desktop")
            ) {
              deviceType = "Computer";
              icon = "monitor";
            } else if (macLower.includes("laptop")) {
              deviceType = "Laptop";
              icon = "laptop";
            } else if (macLower.includes("tv") || macLower.includes("smart")) {
              deviceType = "Smart TV";
              icon = "tv";
            } else {
              // Try to identify by MAC prefix
              const macPrefix = macLower.substring(0, 8);
              if (["00:50:56", "08:00:27", "52:54:00"].includes(macPrefix)) {
                deviceType = "Virtual Machine";
                icon = "server";
              } else if (
                ["dc:a6:32", "38:2d:e8", "b8:27:eb"].includes(macPrefix)
              ) {
                deviceType = "Raspberry Pi";
                icon = "cpu";
              }
            }

            // Determine connection type (simplified)
            const connectionType = type === "dynamic" ? "Wi-Fi" : "Ethernet";

            devices.push({
              name: deviceName,
              ip: ip,
              mac: mac.toUpperCase(),
              type: deviceType,
              connectionType: connectionType,
              icon: icon,
              lastSeen: new Date().toISOString(),
              dataUsed: Math.floor(Math.random() * 500) + " MB", // Placeholder
            });
          }
        }

        // Sort devices by IP address for consistent ordering
        devices.sort((a, b) => {
          const aParts = a.ip.split(".").map(Number);
          const bParts = b.ip.split(".").map(Number);
          for (let i = 0; i < 4; i++) {
            if (aParts[i] !== bParts[i]) {
              return aParts[i] - bParts[i];
            }
          }
          return 0;
        });

        resolve(devices);
      } catch (parseError) {
        console.error("Error parsing ARP output:", parseError);
        resolve([]);
      }
    });
  });
});

ipcMain.handle("toggle-widget", (event, enabled) => {
  if (enabled) {
    if (!widgetWindow || widgetWindow.isDestroyed()) {
      createWidgetWindow();
    } else {
      widgetWindow.setAlwaysOnTop(true, "screen-saver");
      widgetWindow.moveTop();
      widgetWindow.show();
    }
  } else {
    if (widgetWindow && !widgetWindow.isDestroyed()) {
      widgetWindow.hide();
    }
  }
});

ipcMain.handle("save-widget-enabled", (event, enabled) => {
  store.set("widgetEnabled", enabled);
});

ipcMain.handle("open-main-app", () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.show();
    mainWindow.focus();
  } else {
    createWindows();
  }
});

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

ipcMain.handle("update-widget-settings", (event, settings) => {
  if (widgetWindow && !widgetWindow.isDestroyed()) {
    // Send settings to widget window
    widgetWindow.webContents.send("update-widget-style", settings);
  }
});

ipcMain.handle("update-window-size", (event, width, height) => {
  if (widgetWindow && !widgetWindow.isDestroyed()) {
    widgetWindow.setSize(width, height);
  }
});

ipcMain.handle("toggle-auto-show-widget", async (event, enabled) => {
  store.set("autoShowWidget", enabled);
});

ipcMain.handle("get-auto-show-widget", () =>
  store.get("autoShowWidget", false)
);

// Auto-launch IPC handlers
ipcMain.handle("get-auto-launch", async () => {
  try {
    const isEnabled = await autoLauncher.isEnabled();
    return isEnabled;
  } catch (error) {
    console.error("Error checking auto-launch status:", error);
    return false;
  }
});

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
