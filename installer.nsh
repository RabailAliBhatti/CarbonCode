!macro preInit
    SetRegView 64
    StrCpy $INSTDIR "C:\Carbon Code"
!macroend

!macro customHeader
    ; Always show the file-details list on the install page so the user sees
    ; each file as it is installed, instead of an empty box behind a button.
    ShowInstDetails show
!macroend

!macro customInstall
    ; Re-enable per-file operation messages inside the install section.
    ; The electron-builder template suppresses these by default (SetDetailsPrint none),
    ; which makes the progress bar feel jumpy because the user has no file-level feedback.
    SetDetailsPrint textonly
!macroend