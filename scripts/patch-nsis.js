/**
 * scripts/patch-nsis.js
 * Automatically patches electron-builder NSIS templates so the installer details
 * box displays real-time extraction progress ("Extract: filename...") and file copying
 * instead of remaining blank.
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
  let modified = false;

  if (content.includes('Nsis7z::Extract "${FILE}"')) {
    content = content.replace(
      'Nsis7z::Extract "${FILE}"',
      'SetDetailsPrint both\n  DetailPrint "Extracting CarbonCode files..."\n  Nsis7z::ExtractWithDetails "${FILE}" "Extract: %s"'
    );
    modified = true;
  }

  if (content.includes('CopyFiles /SILENT "$PLUGINSDIR\\7z-out\\*" $OUTDIR')) {
    content = content.replace(
      'CopyFiles /SILENT "$PLUGINSDIR\\7z-out\\*" $OUTDIR',
      'DetailPrint "Installing files to destination..."\n    CopyFiles "$PLUGINSDIR\\7z-out\\*" $OUTDIR'
    );
    modified = true;
  }

  if (modified) {
    fs.writeFileSync(extractAppPackagePath, content, 'utf8');
    console.log('[patch-nsis] Patched extractAppPackage.nsh for ExtractWithDetails & file copying');
  }
}

