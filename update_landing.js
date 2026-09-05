const fs = require('fs');
const file = 'client/src/components/LandingPage.jsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(/text-white/g, 'text-[var(--color-text-1)]');
content = content.replace(/text-\[#8e8b85\]/g, 'text-[var(--color-text-3)]');
content = content.replace(/bg-white\/5/g, 'bg-[var(--btn-secondary-bg)]');
content = content.replace(/border-white\/10/g, 'border-[var(--color-border)]');
content = content.replace(/border-white\/5/g, 'border-[var(--color-border)]');

fs.writeFileSync(file, content);
console.log('Updated LandingPage classes');
