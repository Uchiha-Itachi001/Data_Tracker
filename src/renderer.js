const $ = (sel) => document.querySelector(sel);

const todayUsageEl = document.getElementById("today-usage");
const currentSpeedEl = document.getElementById("current-speed");
const monthUsageEl = document.getElementById("month-usage");
const usageHistoryEl = document.getElementById("usage-history");
const unitSelector = document.getElementById("unit-selector");
const widgetEnable = document.getElementById("widget-enable");
// const autoStartEnable = document.getElementById("auto-start-enable"); // Removed
const autoShowWidget = document.getElementById("auto-show-widget");
const networkInterfaceEl = document.getElementById("network-interface");
const networkNameEl = document.getElementById("network-name");
const signalStrengthEl = document.getElementById("signal-strength");
const linkSpeedEl = document.getElementById("link-speed");
const connectionUptimeEl = document.getElementById("connection-uptime");

// Used networks elements
const networkListEl = document.getElementById("network-list");

// View toggle elements
const listViewBtn = document.getElementById("list-view-btn");
const gridViewBtn = document.getElementById("grid-view-btn");

// View state
let currentView = "grid"; // "grid" or "list"

// Helper function to get local date in YYYY-MM-DD format (for storage)
function getLocalDateKey() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// Helper function to format date for display (DD/MM/YYYY or "Today")
function formatDateForDisplay(dateString) {
  const today = getLocalDateKey();
  if (dateString === today) {
    return "Today";
  }

  const [year, month, day] = dateString.split("-");
  return `${day}/${month}/${year}`;
}

// Helper function to get month name and year
function getMonthYear(dateString) {
  const [year, month] = dateString.split("-");
  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  return `${monthNames[parseInt(month) - 1]} ${year}`;
}

function bytesToHuman(b, unit = "auto") {
  if (b === undefined || b === null) return "--";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let v = b;
  let i = 0;
  if (unit === "auto") {
    // Auto choose between MB and GB
    if (b < 1024 * 1024 * 1024) {
      // < 1 GB
      v = b / (1024 * 1024);
      i = 2; // MB
    } else {
      v = b / (1024 * 1024 * 1024);
      i = 3; // GB
    }
  } else if (unit === "MB") {
    v /= 1024 * 1024;
    i = 2;
  } else if (unit === "GB") {
    v /= 1024 * 1024 * 1024;
    i = 3;
  } else {
    while (v >= 1024 && i < units.length - 1) {
      v /= 1024;
      i++;
    }
  }
  return `${v.toFixed(v >= 100 ? 0 : v >= 10 ? 1 : 2)} ${units[i]}`;
}

function speedToHuman(bytesPerSec) {
  if (bytesPerSec === undefined || bytesPerSec === null) return "--";
  let value = bytesPerSec;
  let unit = "B/s";

  if (bytesPerSec >= 1024 * 1024) {
    // >= 1 MB/s
    value = bytesPerSec / (1024 * 1024);
    unit = "MB/s";
  } else if (bytesPerSec >= 1024) {
    // >= 1 KB/s
    value = bytesPerSec / 1024;
    unit = "KB/s";
  } else {
    // < 1 KB/s
    unit = "B/s";
  }

  return `${value.toFixed(value >= 100 ? 0 : value >= 10 ? 1 : 2)} ${unit}`;
}

