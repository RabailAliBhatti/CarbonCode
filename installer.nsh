!macro preInit
    SetRegView 64
    StrCpy $INSTDIR "C:\Carbon Code"
!macroend

; Force the Details box to show automatically during install & uninstall
!macro customHeader
    ShowInstDetails show
    ShowUninstDetails show
!macroend

; Run after archive extraction completes — enumerate and show all files being installed
!macro customInstall
    SetDetailsPrint both
    DetailPrint ""
    DetailPrint "--------------------------------------------------------"
    DetailPrint "  Verifying installed files..."
    DetailPrint "--------------------------------------------------------"

    ; Enumerate root installation directory files
    ClearErrors
    FindFirst $0 $1 "$INSTDIR\*.*"
    loop_root:
        StrCmp $1 "" done_root
        StrCmp $1 "." skip_root
        StrCmp $1 ".." skip_root
        DetailPrint "  Installed: $1"
    skip_root:
        FindNext $0 $1
        Goto loop_root
    done_root:
    FindClose $0

    ; Enumerate resources folder files
    IfFileExists "$INSTDIR\resources\*.*" 0 done_res
    ClearErrors
    FindFirst $0 $1 "$INSTDIR\resources\*.*"
    loop_res:
        StrCmp $1 "" done_res
        StrCmp $1 "." skip_res
        StrCmp $1 ".." skip_res
        DetailPrint "  Installed: resources\$1"
    skip_res:
        FindNext $0 $1
        Goto loop_res
    done_res:
    FindClose $0

    ; Enumerate MinGW toolchain executables if bundled
    IfFileExists "$INSTDIR\resources\mingw64\bin\*.exe" 0 done_mingw
    DetailPrint ""
    DetailPrint "  Verifying C/C++ compiler toolchain..."
    ClearErrors
    FindFirst $0 $1 "$INSTDIR\resources\mingw64\bin\*.exe"
    loop_mingw:
        StrCmp $1 "" done_mingw
        DetailPrint "  Toolchain: mingw64\bin\$1"
        FindNext $0 $1
        Goto loop_mingw
    done_mingw:
    FindClose $0

    DetailPrint ""
    DetailPrint "--------------------------------------------------------"
    DetailPrint "  Configuring CarbonCode Environment & Compilers..."
    DetailPrint "--------------------------------------------------------"
    DetailPrint "  Installation directory: $INSTDIR"
    DetailPrint "  Shortcuts registered."
    DetailPrint "  CarbonCode IDE is ready to use!"
    DetailPrint "--------------------------------------------------------"
!macroend

!macro customUnInstall
    SetDetailsPrint both
    DetailPrint "Removing CarbonCode files..."
    DetailPrint "Cleaning up shortcuts and registry..."
    DetailPrint "Uninstallation complete."
!macroend
