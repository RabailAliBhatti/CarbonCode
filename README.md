<p align="center">
  <img src="public/icon.png" alt="CarbonCode Logo" width="120" />
</p>

<h1 align="center">CarbonCode</h1>

<p align="center">
  <strong>A lightweight, offline C++ & Java IDE</strong><br/>
  <em>Developed by Rabail Ali Bhatti</em>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/version-3.0.0-blue?style=flat-square" alt="Version" />
  <img src="https://img.shields.io/badge/license-MIT-green?style=flat-square" alt="License" />
  <img src="https://img.shields.io/badge/platform-Windows-lightgrey?style=flat-square" alt="Platform" />
  <img src="https://img.shields.io/badge/electron-28-9cf?style=flat-square" alt="Electron" />
</p>

---

CarbonCode is a modern, cross-platform IDE for C++ and Java built with Electron, React, and Monaco Editor. Compile and run C++ and Java code locally using your system's installed compiler - no internet connection required.

## ✨ Features

- 🖥️ **Modern Code Editor** - Monaco Editor with C++ syntax highlighting, Enhanced IntelliSense, and bracket matching
- 🐞 **Integrated Debugger** - GDB-powered line-by-line debugging with variable inspection and breakpoint support
- 🛡️ **Anti-Cheat System** - Robust copy-paste restrictions with dedicated UI buttons and toast feedback
- 🔧 **Dual Compiler Modes** - Uses bundled MinGW (Full version) or system compiler (Lite version)
- 📁 **File Explorer** - Integrated file tree for easy project navigation
- 📑 **Multi-Tab Interface** - Work on multiple files simultaneously with dirty-state tracking
- 🔍 **Find & Replace** - Powerful search functionality with regex support (Ctrl+F)
- ⚙️ **Customizable** - Settings for font size, themes, auto-save, and C++ standards
- ⚡ **Fast Execution** - Compile and run code with a single click or F5
- 📊 **Output Panel** - View stdout and stderr separately with timing information
- 🔢 **C++ Standards** - Support for C++11 through C++23
- ☕ **Java Support** - Compile and run Java programs with automatic JDK detection
- 📈 **Performance Analytics** - Opt-in system usage tracking to improve user experience
- 💾 **Offline First** - No internet connection required

## 📋 Prerequisites

**For the "Full" version:** None! It comes with a bundled C++ compiler (MinGW).

**For the "Lite" version:** You must have a C++ compiler installed on your system:

