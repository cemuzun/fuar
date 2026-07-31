const fs = require('fs');

let server = fs.readFileSync('server.ts', 'utf8');

server = server.replace(`    } catch (aiErr) {
        console.log('AI Extraction encountered a rate limit or error:', aiErr.message);
      }
    
    }`, `    } catch (aiErr: any) {
        console.log('AI Extraction encountered a rate limit or error:', aiErr.message);
    }`);

fs.writeFileSync('server.ts', server);
