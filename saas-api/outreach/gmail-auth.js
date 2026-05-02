#!/usr/bin/env node
// One-time OAuth: prints a URL, you paste the code back, refresh token saved.
// Re-run only if gmail-token.json is deleted or the refresh token is revoked.
// Mirrors seo/gsc-auth.js but for Gmail readonly + a different port.

const fs = require('fs');
const path = require('path');
const http = require('http');
const { URL } = require('url');
const { google } = require('googleapis');

const CLIENT_PATH = path.join(__dirname, '..', 'secrets', 'gmail-oauth-client.json');
const TOKEN_PATH = path.join(__dirname, '..', 'secrets', 'gmail-token.json');
const SCOPES = ['https://www.googleapis.com/auth/gmail.readonly'];
const PORT = 8766;
const REDIRECT = `http://localhost:${PORT}/oauth2callback`;

const client = JSON.parse(fs.readFileSync(CLIENT_PATH, 'utf8')).installed;
const oauth2 = new google.auth.OAuth2(client.client_id, client.client_secret, REDIRECT);

const authUrl = oauth2.generateAuthUrl({
  access_type: 'offline',
  prompt: 'consent',
  scope: SCOPES
});

console.log('\n=== Gmail OAuth ===\n');
console.log('1. Open this URL in a browser signed into the Google account whose inbox you want to read:\n');
console.log(authUrl);
console.log('\n2. Approve access. Browser will redirect to localhost:8766 — this script will catch the code and save the refresh token.\n');

const server = http.createServer(async (req, res) => {
  if (!req.url.startsWith('/oauth2callback')) { res.end('not found'); return; }
  const code = new URL(req.url, `http://localhost:${PORT}`).searchParams.get('code');
  if (!code) { res.end('no code'); return; }
  try {
    const { tokens } = await oauth2.getToken(code);
    fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens, null, 2));
    fs.chmodSync(TOKEN_PATH, 0o600);
    res.end('OK — token saved. You can close this tab.');
    console.log(`\nSaved refresh token to ${TOKEN_PATH}`);
    server.close();
    process.exit(0);
  } catch (e) {
    res.end('error: ' + e.message);
    console.error(e);
    process.exit(1);
  }
});

server.listen(PORT, () => console.log(`Listening on ${REDIRECT} for the callback...`));
