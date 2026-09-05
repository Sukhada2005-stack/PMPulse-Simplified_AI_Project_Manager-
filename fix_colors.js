const fs = require('fs');
const path = require('path');

const dir = 'client/src/components';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.jsx')).map(f => path.join(dir, f));

const replacements = [
  { regex: /'#1a1814'/g, value: "'var(--color-surface-solid)'" },
  { regex: /'#0f0e0b'/g, value: "'var(--color-bg)'" },
  { regex: /'#f0ede8'/g, value: "'var(--color-text-1)'" },
  { regex: /'#c5c4c1'/g, value: "'var(--color-text-2)'" },
  { regex: /'#8e8b85'/g, value: "'var(--color-text-3)'" },
  { regex: /'rgba\(255,255,255,0\.04\)'/g, value: "'var(--table-th-bg)'" }
];

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  let changed = false;
  for (const r of replacements) {
    if (r.regex.test(content)) {
      content = content.replace(r.regex, r.value);
      changed = true;
    }
  }
  if (changed) {
    fs.writeFileSync(file, content);
    console.log('Updated ' + file);
  }
}
