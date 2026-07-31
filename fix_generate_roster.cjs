const fs = require('fs');
let server = fs.readFileSync('server.ts', 'utf8');

const searchPromptToReplace = `const searchPrompt = \`Search the web for the official exhibitor list for '\${cleanShow}' in '\${city || 'Chicago'}', '\${state || 'IL'}'. Find as many ACTUAL (up to 2000) real exhibitor companies attending. Find their real booth numbers, website, industry, and any available contact info or decision makers. Do not hallucinate. List them as text.\`;`;

const newSearchPrompt = `const searchPrompt = \`DISCOVERY FALLBACK: Search the web to find exhibitor companies for '\${cleanShow}' in '\${city || 'Chicago'}', '\${state || 'IL'}'. ONLY use this if an official exhibitor directory URL cannot be found. Find actual exhibitor companies attending. Find their real booth numbers, website, industry, and any available contact info. Do not hallucinate. List them as text.\`;`;

server = server.replace(searchPromptToReplace, newSearchPrompt);

fs.writeFileSync('server.ts', server);