### Windows (Lite Version)
- **Option 1: MinGW-w64** (Recommended)
  1. Download from [MinGW-w64](https://www.mingw-w64.org/downloads/)
  2. Add the `bin` folder to your system PATH
  3. Verify: `g++ --version`

- **Option 2: Visual Studio Build Tools**
  1. Download [Visual Studio Build Tools](https://visualstudio.microsoft.com/downloads/)
  2. Install "Desktop development with C++"
  3. Open the "Developer Command Prompt" to compile

### macOS
```bash
# Install Xcode Command Line Tools
xcode-select --install

# Verify installation
clang++ --version
```

### Linux (Ubuntu/Debian)
```bash
# Install g++
sudo apt update
sudo apt install build-essential

# Verify installation
g++ --version
```

### Linux (Fedora)
```bash
sudo dnf install gcc-c++
```

### Linux (Arch)
```bash
sudo pacman -S gcc
```

### Java JDK (Required for Java support)

To compile and run Java programs, you need the Java Development Kit (JDK):

**Windows:**
1. Download [Eclipse Temurin JDK](https://adoptium.net/temurin/releases/) or [Oracle JDK](https://www.oracle.com/java/technologies/downloads/)
2. Install and ensure `javac` is on your PATH
3. Verify: `javac -version`

**macOS:**
```bash
# Install via Homebrew
brew install openjdk

# Verify
javac -version
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt update
sudo apt install default-jdk
javac -version
```

## 🚀 Installation

### From Source

1. Clone the repository:
```bash
git clone https://github.com/rabailalibhatti/carboncode.git
cd carboncode
```

2. Install dependencies:
```bash
npm install
```

3. Run in development mode:
```bash
npm run dev
```

### Building for Distribution

You can build two versions of the installer:

**1. Lite Version (Smaller size, requires system compiler)**
```bash
npm run build:lite
# Output: release/lite/CarbonCode-Lite-x.x.x.exe
```

**2. Full Version (Includes MinGW compiler, works out of the box)**
```bash
npm run build:full
# Output: release/full/CarbonCode-Full-x.x.x.exe
```

## ⌨️ Keyboard Shortcuts

| Action | Shortcut |
|--------|----------|
| New File | `Ctrl+N` |
| Open File | `Ctrl+O` |
| Save | `Ctrl+S` |
| Save As | `Ctrl+Shift+S` |
| Find / Replace | `Ctrl+F` |
| Toggle Explorer | `Ctrl+B` |
| Compile & Run | `F5` |
| Quit | `Ctrl+Q` |

## 🔧 Selecting C++ Standard

Use the dropdown in the toolbar to select your desired C++ standard:
- C++11
- C++14
- C++17 (default)
- C++20
- C++23

## 📁 Project Structure

```
carboncode/
├── electron/           # Electron main process
│   ├── main.ts         # Main window & IPC handlers
│   ├── preload.ts      # Secure IPC bridge
│   ├── compiler.ts     # Compilation logic
│   └── debugger.ts     # GDB Debugger integration
├── src/                # React renderer process
│   ├── components/     # UI components (Editor, DebugPanel, Analytics, etc.)
│   ├── hooks/          # Custom React hooks (useFileManager, useSettings)
│   ├── App.tsx         # Main application orchestrator
│   ├── main.tsx        # React entry point
│   └── index.css       # Global styles & themes
├── public/             # Static assets (icons, etc.)
├── vendor/             # Bundled tools (MinGW-w64)
├── package.json        # Dependencies & build scripts
├── vite.config.ts      # Build configuration
└── tailwind.config.js  # Styling configuration
```

## 🛠️ Technical Stack

- **Electron** - Cross-platform desktop framework
- **React 18** - UI library with hooks
- **TypeScript** - Type-safe JavaScript
- **Vite** - Fast build tool
- **Monaco Editor** - VS Code's editor component
- **TailwindCSS** - Utility-first CSS framework
- **Java/JDK** - Java compilation and execution support

## 🔒 Security

CarbonCode follows Electron security best practices:
- Context isolation is enabled
- Node integration is disabled in the renderer
- All IPC communication goes through a secure preload script
- Temporary files are cleaned up after compilation

## 🐛 Troubleshooting

### "No compiler detected"

1. Ensure you have g++, clang++, or cl.exe installed
2. Verify the compiler is in your system PATH
3. Restart the application after installing

### Compilation times out

Your code may have an infinite loop. The execution timeout is 10 seconds.

### Compilation errors

Check the "Errors" tab in the output panel for detailed error messages from the compiler.

## 🔮 Future Enhancements — V4 Roadmap

CarbonCode V4 is actively being planned. Here's what's coming next:

### Phase 1: Smart Editor
- 🤖 **AI-Powered Code Suggestions** — Context-aware autocomplete beyond IntelliSense
- 🎨 **Custom Themes & Extensions** — User-created themes and plugin support
- 📝 **Code Snippets Library** — Reusable snippet manager with cloud sync

### Phase 2: Collaboration & Cloud
- 🌐 **Live Collaboration** — Real-time pair programming with shared cursors
- ☁️ **Cloud Sync** — Sync projects and settings across devices
- 🏫 **Classroom Mode** — Teacher dashboard with student progress tracking

### Phase 3: Advanced Tooling
- 📊 **Memory Profiler** — Visual memory leak detection and heap analysis
- 🧪 **Integrated Testing** — Built-in unit testing framework with coverage reports
- 🔗 **Git Integration** — Visual Git management (commit, branch, merge) inside the IDE

### Phase 4: Cross-Platform & Beyond
- 🐧 **Linux & macOS Installers** — Native builds for all major platforms
- 📱 **Web Version** — Browser-based CarbonCode powered by WebAssembly
- 🌍 **Multi-Language Support** — Extend to Python, Java, and Rust compilation

> 💡 Have a feature idea? [Open an issue](https://github.com/RabailAliBhatti/CarbonCode/issues) and let us know!

## 📄 License

MIT License - see LICENSE file for details.

---

<p align="center">
  <strong>CarbonCode</strong> - Made with ❤️ by <strong>Rabail Ali Bhatti</strong>
</p>
