# CarbonCode

<p align="center">
  <strong>A lightweight, offline C++ IDE</strong>
</p>

<p align="center">
  <em>Developed by Rabail Ali Bhatti</em>
</p>

---

CarbonCode is a modern, cross-platform C++ IDE built with Electron, React, and Monaco Editor. Compile and run C++ code locally using your system's installed compiler - no internet connection required.

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

## 📄 License

MIT License - see LICENSE file for details.

---

<p align="center">
  <strong>CarbonCode</strong> - Made with ❤️ by <strong>Rabail Ali Bhatti</strong>
</p>