// Function to render list/table view
function renderListView(data, selectedUnit) {
  usageHistoryEl.innerHTML = "";

  // Create table structure
  const tableContainer = document.createElement("div");
  tableContainer.className = "overflow-x-auto";
  tableContainer.innerHTML = `
    <table class="w-full">
      <thead class="bg-slate-50 dark:bg-slate-700/50">
        <tr>
          <th class="px-6 py-4 text-center text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Date</th>
          <th class="px-6 py-4 text-center text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Usage</th>
          <th class="px-6 py-4 text-center text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider hidden md:table-cell">Network</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-slate-200 dark:divide-slate-700" id="usage-table-body">
        <!-- Data will be populated here -->
      </tbody>
    </table>
  `;

  usageHistoryEl.appendChild(tableContainer);

  const tableBody = document.getElementById("usage-table-body");
  const entries = Object.entries(data).sort((a, b) => b[0].localeCompare(a[0]));

  entries.forEach(([date, obj]) => {
    const row = document.createElement("tr");
    row.className =
      "border-b border-gray-200 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors duration-150";
    row.innerHTML = `
      <td class="px-4 py-4 text-sm text-gray-900 text-center">${formatDateForDisplay(
        date
      )}</td>
      <td class="px-4 py-4 text-sm text-gray-900 text-center font-medium">${bytesToHuman(
        obj.rx_tx_bytes || 0,
        selectedUnit
      )}</td>
      <td class="px-4 py-4 text-sm text-gray-900 hidden md:table-cell text-center">
        <div class="flex items-center justify-center h-full">
          <i data-feather="wifi" class="w-4 h-4 text-blue-500"></i>
        </div>
      </td>
    `;
    tableBody.appendChild(row);
  });

  // Re-initialize Feather icons
  feather.replace();
}

// Function to render grid/card view
function renderGridView(data, selectedUnit, today) {
  // Group data by month and create month sections
  const monthlyData = {};
  Object.entries(data).forEach(([date, obj]) => {
    const monthKey = date.substring(0, 7); // YYYY-MM
    if (!monthlyData[monthKey]) {
      monthlyData[monthKey] = [];
    }
    monthlyData[monthKey].push({ date, ...obj });
  });

  // Sort months in descending order (newest first)
  const sortedMonths = Object.keys(monthlyData).sort((a, b) =>
    b.localeCompare(a)
  );

  // Create the new UI structure
  usageHistoryEl.innerHTML = "";

  sortedMonths.forEach((monthKey) => {
    const monthEntries = monthlyData[monthKey].sort((a, b) =>
      b.date.localeCompare(a.date)
    );
    const monthName = getMonthYear(monthKey);

    // Create month header
    const monthHeader = document.createElement("div");
    monthHeader.className = "mb-6";
    monthHeader.innerHTML = `
      <div class="flex items-center mb-4">
        <div class="h-px bg-gradient-to-r from-slate-300 to-slate-600 dark:from-slate-600 dark:to-slate-400 flex-1"></div>
        <h3 class="px-4 text-lg font-semibold text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-800 rounded-full py-1">
          ${monthName}
        </h3>
        <div class="h-px bg-gradient-to-l from-slate-300 to-slate-600 dark:from-slate-600 dark:to-slate-400 flex-1"></div>
      </div>
    `;

    // Create month container
    const monthContainer = document.createElement("div");
    monthContainer.className =
      "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8";

    monthEntries.forEach((entry) => {
      const isToday = entry.date === today;
      const card = document.createElement("div");
      card.className = `relative p-4 rounded-xl border transition-all duration-200 ${
        isToday
          ? "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700 shadow-lg shadow-blue-100 dark:shadow-blue-900/20"
          : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:shadow-md"
      }`;

      card.innerHTML = `
        <div class="flex items-center justify-between mb-3">
          <div class="flex items-center space-x-2">
            <div class="w-8 h-8 rounded-lg ${
              isToday ? "bg-blue-500" : "bg-slate-500"
            } flex items-center justify-center">
              <i data-feather="calendar" class="w-4 h-4 text-white"></i>
            </div>
            <span class="font-semibold text-slate-800 dark:text-slate-200 ${
              isToday ? "text-blue-600 dark:text-blue-400" : ""
            }">
              ${formatDateForDisplay(entry.date)}
            </span>
          </div>
          ${
            isToday
              ? '<span class="px-2 py-1 text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/50 rounded-full">Today</span>'
              : ""
          }
        </div>

        <div class="space-y-2">
          <div class="flex items-center justify-between">
            <span class="text-sm text-slate-600 dark:text-slate-400">Data Used</span>
            <span class="font-mono font-semibold text-slate-800 dark:text-slate-200">
              ${bytesToHuman(entry.rx_tx_bytes || 0, selectedUnit)}
            </span>
          </div>

          <div class="flex items-center justify-between">
            <span class="text-sm text-slate-600 dark:text-slate-400">Download</span>
            <span class="text-sm font-mono text-green-600 dark:text-green-400">
              ${bytesToHuman(entry.rx_bytes || 0, selectedUnit)}
            </span>
          </div>

          <div class="flex items-center justify-between">
            <span class="text-sm text-slate-600 dark:text-slate-400">Upload</span>
            <span class="text-sm font-mono text-blue-600 dark:text-blue-400">
              ${bytesToHuman(entry.tx_bytes || 0, selectedUnit)}
            </span>
          </div>
        </div>

        <div class="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
          <div class="flex items-center justify-center">
            <i data-feather="wifi" class="w-4 h-4 text-slate-400 mr-2"></i>
            <span class="text-xs text-slate-500 dark:text-slate-400">Network Activity</span>
          </div>
        </div>
      `;

      monthContainer.appendChild(card);
    });

    usageHistoryEl.appendChild(monthHeader);
    usageHistoryEl.appendChild(monthContainer);
  });

  // Re-initialize Feather icons
  feather.replace();
}

