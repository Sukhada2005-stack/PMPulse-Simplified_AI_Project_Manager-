const fs = require('fs');
const file = 'client/src/index.css';
let content = fs.readFileSync(file, 'utf8');

// We are replacing the variables in the [data-theme="light"] block
const replacements = [
  { search: /--color-bg:\s*#fdf8f0;/g, replace: '--color-bg:          #fafaf9;' },
  { search: /--color-surface:\s*rgba\(255,255,255,0\.85\);/g, replace: '--color-surface:     #ffffff;' },
  { search: /--color-surface-2:\s*rgba\(255,248,235,0\.92\);/g, replace: '--color-surface-2:   #ffffff;' },
  { search: /--color-surface-solid:\s*#fff9f0;/g, replace: '--color-surface-solid: #ffffff;' },
  { search: /--color-text-1:\s*#1e1a14;/g, replace: '--color-text-1:      #0f172a;' },
  { search: /--color-text-2:\s*#4a3f2f;/g, replace: '--color-text-2:      #475569;' },
  { search: /--color-text-3:\s*#7a6a52;/g, replace: '--color-text-3:      #64748b;' },
  
  // Toning down the sidebars/dropdowns to pure white
  { search: /--topbar-bg:\s*rgba\(253,248,240,0\.97\);/g, replace: '--topbar-bg:         rgba(255,255,255,0.97);' },
  { search: /--sidebar-bg:\s*#fff9f0;/g, replace: '--sidebar-bg:        #ffffff;' },
  { search: /--dropdown-bg:\s*#fff9f0;/g, replace: '--dropdown-bg:       #ffffff;' },
  { search: /--sticky-col-bg:\s*#fff9f0;/g, replace: '--sticky-col-bg:     #ffffff;' },
  { search: /--footer-bg:\s*rgba\(253,248,240,0\.97\);/g, replace: '--footer-bg:         rgba(255,255,255,0.97);' }
];

for (const r of replacements) {
  content = content.replace(r.search, r.replace);
}

fs.writeFileSync(file, content);
console.log('Updated index.css light mode colors');
