# CarbonCode v4.2.0 Release Notes

**CarbonCode v4.2.0** is a major feature release delivering **Human-Readable Compiler Error Translations with 1-Click Fixes**, **1-Click Project Starter Templates**, a **Seamless Native NSIS Installer** with live extraction progress, multi-file C++ build discovery, Java package routing, ANSI terminal coloring, and GDB debugger watch enhancements.

---

## 🚀 Key Improvements & New Features

### 1. 💡 Human-Readable Compiler Error Translator & 1-Click Fixes
- **Friendly Diagnostic Cards**: Transforms cryptic GCC, Clang, Javac, and Python tracebacks into clean, conversational cards explaining *what went wrong*, *why it happened*, and *how to fix it*.
- **⚡ 1-Click "Fix It"**: Automatically injects missing `#include` directives (`<iostream>`, `<vector>`, `<string>`, `<algorithm>`, `<cmath>`, `<map>`), missing Java imports (`import java.util.Scanner;`, `import java.util.*;`), missing semicolons on class/struct definitions (`};`), `using namespace std;`, and switches toolbar C++ standards on demand.
- **Smart Container & Operator Detection**: Explains common beginner traps such as passing `std::vector` or `std::pair` directly to `std::cout <<`, providing idiomatic range-based `for` loop examples.
- **Side-by-Side Example Comparisons**: Visually compares *"Common mistake"* vs *"Recommended solution"*.
- **Integrated View Switcher**: Easily toggle between **`💡 Explanations`** and **`📋 Compact Log`** directly from the Errors tab header.

### 2. 📁 1-Click Project Starter Templates Wizard
- **New Project Wizard (`Ctrl+Shift+N`)**: Ready-to-run multi-file architecture templates selectable from both the Welcome Screen and the File Toolbar:
  - **🔷 C++ OOP Package**: Clean object-oriented architecture (`include/Calculator.h`, `src/Calculator.cpp`, `src/main.cpp`, `tests/test_calculator.cpp`) with header guards, encapsulation, and assertion test drivers.
  - **🎮 Raylib / 2D Graphics Game Starter**: Pre-configured 60 FPS delta-time physics loop (`include/game.h`, `src/game.cpp`, `src/main.cpp`), vector mathematics, player entity movement, boundary constraints, and auto-linking for Raylib and Win32 graphics.
  - **🐍 Python Modular Project**: Standard Python packaging layout (`src/math_suite/`, `main.py`, `tests/test_calculator.py`, `requirements.txt`) with path management and `unittest` discoverability.
  - **☕ Java Standard Application**: Package-aware structure (`src/com/carboncode/app/Main.java`, domain models, and service classes) compiled and executed with package classpath resolution.

### 3. 📦 Seamless Live-Progress NSIS Windows Installer
- **Native Embedded File Extraction**: Replaced external copy dialogs with integrated real-time NSIS `ExtractWithDetails`, rendering extraction progress directly inside the installer window.
- **Single-Phase Silent Deployment**: Direct target directory extraction for zero duplicate copying and maximum installation speed.

### 4. 🛠️ Build Pipeline & Compiler Enhancements
- **Multi-File C++ Discovery**: Automatically detects and compiles sibling `.cpp` files in `src/` and project folders alongside `sourceFile`, with automated `-I include` flag insertion.
- **Java Package Routing**: Automatically parses package declarations (`package com.carboncode.app;`), dynamically sets `-sourcepath src`, and launches the fully qualified main class (`java -cp bin com.carboncode.app.Main`).
- **ANSI Color Terminal Support**: Integrated Output Panel renders ANSI escape color codes, giving rich colored outputs for modern CLI libraries and test runners.

### 5. 🐞 Debugger & Workflow Refinements
- **GDB Local Headers & Watch Support**: Improved breakpoint mapping and symbol inspection for multi-file C++ structures.
- **Persistent Workspace State**: Preserves expanded folder tree structures across reloads and tab navigations.
- **High-Throughput Output Streaming**: RequestAnimationFrame-buffered terminal rendering eliminates UI stutter on fast output loops.

---

## 🧪 Quality & Test Coverage
- **138 automated unit tests** passing with Vitest across all compiler, debugger, intellisense, template, and error translation pipelines.
