/**
 * scripts/patch-nsis.js
 * Automatically patches electron-builder NSIS templates so that:
 * 1. Extraction occurs DIRECTLY to the destination folder ($OUTDIR / $INSTDIR).
 * 2. No temporary extraction directory or secondary CopyFiles shell call is performed,
 *    preventing any external Windows Explorer copy dialogs from popping up.
 * 3. The installer details box displays real-time progress and extraction status inside
 *    the installer window.
 */
const fs = require('fs');
const path = require('path');

const installSectionPath = path.resolve('node_modules/app-builder-lib/templates/nsis/installSection.nsh');
if (fs.existsSync(installSectionPath)) {
  let content = fs.readFileSync(installSectionPath, 'utf8');
  if (content.includes('SetDetailsPrint none')) {
    content = content.replace('SetDetailsPrint none', 'SetDetailsPrint both');
    fs.writeFileSync(installSectionPath, content, 'utf8');
    console.log('[patch-nsis] Patched installSection.nsh for SetDetailsPrint both');
  }
}

const extractAppPackagePath = path.resolve('node_modules/app-builder-lib/templates/nsis/include/extractAppPackage.nsh');
if (fs.existsSync(extractAppPackagePath)) {
  let content = fs.readFileSync(extractAppPackagePath, 'utf8');

  // Replace the entire extractUsing7za macro with direct extraction to $OUTDIR
  const directExtractMacro = `!macro extractUsing7za FILE
  SetDetailsPrint both
  DetailPrint "Destination folder: $OUTDIR"
  DetailPrint "Extracting CarbonCode application and toolchain files..."
  ClearErrors
  SetOutPath $OUTDIR
  Nsis7z::ExtractWithDetails "\${FILE}" "Extracting: %s"
  Pop $R0
  \${if} $R0 != "success"
    DetailPrint "Error extracting package: $R0"
  \${else}
    DetailPrint "Package extraction completed successfully."
  \${endIf}
!macroend`;

  const regex = /!macro extractUsing7za FILE[\s\S]*?!macroend/;
  if (regex.test(content)) {
    content = content.replace(regex, directExtractMacro);
    fs.writeFileSync(extractAppPackagePath, content, 'utf8');
    console.log('[patch-nsis] Successfully patched extractUsing7za for DIRECT extraction to $OUTDIR (no external Windows copy dialog)');
  }
}
