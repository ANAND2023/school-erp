const ftp = require('basic-ftp');
const path = require('path');

async function deploy() {
  const host = process.env.FTP_HOST || process.argv[2];
  const user = process.env.FTP_USER || process.argv[3];
  const password = process.env.FTP_PASSWORD || process.argv[4];
  const remoteDir = process.env.FTP_REMOTE_DIR || process.argv[5] || 'public_html';

  if (!host || !user || !password) {
    console.log('\nUsage: node deploy-ftp.js <ftp_host> <ftp_user> <ftp_password> [remote_dir]');
    console.log('Example: node deploy-ftp.js ftp.edvantcoretechnology.com u123456789 MySecretPass public_html\n');
    console.log('Or set FTP_HOST, FTP_USER, FTP_PASSWORD environment variables.\n');
    process.exit(1);
  }

  const client = new ftp.Client();
  client.ftp.verbose = true;

  try {
    console.log(`Connecting to FTP host: ${host}...`);
    await client.access({
      host,
      user,
      password,
      secure: 'auto'
    });

    console.log(`Ensuring remote directory: ${remoteDir}...`);
    await client.ensureDir(remoteDir);

    const localDir = path.resolve(__dirname, 'frontend/dist');
    console.log(`Uploading all files from: ${localDir}`);
    await client.uploadFromDir(localDir);

    console.log('\n======================================================');
    console.log('✅ Deployment completed successfully!');
    console.log('🌐 Visit: https://school.edvantcoretechnology.com/');
    console.log('======================================================\n');
  } catch (err) {
    console.error('❌ FTP Deployment failed:', err);
  } finally {
    client.close();
  }
}

deploy();

