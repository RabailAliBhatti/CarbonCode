!macro preInit
    SetRegView 64
    StrCpy $INSTDIR "C:\Carbon Code"
!macroend

!macro customInstall
    ; Re-enable detail printing so files show in the details panel
    SetDetailsPrint textonly
    DetailPrint "Installing CarbonCode..."
    DetailPrint "Destination: $INSTDIR"
    DetailPrint ""
!macroend
