const https = require('https');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const FRP_VERSION = '0.61.1';
const RESOURCES_DIR = path.join(__dirname, '..', 'resources', 'bin');

function getArch() {
  const arch = process.arch;
  switch (arch) {
    case 'x64': return 'amd64';
    case 'arm64': return 'arm64';
    case 'arm': return 'arm';
    default: throw new Error(`Unsupported architecture: ${arch}`);
  }
}

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, (response) => {
      if (response.statusCode === 302 || response.statusCode === 301) {
        // Follow redirect
        https.get(response.headers.location, (redirectResponse) => {
          redirectResponse.pipe(file);
          file.on('finish', () => {
            file.close();
            resolve();
          });
        }).on('error', reject);
      } else {
        response.pipe(file);
        file.on('finish', () => {
          file.close();
          resolve();
        });
      }
    }).on('error', reject);
  });
}

async function main() {
  const arch = getArch();
  const tarName = `frp_${FRP_VERSION}_linux_${arch}.tar.gz`;
  const url = `https://github.com/fatedier/frp/releases/download/v${FRP_VERSION}/${tarName}`;

  console.log(`Downloading frpc v${FRP_VERSION} for ${arch}...`);

  // Create resources/bin directory
  if (!fs.existsSync(RESOURCES_DIR)) {
    fs.mkdirSync(RESOURCES_DIR, { recursive: true });
  }

  const tarPath = path.join(RESOURCES_DIR, tarName);
  const frpcPath = path.join(RESOURCES_DIR, 'frpc');

  // Skip if frpc already exists
  if (fs.existsSync(frpcPath)) {
    console.log('frpc already exists, skipping download');
    return;
  }

  // Download
  await downloadFile(url, tarPath);
  console.log('Downloaded, extracting...');

  // Extract frpc binary
  execSync(`tar -xzf "${tarPath}" -C "${RESOURCES_DIR}" --strip-components=1 "frp_${FRP_VERSION}_linux_${arch}/frpc"`, {
    stdio: 'inherit'
  });

  // Make executable
  fs.chmodSync(frpcPath, 0o755);

  // Clean up tar
  fs.unlinkSync(tarPath);

  console.log(`frpc v${FRP_VERSION} installed to ${frpcPath}`);
}

main().catch(err => {
  console.error('Error downloading frpc:', err);
  process.exit(1);
});
