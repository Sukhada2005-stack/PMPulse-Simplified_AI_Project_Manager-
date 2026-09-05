const fs = require('fs');
const file = 'client/src/context/ThemeContext.jsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  /document\.documentElement\.setAttribute\("data-theme", isDark \? "dark" : "light"\);/g,
  `document.documentElement.setAttribute("data-theme", isDark ? "dark" : "light");
    if (isDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }`
);

fs.writeFileSync(file, content);
console.log("Updated ThemeContext.jsx");
