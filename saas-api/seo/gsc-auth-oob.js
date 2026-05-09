#!/usr/bin/env node
// One-time GSC OAuth via the OOB (out-of-band, copy-paste) flow.
// Use this when the localhost redirect can't reach your browser (e.g. you're SSH'd
// into a server). You sign in on any device, Google shows a code on screen, you
// paste it back to this script.
//
// Usage:
//   1. Run: node seo/gsc-auth-oob.js
//   2. Open the printed URL on any device, sign in with the Google account that
//      owns Search Console for automatyn.co
//   3. Google displays a code on screen
//   4. Paste it back at the prompt below
//   5. Token saved to secrets/gsc-token.json

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { google } = require('googleapis');

const CLIENT_PATH = path.join(__dirname, '..', 'secrets', 'gsc-oauth-client.json');
const TOKEN_PATH = path.join(__dirname, '..', 'secrets', 'gsc-token.json');
const SCOPES = ['https://www.googleapis.com/auth/webmasters.readonly'];

const client = JSON.parse(fs.readFileSync(CLIENT_PATH, 'utf8')).installed;
const oauth2 = new google.auth.OAuth2(
  client.client_id,
  client.client_secret,
  'urn:ietf:wg:oauth:2.0:oob',
);

const authUrl = oauth2.generateAuthUrl({
  access_type: 'offline',
  prompt: 'consent',
  scope: SCOPES,
});

console.log('\n=== GSC OAuth (OOB / copy-paste flow) ===\n');
console.log('1. Open this URL on any device, sign in with the Google account that owns');
console.log('   Search Console for automatyn.co:\n');
console.log(authUrl);
console.log('\n2. Google will show a code on screen. Paste it below and press Enter.\n');

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
rl.question('Code: ', async (code) => {
  rl.close();
  try {
    const { tokens } = await oauth2.getToken(code.trim());
    fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens, null, 2));
    fs.chmodSync(TOKEN_PATH, 0o600);
    console.log(`\n✓ Token saved to ${TOKEN_PATH}`);
    if (!tokens.refresh_token) {
      console.log('⚠ No refresh_token in response — you may need to revoke the existing grant first');
      console.log('  at https://myaccount.google.com/permissions and retry.');
    }
  } catch (err) {
    console.error('\n✗ Token exchange failed:', err.message);
    process.exit(1);
  }
});
