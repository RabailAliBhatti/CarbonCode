!macro preInit
    SetRegView 64
    StrCpy $INSTDIR "C:\Carbon Code"
!macroend

; customHeader: overrides ShowInstDetails nevershow from common.nsh
; Makes the details panel visible
!macro customHeader
    ShowInstDetails show
!macroend

; customInit: runs in .onInit before install section
!macro customInit
    SetDetailsPrint both
!macroend

; customInstall: runs AFTER 7z extraction completes
; Show completion messages in the now-visible details panel
!macro customInstall
    SetDetailsPrint textonly
    DetailPrint ""
    DetailPrint "Installation complete."
    DetailPrint "CarbonCode has been installed to $INSTDIR"
!macroend
