const fs = require('fs');
let server = fs.readFileSync('server.ts', 'utf8');

server = server.replace("Find as many ACTUAL (up to 60), real exhibitor companies attending.", "Find as many ACTUAL (up to 2000) real exhibitor companies attending.");
server = server.replace("Find as many ACTUAL (up to 60) real exhibitor companies attending.", "Find as many ACTUAL (up to 2000) real exhibitor companies attending.");

fs.writeFileSync('server.ts', server);
