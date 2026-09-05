const fs = require('fs');
const file = 'client/src/components/LandingPage.jsx';
let content = fs.readFileSync(file, 'utf8');

// Add imports
content = content.replace(
  /import \{ useAuth \} from '\.\.\/context\/AuthContext';/,
  "import { useAuth } from '../context/AuthContext';\nimport { useTheme } from '../context/ThemeContext';"
);

content = content.replace(
  /Sparkles\n\} from 'lucide-react';/,
  "Sparkles,\n  Sun,\n  Moon\n} from 'lucide-react';"
);

// Add useTheme
content = content.replace(
  /const \{ login, completeLogin \} = useAuth\(\);/,
  "const { login, completeLogin } = useAuth();\n  const { isDark, toggleTheme } = useTheme();"
);

// Update root div
content = content.replace(
  /<div style=\{\{ backgroundColor: 'var\(--navy\)', color: 'var\(--color-text-1\)', fontFamily: "'Inter', sans-serif" \}\}>/,
  '<div className="bg-slate-50 dark:bg-slate-950 transition-colors duration-300" style={{ fontFamily: "\'Inter\', sans-serif" }}>'
);

// Update ACUBE AI logo text
content = content.replace(
  /<span className="text-2xl font-black tracking-tight text-\[var\(--color-text-1\)\]">ACUBE AI<\/span>/,
  '<span className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">ACUBE AI</span>'
);

// Update Main Headline text
content = content.replace(
  /<h1 className="text-5xl md:text-7xl font-black tracking-tight mb-8 max-w-5xl leading-tight text-\[var\(--color-text-1\)\]">/,
  '<h1 className="text-5xl md:text-7xl font-black tracking-tight mb-8 max-w-5xl leading-tight text-slate-900 dark:text-white">'
);

// Add toggle button to navbar
content = content.replace(
  /<div className="flex items-center gap-4">\s*<\/div>/,
  `<div className="flex items-center gap-4">
          <button 
            onClick={toggleTheme}
            className="p-2 rounded-full bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 transition-colors"
            aria-label="Toggle Theme"
          >
            {isDark ? <Sun className="w-5 h-5 text-white" /> : <Moon className="w-5 h-5 text-slate-900" />}
          </button>
        </div>`
);

fs.writeFileSync(file, content);
console.log("Updated LandingPage.jsx");
