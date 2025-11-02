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
  toggleAutoShowWidget: (enabled) =>
    ipcRenderer.invoke("toggle-auto-show-widget", enabled),
  saveWidgetEnabled: (enabled) =>
    ipcRenderer.invoke("save-widget-enabled", enabled),
  getAutoShowWidget: () => ipcRenderer.invoke("get-auto-show-widget"),
  openMainApp: () => ipcRenderer.invoke("open-main-app"),
  // Auto-launch APIs
  getAutoLaunch: () => ipcRenderer.invoke("get-auto-launch"),
  toggleAutoLaunch: (enabled) =>
    ipcRenderer.invoke("toggle-auto-launch", enabled),
  onNetworkUpdate: (cb) => {
    ipcRenderer.on("network-update", (event, payload) => cb(payload));
  },
  onWidgetStyleUpdate: (cb) => {
    ipcRenderer.on("update-widget-style", (event, settings) => cb(settings));
  },
});
