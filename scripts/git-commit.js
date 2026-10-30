// scripts/git-commit.js
const { execSync } = require('child_process');

const msg = process.argv[2] || 'update';
console.log(`Running git add and git commit: "${msg}"...`);

try {
  execSync('git add -A', { stdio: 'inherit' });
  execSync(`git commit -m "${msg.replace(/"/g, '\\"')}"`, { stdio: 'inherit' });
  console.log('✅ Commit successful!');
} catch (err) {
  console.error('❌ Commit error:', err.message);
  process.exit(1);
}
