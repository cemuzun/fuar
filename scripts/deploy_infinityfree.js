import { Client } from 'basic-ftp';
import path from 'path';
import fs from 'fs';
import { execSync } from 'child_process';

const FTP_HOST = process.env.FTP_HOST || 'ftpupload.net';
const FTP_USER = process.env.FTP_USER || 'if0_42549959';
const FTP_PASS = process.env.FTP_PASS; // Prompted or read from environment

async function deploy() {
  console.log('=== ExhibitorNexus InfinityFree Deployment ===');
  console.log(`Domain: http://otr0zlu3.infinityfree.com`);
  console.log(`FTP Server: ${FTP_HOST}`);
  console.log(`FTP User: ${FTP_USER}`);

  if (!FTP_PASS) {
    console.error('\n❌ ERROR: FTP Password is required!');
    console.log('\nPlease run the script with your InfinityFree vPanel/FTP password like this:\n');
    console.log('  FTP_PASS="YOUR_FTP_PASSWORD" node scripts/deploy_infinityfree.js\n');
    console.log('Or add FTP_PASS to your .env file.');
    process.exit(1);
  }

  // 1. Build Production Frontend
  console.log('\n[1/3] Building production frontend bundle (dist/)...');
  try {
    execSync('npm run build', { stdio: 'inherit' });
  } catch (err) {
    console.error('❌ Build failed:', err.message);
    process.exit(1);
  }

  // Ensure .htaccess for React SPA routing exists in dist
  const htaccessContent = `<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  RewriteRule ^index\\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule . /index.html [L]
</IfModule>`;
  fs.writeFileSync(path.join(process.cwd(), 'dist', '.htaccess'), htaccessContent);

  // 2. Connect to FTP
  const client = new Client();
  client.ftp.verbose = true;

  try {
    console.log('\n[2/3] Connecting to InfinityFree FTP server...');
    await client.access({
      host: FTP_HOST,
      user: FTP_USER,
      password: FTP_PASS,
      secure: false
    });

    console.log('Connected successfully!');

    // 3. Upload to htdocs
    console.log('\n[3/3] Uploading dist/ folder to htdocs...');
    await client.ensureDir('/htdocs');
    await client.clearWorkingDir();
    await client.uploadFromDir(path.join(process.cwd(), 'dist'));

    console.log('\n✅ DEPLOYMENT SUCCESSFUL!');
    console.log('Your application is live at: http://otr0zlu3.infinityfree.com');
  } catch (err) {
    console.error('❌ FTP Upload Error:', err.message);
  } finally {
    client.close();
  }
}

deploy();