async function refreshUI() {
  const data = await window.electronAPI.getDailyData();
  const today = getLocalDateKey();
  const selectedUnit = unitSelector.value;

  // Today's usage
  const todayData = data[today] || { rx_tx_bytes: 0 };
  todayUsageEl.textContent = bytesToHuman(todayData.rx_tx_bytes, selectedUnit);

  // Monthly usage (current month)
  const currentMonth = today.substring(0, 7);
  let monthTotal = 0;
  Object.keys(data).forEach((date) => {
    if (date.startsWith(currentMonth)) {
      monthTotal += data[date].rx_tx_bytes || 0;
    }
  });
  monthUsageEl.textContent = bytesToHuman(monthTotal, selectedUnit);

  // Render based on current view
  if (currentView === "list") {
    renderListView(data, selectedUnit);
  } else {
    renderGridView(data, selectedUnit, today);
  }
}

async function loadNetworkInfo() {
  try {
    const networkInfo = await window.electronAPI.getNetworkInfo();
    if (networkInfo) {
      networkInterfaceEl.textContent = networkInfo.interface || "Detecting...";
      networkNameEl.textContent = networkInfo.networkName || "Detecting...";
      signalStrengthEl.textContent =
        networkInfo.signalStrength || "Detecting...";
      linkSpeedEl.textContent = networkInfo.linkSpeed || "Detecting...";
      connectionUptimeEl.textContent = networkInfo.uptime || "Detecting...";
    }
  } catch (error) {
    console.error("Failed to load network info:", error);
    // Set loading state on error
    networkInterfaceEl.textContent = "Detecting...";
    networkNameEl.textContent = "Detecting...";
    signalStrengthEl.textContent = "Detecting...";
    linkSpeedEl.textContent = "Detecting...";
    connectionUptimeEl.textContent = "Detecting...";
  }
}

// Network monitoring for auto-updates
let lastNetworkState = null;
async function monitorNetwork() {
  try {
    const networkInfo = await window.electronAPI.getNetworkInfo();
    if (networkInfo) {
      // Check if network state has changed
      const currentState = {
        interface: networkInfo.interface,
        networkName: networkInfo.networkName,
        signalStrength: networkInfo.signalStrength,
      };

      const stateChanged =
        !lastNetworkState ||
        lastNetworkState.interface !== currentState.interface ||
        lastNetworkState.networkName !== currentState.networkName ||
        lastNetworkState.signalStrength !== currentState.signalStrength;

      if (stateChanged) {
        // Update UI with new network info
        networkInterfaceEl.textContent =
          networkInfo.interface || "Detecting...";
        networkNameEl.textContent = networkInfo.networkName || "Detecting...";
        signalStrengthEl.textContent =
          networkInfo.signalStrength || "Detecting...";
        linkSpeedEl.textContent = networkInfo.linkSpeed || "Detecting...";
        connectionUptimeEl.textContent = networkInfo.uptime || "Detecting...";

        lastNetworkState = currentState;
        console.log("Network info updated:", currentState);
      }
    }
  } catch (error) {
    console.error("Failed to monitor network:", error);
  }
}

