const fs = require('fs');
const file = 'client/src/index.css';
let content = fs.readFileSync(file, 'utf8');

const lightThemeMatch = content.match(/\[data-theme="light"\]\s*\{([^}]+)\}/);
if (lightThemeMatch) {
  let lightVars = lightThemeMatch[1];
  
  lightVars = lightVars.replace(/--navy-2:.*?;/g, '--navy-2:          #f8fafc;'); // slate-50
  lightVars = lightVars.replace(/--navy-3:.*?;/g, '--navy-3:          #f1f5f9;'); // slate-100
  lightVars = lightVars.replace(/--btn-secondary-bg:.*?;/g, '--btn-secondary-bg:  #f8fafc;');
  lightVars = lightVars.replace(/--btn-secondary-hover:.*?;/g, '--btn-secondary-hover: #f1f5f9;');

  content = content.replace(/\[data-theme="light"\]\s*\{[^}]+\}/, `[data-theme="light"] {${lightVars}}`);
  fs.writeFileSync(file, content);
  console.log('Fixed navy and btn-secondary vars for light mode.');
}
