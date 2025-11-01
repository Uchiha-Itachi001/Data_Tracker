const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  getDailyData: () => ipcRenderer.invoke("get-daily-data"),
  getStorePath: () => ipcRenderer.invoke("get-store-path"),
  getNetworkInfo: () => ipcRenderer.invoke("get-network-info"),
  getConnectedDevices: () => ipcRenderer.invoke("get-connected-devices"),
  toggleWidget: (enabled) => ipcRenderer.invoke("toggle-widget", enabled),
  resetData: () => ipcRenderer.invoke("reset-data"),
  updateWidgetSettings: (settings) =>
    ipcRenderer.invoke("update-widget-settings", settings),
  updateWindowSize: (width, height) =>
    ipcRenderer.invoke("update-window-size", width, height),
  // toggleAutoStart: (enabled) => ipcRenderer.invoke("toggle-auto-start", enabled), // Removed
  toggleAutoShowWidget: (enabled) =>
    ipcRenderer.invoke("toggle-auto-show-widget", enabled),
  saveWidgetEnabled: (enabled) =>
    ipcRenderer.invoke("save-widget-enabled", enabled),
  // getAutoStart: () => ipcRenderer.invoke("get-auto-start"), // Removed
  getAutoShowWidget: () => ipcRenderer.invoke("get-auto-show-widget"),
  onNetworkUpdate: (cb) => {
    ipcRenderer.on("network-update", (event, payload) => cb(payload));
  },
  onWidgetStyleUpdate: (cb) => {
    ipcRenderer.on("update-widget-style", (event, settings) => cb(settings));
  },
});