// Start network monitoring (check every 30 seconds)
setInterval(monitorNetwork, 30000);

// Connected devices functionality
let lastDeviceCount = 0;

async function loadUsedNetworks() {
  try {
    // Get current network info
    const networkInfo = await window.electronAPI.getNetworkInfo();

    // Get today's usage data
    const data = await window.electronAPI.getDailyData();
    const today = getLocalDateKey();
    const todayData = data[today] || {
      rx_tx_bytes: 0,
      rx_bytes: 0,
      tx_bytes: 0,
    };

    // Clear existing network list
    networkListEl.innerHTML = "";

    if (!networkInfo || networkInfo.networkName === "N/A") {
      networkListEl.innerHTML = `
        <div class="text-center py-8 text-slate-400">
          <i data-feather="wifi-off" class="w-12 h-12 mx-auto mb-3 opacity-50"></i>
          <p class="text-sm">No network connected</p>
        </div>
      `;
      // Re-initialize Feather icons
      if (window.feather) {
        window.feather.replace();
      }
      return;
    }

    // Determine network type and icon
    let networkIcon = "wifi";
    let iconColor = "text-blue-400";
    let iconBgColor = "bg-blue-500/20";
    let networkType = "Wi-Fi";

    const interfaceName = (networkInfo.interface || "").toLowerCase();
    const networkName = (networkInfo.networkName || "").toLowerCase();

    // Check if it's a mobile hotspot
    if (
      networkName.includes("phone") ||
      networkName.includes("mobile") ||
      networkName.includes("hotspot") ||
      networkName.includes("iphone") ||
      networkName.includes("android") ||
      networkName.includes("samsung") ||
      networkName.includes("xiaomi") ||
      networkName.includes("oneplus")
    ) {
      networkIcon = "smartphone";
      iconColor = "text-purple-400";
      iconBgColor = "bg-purple-500/20";
      networkType = "Mobile Hotspot";
    }
    // Check if it's ethernet
    else if (
      interfaceName.includes("ethernet") ||
      interfaceName.includes("eth") ||
      interfaceName.includes("lan")
    ) {
      networkIcon = "hard-drive";
      iconColor = "text-green-400";
      iconBgColor = "bg-green-500/20";
      networkType = "Ethernet";
    }
    // Check if it's a router (typical router names)
    else if (
      networkName.includes("router") ||
      networkName.includes("tp-link") ||
      networkName.includes("dlink") ||
      networkName.includes("netgear") ||
      networkName.includes("asus") ||
      networkName.includes("linksys")
    ) {
      networkIcon = "wifi";
      iconColor = "text-cyan-400";
      iconBgColor = "bg-cyan-500/20";
      networkType = "Router";
    }
    // Check if it's PC shared network
    else if (
      networkName.includes("pc") ||
      networkName.includes("desktop") ||
      networkName.includes("laptop") ||
      networkName.includes("computer")
    ) {
      networkIcon = "monitor";
      iconColor = "text-orange-400";
      iconBgColor = "bg-orange-500/20";
      networkType = "PC Network";
    }

    // Calculate uptime in a readable format
    const uptimeText = networkInfo.uptime || "N/A";

    // Create network list tile
    const networkTile = document.createElement("div");
    networkTile.className =
      "p-4 rounded-xl bg-slate-700/50 border border-slate-600/50 hover:bg-slate-600/50 hover:border-slate-500/60 transition-all duration-300 cursor-pointer";

    networkTile.innerHTML = `
      <div class="flex items-center gap-3">
        <!-- Icon -->
        <div class="flex-shrink-0">
          <div class="p-3 ${iconBgColor} rounded-lg">
            <i data-feather="${networkIcon}" class="w-6 h-6 ${iconColor}"></i>
          </div>
        </div>
        
        <!-- Content -->
        <div class="flex-1 min-w-0">
          <div class="flex items-center justify-between mb-1">
            <h4 class="text-white font-semibold text-sm truncate">${
              networkInfo.networkName
            }</h4>
            <span class="text-green-400 text-xs font-medium ml-2">● Connected</span>
          </div>
          
          <div class="text-slate-400 text-xs mb-2">
            ${networkType} • ${networkInfo.interface || "N/A"}
          </div>
          
          <div class="flex items-center justify-between gap-4 text-xs">
            <div class="flex items-center gap-1">
              <i data-feather="database" class="w-3 h-3 text-slate-400"></i>
              <span class="text-slate-300 font-medium">${bytesToHuman(
                todayData.rx_tx_bytes,
                unitSelector.value
              )}</span>
            </div>
            <div class="flex items-center gap-1">
              <i data-feather="clock" class="w-3 h-3 text-slate-400"></i>
              <span class="text-slate-300 font-medium">${uptimeText}</span>
            </div>
          </div>
        </div>
      </div>
    `;

    networkListEl.appendChild(networkTile);

    // Re-initialize Feather icons
    if (window.feather) {
      window.feather.replace();
    }

    // Animate network tile
    networkTile.style.opacity = "0";
    networkTile.style.transform = "translateY(10px)";
    setTimeout(() => {
      networkTile.style.transition = "all 0.3s ease-out";
      networkTile.style.opacity = "1";
      networkTile.style.transform = "translateY(0)";
    }, 100);
  } catch (error) {
    console.error("Failed to load used networks:", error);
    networkListEl.innerHTML = `
      <div class="text-center py-8 text-red-400">
        <i data-feather="alert-circle" class="w-12 h-12 mx-auto mb-3 opacity-50"></i>
        <p class="text-sm">Failed to load network data</p>
      </div>
    `;
    // Re-initialize Feather icons
    if (window.feather) {
      window.feather.replace();
    }
  }
}

