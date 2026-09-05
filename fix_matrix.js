const fs = require('fs');
const file = 'client/src/components/CalendarMatrix.jsx';
let content = fs.readFileSync(file, 'utf8');

// Replace hardcoded light text colors in the AI panel header with CSS variables
content = content.replace(/text-blue-200/g, 'text-[var(--color-text-3)]');
// text-white is used in multiple places, we only want to replace the one in the AI panel header.
content = content.replace(/<h3 className="text-white font-bold text-sm">Generate Executive Summary<\/h3>/, '<h3 className="text-[var(--color-text-1)] font-bold text-sm">Generate Executive Summary</h3>');
content = content.replace(/hover:text-white/g, 'hover:text-[var(--color-text-1)]');

fs.writeFileSync(file, content);
console.log('Updated CalendarMatrix.jsx');
