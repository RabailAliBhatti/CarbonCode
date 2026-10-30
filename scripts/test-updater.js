// scripts/test-updater.js
// Quick diagnostic tool to test the GitHub Releases Auto-Updater API

const https = require('https');

const OWNER = 'RabailAliBhatti';
const REPO = 'CarbonCode';
const CURRENT_VERSION = '4.1.0';

console.log(`🔍 Checking GitHub Releases for ${OWNER}/${REPO}...`);
console.log(`📦 Current Local Version: v${CURRENT_VERSION}\n`);

const options = {
  hostname: 'api.github.com',
  path: `/repos/${OWNER}/${REPO}/releases/latest`,
  headers: {
    'User-Agent': 'CarbonCode-Desktop-App',
    'Accept': 'application/vnd.github.v3+json'
  },
  timeout: 15000
};

const req = https.get(options, (res) => {
  let body = '';
  res.on('data', chunk => { body += chunk; });
  res.on('end', () => {
    if (res.statusCode === 404) {
      console.log('ℹ️  No published GitHub releases found yet on GitHub repository.');
      console.log(`   When you publish a new release tag (e.g., v4.2.0) on GitHub,`);
      console.log(`   CarbonCode will automatically notify users and download the update in the background.`);
      return;
    }

    if (res.statusCode !== 200) {
      console.error(`❌ GitHub API responded with status ${res.statusCode}: ${res.statusMessage}`);
      console.error('Response:', body);
      return;
    }

    try {
      const release = JSON.parse(body);
      console.log(`✅ Latest Release Tag: ${release.tag_name}`);
      console.log(`   Published At: ${release.published_at}`);
      console.log(`   Name: ${release.name || release.tag_name}`);

      const assets = release.assets || [];
      console.log(`\n📦 Release Assets (${assets.length} file(s)):`);
      assets.forEach(a => {
        const sizeMB = (a.size / (1024 * 1024)).toFixed(1);
        console.log(`   - ${a.name} (${sizeMB} MB)`);
      });

      const exeAsset = assets.find(a => a.name.toLowerCase().endsWith('.exe'));
      if (exeAsset) {
        console.log(`\n🎯 Compatible Windows Installer found:`);
        console.log(`   File: ${exeAsset.name}`);
        console.log(`   Direct Download URL: ${exeAsset.browser_download_url}`);
      } else {
        console.log(`\n⚠️  No .exe installer asset found in this release.`);
        console.log(`   Make sure your GitHub release includes the built CarbonCode-Setup-*.exe or CarbonCode-Full-*.exe.`);
      }
    } catch (err) {
      console.error('❌ Failed to parse GitHub API response:', err.message);
    }
  });
});

req.on('error', (err) => {
  console.error('❌ Network request error:', err.message);
});

req.on('timeout', () => {
  req.destroy();
  console.error('❌ Request timed out.');
});
