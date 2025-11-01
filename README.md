# 📊 Data Tracker

<div align="center">

![Data Tracker Banner](https://img.shields.io/badge/Electron-App-47848F?style=for-the-badge&logo=electron&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)
![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)

**A beautiful, modern Electron desktop application for real-time network monitoring and data usage tracking**

[Features](#-features) • [Installation](#-installation) • [Usage](#-usage) • [Tech Stack](#-tech-stack)

</div>

---

## ✨ Features

### 🔍 Real-Time Monitoring
- **Live Network Stats**: Monitor your download/upload speeds in real-time
- **Network Information**: View detailed info about your connected network (SSID, signal strength, link speed, uptime)
- **Automatic Updates**: Network stats refresh automatically every second

### 📈 Data Usage Tracking
- **Daily Tracking**: Track your data usage day by day
- **Historical Data**: View usage history for any date
- **Monthly Statistics**: See total monthly data consumption
- **Usage Breakdown**: Separate download and upload statistics

### 🌐 Network Detection
- **Smart Network Type Detection**: Automatically identifies network type (Mobile Hotspot, Ethernet, Router, PC Network, Wi-Fi)
- **Device Icons**: Visual representation with color-coded icons for different network types
- **Connection Status**: Real-time connection status with uptime tracking
- **Multiple Network Support**: Track data usage across different networks

### 🎨 Beautiful UI
- **Glassmorphism Design**: Modern frosted glass effect UI
- **Responsive Layout**: 3-column layout optimized for desktop
- **Dark Theme**: Easy on the eyes with a professional dark theme
- **Smooth Animations**: Polished transitions and loading states
- **Feather Icons**: Clean, consistent iconography throughout

### 📊 Data Visualization
- **Usage Charts**: Visual representation of daily usage
- **Color-Coded Stats**: Easy-to-read color-coded download/upload data
- **Historical View**: Browse through past usage data
- **Unit Conversion**: Auto-convert between MB/GB or choose manual units

### 🪟 Floating Speed Widget
- **Always-on-Top Widget**: Compact floating window showing real-time speeds
- **Customizable**: Adjust opacity, size, and position
- **Auto-show Option**: Configure widget to show on app startup
- **Minimal Design**: Non-intrusive, draggable mini window

### ⚙️ Settings & Customization
- **Data Units**: Choose between Auto, MB, or GB display
- **Widget Controls**: Enable/disable floating speed widget
- **Auto-show Widget**: Option to automatically display widget on startup
- **Data Reset**: Reset all tracked data when needed
- **Widget Customization**: Fine-tune widget appearance

---

## 🚀 Installation

### Prerequisites
- **Node.js** (v14 or higher)
- **npm** (comes with Node.js)

### Steps

1. **Clone the repository**
   ```bash
   git clone https://github.com/Uchiha-Itachi001/Data_Tracker.git
   cd Data_Tracker
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Run the application**
   ```bash
   npm start
   ```

### Building the App

To build the application for distribution:

```bash
npm run build
```

This will create executable files in the `dist` folder for your platform.

---

## 📖 Usage

### Main Dashboard
1. **Monitor Real-Time Stats**: View current network speed and daily usage on the main dashboard
2. **Check Network Info**: See your connected network details in the left panel
3. **View Used Networks**: See which network you're currently using with data consumption
4. **Browse History**: Click on dates in the usage history to view past data

### Speed Widget
1. **Enable Widget**: Go to Settings → Speed Widget → Enable Widget
2. **Customize**: Click "Customization" to adjust opacity and size
3. **Auto-show**: Enable "Auto-show Widget" to launch widget with app

### Settings
- **Data Units**: Select preferred data display units (Auto/MB/GB)
- **Reset Data**: Clear all tracked usage data
- **Widget Settings**: Configure floating speed widget behavior

---

## 🛠️ Tech Stack

### Core Technologies
- **[Electron](https://www.electronjs.org/)** - Desktop application framework
- **[Node.js](https://nodejs.org/)** - JavaScript runtime
- **[systeminformation](https://www.npmjs.com/package/systeminformation)** - System and network information library

### Frontend
- **HTML5** - Structure
- **CSS3** - Styling with glassmorphism effects
- **[Tailwind CSS](https://tailwindcss.com/)** - Utility-first CSS framework
- **JavaScript** - Application logic
- **[Feather Icons](https://feathericons.com/)** - Icon set

### Data Storage
- **electron-store** - Persistent data storage
- **JSON** - Data format for usage tracking

---

## 📁 Project Structure

```
Data_Tracker/
├── main.js              # Main Electron process
├── preload.js           # Preload script for IPC
├── package.json         # Project dependencies
├── assets/              # Application assets
│   └── icon.ico        # App icon
└── src/
    ├── index.html      # Main window HTML
    ├── renderer.js     # Renderer process logic
    ├── styles.css      # Custom styles
    └── widget.html     # Speed widget HTML
```

---

## 🔧 Key Features Explained

### Network Type Detection
The app intelligently detects your network type based on:
- **Mobile Hotspot**: Identifies phone/mobile networks (iPhone, Android, Samsung, etc.)
- **Ethernet**: Detects wired LAN connections
- **Router**: Recognizes common router brands (TP-Link, D-Link, Netgear, ASUS)
- **PC Network**: Identifies PC-shared networks
- **Wi-Fi**: Standard wireless connections

Each type is displayed with a unique icon and color scheme for easy identification.

### Data Tracking
- Tracks both download (RX) and upload (TX) data separately
- Stores data by date for historical viewing
- Calculates daily and monthly totals
- Persistent storage across app restarts
- Network connection state tracking with automatic reset on network change

### Real-Time Updates
- Updates network stats every second
- Refreshes UI automatically
- Monitors network interface changes
- Tracks connection uptime per network session

---

## 🤝 Contributing

Contributions are welcome! Here's how you can help:

1. Fork the repository
2. Create a new branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📝 License

This project is open source and available under the [MIT License](LICENSE).

---

## 👨‍💻 Developer

**Pankoj Roy**

- GitHub: [@Uchiha-Itachi001](https://github.com/Uchiha-Itachi001)
- Full Stack Developer | MERN + Flutter
- Passionate about creating interactive desktop and mobile applications

---

## 🙏 Acknowledgments

- [Electron](https://www.electronjs.org/) - For the amazing framework
- [systeminformation](https://github.com/sebhildebrandt/systeminformation) - For comprehensive system data
- [Feather Icons](https://feathericons.com/) - For beautiful icons
- [Tailwind CSS](https://tailwindcss.com/) - For rapid UI development

---

## 📮 Support

If you found this project helpful, please give it a ⭐️!

For issues, questions, or suggestions, please [open an issue](https://github.com/Uchiha-Itachi001/Data_Tracker/issues).

---

<div align="center">

**Made with ❤️ by Pankoj Roy**

</div>
