const fs = require('fs');
let server = fs.readFileSync('server.ts', 'utf8');

server = server.replace(`      return { exhibitors: scrapeResult.exhibitors, diagnostics: scrapeResult.diagnostics };
    }
    }`, `      return { exhibitors: scrapeResult.exhibitors, diagnostics: scrapeResult.diagnostics };
    }`);

fs.writeFileSync('server.ts', server);
