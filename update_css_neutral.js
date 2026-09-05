const fs = require('fs');
const file = 'client/src/index.css';
let content = fs.readFileSync(file, 'utf8');

// Replace everything inside [data-theme="light"]
const lightThemeMatch = content.match(/\[data-theme="light"\]\s*\{([^}]+)\}/);
if (lightThemeMatch) {
  let lightVars = lightThemeMatch[1];
  
  // Neutralize borders and background tints
  lightVars = lightVars.replace(/--color-bg:\s*#fafaf9;/g, '--color-bg:          #f8fafc;'); // slate-50
  lightVars = lightVars.replace(/--color-border:.*?;/g, '--color-border:      #e2e8f0;'); // slate-200
  lightVars = lightVars.replace(/--color-border-soft:.*?;/g, '--color-border-soft: #f1f5f9;'); // slate-100
  lightVars = lightVars.replace(/--color-neutral-bg:.*?;/g, '--color-neutral-bg:  #ffffff;'); // pure white
  
  // Neutralize structural shadows, removing the amber/gold glow from non-interactive containers
  lightVars = lightVars.replace(/--shadow-card:.*?;/g, '--shadow-card:       0 2px 10px rgba(0,0,0,0.05), 0 0 0 1px #e2e8f0;');
  lightVars = lightVars.replace(/--shadow-panel:.*?;/g, '--shadow-panel:      0 8px 24px rgba(0,0,0,0.08), 0 0 0 1px #e2e8f0;');
  lightVars = lightVars.replace(/--shadow-float:.*?;/g, '--shadow-float:      0 16px 48px rgba(0,0,0,0.12), 0 0 0 1px #e2e8f0;');
  lightVars = lightVars.replace(/--sidebar-border:.*?;/g, '--sidebar-border:    #e2e8f0;');
  lightVars = lightVars.replace(/--table-th-bg:.*?;/g, '--table-th-bg:       #f8fafc;');
  lightVars = lightVars.replace(/--table-border:.*?;/g, '--table-border:      #e2e8f0;');

  content = content.replace(/\[data-theme="light"\]\s*\{[^}]+\}/, `[data-theme="light"] {${lightVars}}`);
  
  fs.writeFileSync(file, content);
  console.log('Successfully neutralized light mode colors.');
}
