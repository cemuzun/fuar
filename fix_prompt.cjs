const fs = require('fs');
let server = fs.readFileSync('server.ts', 'utf8');

server = server.replace("Find 15-20 ACTUAL", "Find as many ACTUAL (up to 60)");
fs.writeFileSync('server.ts', server);