// Update used networks every 10 seconds
setInterval(loadUsedNetworks, 10000);

unitSelector.addEventListener("change", () => {
  // This will be handled in the refreshUI function
  refreshUI();
});

// Update widget customization section visibility
function updateCustomizationVisibility() {
  // No longer needed since customization moved to modal
  // Widget customization is always available via the modal button
}

widgetEnable.addEventListener("change", () => {
  window.electronAPI.toggleWidget(widgetEnable.checked);
  window.electronAPI.saveWidgetEnabled(widgetEnable.checked);
  localStorage.setItem("widgetEnabled", widgetEnable.checked.toString());
  // Removed updateCustomizationVisibility() call since customization moved to modal
});

// Auto-start event listener removed

autoShowWidget.addEventListener("change", () => {
  window.electronAPI.toggleAutoShowWidget(autoShowWidget.checked);
});

// View toggle event listeners
listViewBtn.addEventListener("click", () => {
  setView("list");
});

gridViewBtn.addEventListener("click", () => {
  setView("grid");
});

// Function to set the current view
function setView(view) {
  currentView = view;

  // Update button states
  if (view === "list") {
    listViewBtn.classList.add("text-slate-200", "bg-slate-600/50");
    listViewBtn.classList.remove("text-slate-400");
    gridViewBtn.classList.remove("text-slate-200", "bg-slate-600/50");
    gridViewBtn.classList.add("text-slate-400");
  } else {
    gridViewBtn.classList.add("text-slate-200", "bg-slate-600/50");
    gridViewBtn.classList.remove("text-slate-400");
    listViewBtn.classList.remove("text-slate-200", "bg-slate-600/50");
    listViewBtn.classList.add("text-slate-400");
  }

  // Refresh the UI with the new view
  refreshUI();
}

