const fs = require('fs');
const path = require('path');

function walk(dir) {
  const files = fs.readdirSync(dir, { withFileTypes: true });
  files.forEach((file) => {
    const res = path.resolve(dir, file.name);
    if (file.isDirectory()) walk(res);
    else if (file.isFile() && /\.(ts|tsx|js|jsx)$/.test(file.name)) {
      let content = fs.readFileSync(res, 'utf8');
      if (content.includes("@/")) {
        const newContent = content.split('@/').join('');
        fs.writeFileSync(res, newContent, 'utf8');
        console.log('Patched', path.relative(process.cwd(), res));
      }
    }
  });
}

const root = path.resolve(__dirname, '../src');
walk(root);
console.log('Done');
