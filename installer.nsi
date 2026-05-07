!include "MUI2.nsh"

Name "SuperClaw"
OutFile "C:\Users\Administrator\Desktop\SuperClaw-Setup-v0.2.0.exe"
InstallDir "$PROGRAMFILES64\SuperClaw"
InstallDirRegKey HKLM "Software\SuperClaw" "Install_Dir"
RequestExecutionLevel admin

!define MUI_ICON "C:\Users\Administrator\Desktop\SuperClaw\src-tauri\icons\icon.ico"
!define MUI_UNICON "C:\Users\Administrator\Desktop\SuperClaw\src-tauri\icons\icon.ico"

!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH

!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES

!insertmacro MUI_LANGUAGE "SimpChinese"

Section "Install"
  SetOutPath $INSTDIR
  
  ; 涓荤▼搴?  File "C:\Users\Administrator\Desktop\SuperClaw\src-tauri\target\release\superclaw.exe"
  
  ; OpenClaw
  CreateDirectory "$INSTDIR\openclaw"
  SetOutPath "$INSTDIR\openclaw"
  File /r "C:\Users\Administrator\Desktop\SuperClaw\openclaw-dist\*.*"
  SetOutPath $INSTDIR
  
  ; 娉ㄥ唽琛?  WriteRegStr HKLM "Software\SuperClaw" "Install_Dir" "$INSTDIR"
  WriteUninstaller "$INSTDIR\Uninstall.exe"
  
  ; 蹇嵎鏂瑰紡
  CreateDirectory "$SMPROGRAMS\SuperClaw"
  CreateShortcut "$SMPROGRAMS\SuperClaw\SuperClaw.lnk" "$INSTDIR\superclaw.exe" "" "" 0 "" "" "$INSTDIR"
  CreateShortcut "$SMPROGRAMS\SuperClaw\Uninstall.lnk" "$INSTDIR\Uninstall.exe"
  CreateShortcut "$DESKTOP\SuperClaw.lnk" "$INSTDIR\superclaw.exe" "" "" 0 "" "" "$INSTDIR"
SectionEnd

Section "Uninstall"
  Delete "$INSTDIR\superclaw.exe"
  Delete "$INSTDIR\Uninstall.exe"
  RMDir /r "$INSTDIR\openclaw"
  RMDir "$INSTDIR"
  Delete "$SMPROGRAMS\SuperClaw\*.*"
  RMDir "$SMPROGRAMS\SuperClaw"
  Delete "$DESKTOP\SuperClaw.lnk"
  DeleteRegKey HKLM "Software\SuperClaw"
SectionEnd
