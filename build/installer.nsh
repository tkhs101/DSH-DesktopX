; DSH-DesktopX installer customization (build/installer.nsh, via nsis.include).
;
; Goal: files ALWAYS land in a DSH-DesktopX subfolder, even when the user picks
; a bare path (e.g. C:\RUANJIAN -> files go to C:\RUANJIAN\DSH-DesktopX).
; PROVEN by silent-install test 2026-09-16 (C:\Temp\dstestdir gained the subfolder).
;
; How: stock instFilesPre in assistedInstaller.nsh appends APP_FILENAME when
; the path does not contain it (APP_FILENAME = DSH-DesktopX via
; win.executableName). customInit below fixes the DEFAULT dir so the page
; opens with the suffix; the directory-page note sets the expectation that
; the suffix is automatic. No custom functions (avoids makensis warning-6010).

!macro customHeader
  !define MUI_DIRECTORYPAGE_TEXT_DESTINATION "目标文件夹（安装时会自动在末尾加上 DSH-DesktopX 子目录）："
!macroend

!macro customInit
  ; $INSTDIR at this point is the per-user default; ensure it ends with folder.
  Push $0
  StrCpy $0 $INSTDIR "" -12
  StrCmp $0 "DSH-DesktopX" customInit_done 0
  StrCpy $INSTDIR "$INSTDIR\DSH-DesktopX"
  customInit_done:
  Pop $0
!macroend
