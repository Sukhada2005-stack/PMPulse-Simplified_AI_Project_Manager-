const fs = require('fs');
const path = require('path');

const dir = 'client/src/components';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.jsx')).map(f => path.join(dir, f));

const replacements = [
  { regex: /'#161410'/g, value: "'var(--navy)'" },
  { regex: /'#1f1d17'/g, value: "'var(--navy-2)'" },
  { regex: /'#27241e'/g, value: "'var(--navy-3)'" }
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
