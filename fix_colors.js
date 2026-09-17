const fs = require('fs');
const path = require('path');

function processDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDir(fullPath);
    } else if (fullPath.endsWith('.tsx')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      
      // Remove all dark: classes
      content = content.replace(/dark:[a-zA-Z0-9\-\/]+/g, '');
      
      // Replace gray with slate
      content = content.replace(/gray-/g, 'slate-');
      
      // Clean up multiple spaces that might have been left
      content = content.replace(/className=\"\s+/g, 'className="');
      content = content.replace(/\s+\"/g, '"');
      content = content.replace(/\s{2,}/g, ' ');
      
      fs.writeFileSync(fullPath, content);
      console.log('Processed', fullPath);
    }
  }
}

processDir('d:/02/KODEFY/KODEFY_SAAS/kodefy_proyecto/src/app/[slug]/inventario');
