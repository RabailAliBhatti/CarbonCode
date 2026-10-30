// scripts/test-aptabase.js
// Quick test script to verify Aptabase event delivery and unlock your dashboard

const https = require('https');
const os = require('os');

const APP_KEY = 'A-EU-1782276116';
const HOST = 'eu.aptabase.com';
const PATH = '/api/v0/events';

const payload = [
  {
    timestamp: new Date().toISOString(),
    sessionId: `${Math.floor(Date.now() / 1000)}${Math.floor(Math.random() * 100000000).toString().padStart(8, '0')}`,
    eventName: 'app_launch',
    systemProps: {
      locale: 'en-US',
      osName: process.platform === 'win32' ? 'Windows' : 'Other',
      osVersion: os.release(),
      deviceModel: os.arch(),
      isDebug: true,
      appVersion: '4.1.0',
      sdkVersion: 'carboncode-aptabase@1.0.0'
    },
    props: {
      source: 'initial_setup_verification',
      status: 'active'
    }
  }
];

const postData = JSON.stringify(payload);

const options = {
  hostname: HOST,
  port: 443,
  path: PATH,
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'App-Key': APP_KEY,
    'Content-Length': Buffer.byteLength(postData)
  },
  timeout: 10000
};

console.log(`📡 Sending test event to https://${HOST}${PATH} with key ${APP_KEY}...`);

const req = https.request(options, (res) => {
  let responseData = '';
  res.on('data', (chunk) => {
    responseData += chunk;
  });

  res.on('end', () => {
    if (res.statusCode >= 200 && res.statusCode < 300) {
      console.log(`\n✅ SUCCESS! Aptabase received the event (HTTP ${res.statusCode}).`);
      console.log('🎉 Check your Aptabase dashboard in the browser — it should now show active analytics!\n');
    } else {
      console.error(`\n❌ Aptabase returned status: ${res.statusCode} ${res.statusMessage}`);
      console.error('Response:', responseData);
    }
  });
});

req.on('error', (err) => {
  console.error('\n❌ Network request failed:', err.message);
});

req.on('timeout', () => {
  req.destroy();
  console.error('\n❌ Request timed out.');
});

req.write(postData);
req.end();