// Widget customization elements
const widgetWidth = document.getElementById("widget-width");
const widgetHeight = document.getElementById("widget-height");
const widgetBgColor = document.getElementById("widget-bg-color");
const widgetBgColorHex = document.getElementById("widget-bg-color-hex");
const widgetTextColor = document.getElementById("widget-text-color");
const widgetTextColorHex = document.getElementById("widget-text-color-hex");
const widgetOpacity = document.getElementById("widget-opacity");
const widgetFontSize = document.getElementById("widget-font-size");
const widgetResetDefault = document.getElementById("widget-reset-default");
const opacityValue = document.getElementById("opacity-value");

// Default widget settings
const defaultWidgetSettings = {
  width: 140,
  height: 50,
  bgColor: "#0f172a",
  textColor: "#f8fafc",
  opacity: 0.95,
  fontSize: 14,
};

// Load widget settings from localStorage
function loadWidgetSettings() {
  const settings = localStorage.getItem("widgetSettings");
  if (settings) {
    const parsed = JSON.parse(settings);
    widgetWidth.value = parsed.width || defaultWidgetSettings.width;
    widgetHeight.value = parsed.height || defaultWidgetSettings.height;
    widgetBgColor.value = parsed.bgColor || defaultWidgetSettings.bgColor;
    widgetBgColorHex.value = parsed.bgColor || defaultWidgetSettings.bgColor;
    widgetTextColor.value = parsed.textColor || defaultWidgetSettings.textColor;
    widgetTextColorHex.value =
      parsed.textColor || defaultWidgetSettings.textColor;
    widgetOpacity.value = parsed.opacity || defaultWidgetSettings.opacity;
    widgetFontSize.value = parsed.fontSize || defaultWidgetSettings.fontSize;
    updateOpacityDisplay();
    applyWidgetSettings();
  }

  // Load widget enable state
  const widgetEnabled = localStorage.getItem("widgetEnabled") === "true";
  widgetEnable.checked = widgetEnabled;
  updateCustomizationVisibility();
}

// Save widget settings to localStorage
function saveWidgetSettings() {
  const settings = {
    width: parseInt(widgetWidth.value),
    height: parseInt(widgetHeight.value),
    bgColor: widgetBgColor.value,
    textColor: widgetTextColor.value,
    opacity: parseFloat(widgetOpacity.value),
    fontSize: parseInt(widgetFontSize.value),
  };
  localStorage.setItem("widgetSettings", JSON.stringify(settings));
  applyWidgetSettings();
}

// Load app settings
async function loadAppSettings() {
  // Auto-start removed completely
  const autoShowEnabled = await window.electronAPI.getAutoShowWidget();
  autoShowWidget.checked = autoShowEnabled;

  // If auto-show widget is enabled, also enable the widget checkbox
  // because the widget is already running
  if (autoShowEnabled) {
    widgetEnable.checked = true;
    localStorage.setItem("widgetEnabled", "true");
    window.electronAPI.saveWidgetEnabled(true);
    updateCustomizationVisibility();
  }
}

// Apply widget settings
function applyWidgetSettings() {
  const settings = {
    width: parseInt(widgetWidth.value),
    height: parseInt(widgetHeight.value),
    bgColor: widgetBgColor.value,
    textColor: widgetTextColor.value,
    opacity: parseFloat(widgetOpacity.value),
    fontSize: parseInt(widgetFontSize.value),
  };
  window.electronAPI.updateWidgetSettings(settings);
}

// Update opacity display
function updateOpacityDisplay() {
  const percentage = Math.round(parseFloat(widgetOpacity.value) * 100);
  opacityValue.textContent = `${percentage}%`;
}

// Widget customization event listeners
widgetWidth.addEventListener("input", () => {
  saveWidgetSettings();
});

widgetHeight.addEventListener("input", () => {
  saveWidgetSettings();
});

widgetBgColor.addEventListener("input", () => {
  saveWidgetSettings();
});

widgetTextColor.addEventListener("input", () => {
  saveWidgetSettings();
});

widgetOpacity.addEventListener("input", () => {
  updateOpacityDisplay();
  saveWidgetSettings();
});

