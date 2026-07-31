const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

code = code.replace(/const aiRes = await ai\.models\.generateContent\(\{\n\s*tools: \[\{ googleSearch: \{\} \}\],/g, 'const aiRes = await ai.models.generateContent({');

fs.writeFileSync('server.ts', code);
console.log('Fixed tools');
