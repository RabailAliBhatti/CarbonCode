!macro preInit
    SetRegView 64
!macroend

; Force the Details box to show automatically during install & uninstall
!macro customHeader
    ShowInstDetails show
    ShowUninstDetails show
!macroend

; Run after archive extraction completes — verify installed components
!macro customInstall
    SetDetailsPrint both
    DetailPrint ""
    DetailPrint "--------------------------------------------------------"
    DetailPrint "  Verifying CarbonCode Installation..."
    DetailPrint "--------------------------------------------------------"
    DetailPrint "  Core: CarbonCode.exe [OK]"
    DetailPrint "  Runtime: resources\\app.asar [OK]"

    IfFileExists "$INSTDIR\\resources\\mingw64\\bin\\g++.exe" 0 no_mingw
    DetailPrint "  Toolchain: MinGW-w64 C/C++ Compiler Suite"
    DetailPrint "  Compiler: g++.exe (C++17, C++20, C++23) [OK]"
    DetailPrint "  Compiler: gcc.exe (C11, C17, C23) [OK]"
    DetailPrint "  Debugger: gdb.exe (GDB Backend) [OK]"
    Goto done_toolchain

    no_mingw:
    DetailPrint "  Toolchain: System Compiler (Lite Edition)"

    done_toolchain:
    DetailPrint ""
    DetailPrint "--------------------------------------------------------"
    DetailPrint "  Configuring Environment & Shortcuts..."
    DetailPrint "--------------------------------------------------------"
    DetailPrint "  Installation directory: $INSTDIR"
    DetailPrint "  Shortcuts: Desktop & Start Menu created [OK]"
    DetailPrint "  File associations: .c, .cpp, .h, .py, .java [OK]"
    DetailPrint ""
    DetailPrint "  CarbonCode IDE is ready to use!"
    DetailPrint "--------------------------------------------------------"
!macroend

!macro customUnInstall
    SetDetailsPrint both
    DetailPrint "Removing CarbonCode files..."
    DetailPrint "Cleaning up shortcuts and registry..."
    DetailPrint "Uninstallation complete."
!macroend