widgetFontSize.addEventListener("input", () => {
  saveWidgetSettings();
});

// Color sync event listeners
widgetBgColor.addEventListener("input", () => {
  widgetBgColorHex.value = widgetBgColor.value;
  saveWidgetSettings();
});

widgetBgColorHex.addEventListener("input", () => {
  // Validate hex color
  const hex = widgetBgColorHex.value;
  if (/^#[0-9A-F]{6}$/i.test(hex)) {
    widgetBgColor.value = hex;
    saveWidgetSettings();
  }
});

widgetTextColor.addEventListener("input", () => {
  widgetTextColorHex.value = widgetTextColor.value;
  saveWidgetSettings();
});

widgetTextColorHex.addEventListener("input", () => {
  // Validate hex color
  const hex = widgetTextColorHex.value;
  if (/^#[0-9A-F]{6}$/i.test(hex)) {
    widgetTextColor.value = hex;
    saveWidgetSettings();
  }
});

widgetResetDefault.addEventListener("click", () => {
  widgetWidth.value = defaultWidgetSettings.width;
  widgetHeight.value = defaultWidgetSettings.height;
  widgetBgColor.value = defaultWidgetSettings.bgColor;
  widgetBgColorHex.value = defaultWidgetSettings.bgColor;
  widgetTextColor.value = defaultWidgetSettings.textColor;
  widgetTextColorHex.value = defaultWidgetSettings.textColor;
  widgetOpacity.value = defaultWidgetSettings.opacity;
  widgetFontSize.value = defaultWidgetSettings.fontSize;
  updateOpacityDisplay();
  localStorage.removeItem("widgetSettings");
  applyWidgetSettings();
});

// Reset data button
document
  .getElementById("reset-all-data")
  .addEventListener("click", async () => {
    if (
      confirm(
        "Are you sure you want to reset all data? This action cannot be undone."
      )
    ) {
      await window.electronAPI.resetData();
      refreshUI();
    }
  });

// About button - toggle about modal visibility
document.getElementById("about-btn").addEventListener("click", () => {
  const aboutModal = document.getElementById("about-modal");
  aboutModal.classList.toggle("hidden");
});

// Close about modal when clicking outside or on close button
document.getElementById("close-about-modal").addEventListener("click", () => {
  const aboutModal = document.getElementById("about-modal");
  aboutModal.classList.add("hidden");
});

// Close about modal when clicking outside the modal content
document.getElementById("about-modal").addEventListener("click", (e) => {
  if (e.target.id === "about-modal") {
    const aboutModal = document.getElementById("about-modal");
    aboutModal.classList.add("hidden");
  }
});

window.electronAPI.onNetworkUpdate((payload) => {
  currentSpeedEl.textContent = speedToHuman(payload.speedBytesPerSec);
  // Refresh UI occasionally to update today's usage
  refreshUI();
});

// Widget customization modal event listeners
document
  .getElementById("widget-customization-btn")
  .addEventListener("click", () => {
    const modal = document.getElementById("widget-customization-modal");
    modal.classList.remove("hidden");
  });

document
  .getElementById("close-widget-customization-modal")
  .addEventListener("click", () => {
    const modal = document.getElementById("widget-customization-modal");
    modal.classList.add("hidden");
  });

document
  .getElementById("close-widget-customization-save")
  .addEventListener("click", () => {
    const modal = document.getElementById("widget-customization-modal");
    modal.classList.add("hidden");
  });

// Close modal when clicking outside
document
  .getElementById("widget-customization-modal")
  .addEventListener("click", (e) => {
    if (e.target.id === "widget-customization-modal") {
      const modal = document.getElementById("widget-customization-modal");
      modal.classList.add("hidden");
    }
  });

// Initial load
refreshUI();
loadNetworkInfo();
loadUsedNetworks();

// Set dark mode as default
document.documentElement.classList.add("dark");
loadWidgetSettings();
loadAppSettings();
// Removed updateCustomizationVisibility() call since it's no longer needed
