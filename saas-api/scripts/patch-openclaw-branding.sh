#!/bin/bash
# Re-applies the Automatyn branding patch to OpenClaw's WhatsApp reply path.
# Run after any OpenClaw upgrade. Idempotent: skips if patch already present.
#
# Why: OpenClaw v2026.4.14's plugin `message_sending` hook does NOT fire for
# WhatsApp agent replies (despite plugins inspect showing it registered). The
# real chokepoint is `deliverWebReply` in dist/login-D1rNuBKz.js. We patch
# that function directly to inject the free/starter branding footer once per
# conversation.

set -euo pipefail

TARGET="/usr/lib/node_modules/openclaw/dist/login-D1rNuBKz.js"
MARKER="automatyn-branding"

if [ ! -f "$TARGET" ]; then
  echo "OpenClaw not found at $TARGET" >&2
  exit 1
fi

if grep -q "$MARKER" "$TARGET"; then
  echo "Patch already applied."
  exit 0
fi

export TMP=$(mktemp)
sudo cp "$TARGET" "$TMP"
sudo chown "$(id -un)" "$TMP"
chmod +w "$TMP"

# Insert the branding block right after the shouldSuppressReasoningReply early return.
python3 <<'PY'
import re, sys, os
p = os.environ['TMP']
with open(p, 'r') as f:
    src = f.read()
needle = 'whatsappOutboundLog.debug(`Suppressed reasoning payload to ${msg.from}`);\n\t\treturn;\n\t}'
inject = '''\n\ttry {
\t\tconst fs_ = await import("node:fs");
\t\tconst acctId = msg?.accountId; // automatyn-branding
\t\tif (acctId && replyResult?.text) {
\t\t\tconst dataPath = `/home/marketingpatpat/openclaw/saas-api/data/${acctId}.json`;
\t\t\tif (fs_.existsSync(dataPath)) {
\t\t\t\tconst meta = JSON.parse(fs_.readFileSync(dataPath, "utf-8"));
\t\t\t\tconst plan = (meta.plan || "free").toLowerCase();
\t\t\t\tif (plan === "free" || plan === "starter") {
\t\t\t\t\tconst stateDir = "/tmp/automatyn-branding";
\t\t\t\t\tfs_.mkdirSync(stateDir, { recursive: true });
\t\t\t\t\tconst stateFile = `${stateDir}/${acctId}.json`;
\t\t\t\t\tlet state = {};
\t\t\t\t\ttry { state = JSON.parse(fs_.readFileSync(stateFile, "utf-8")); } catch {}
\t\t\t\t\tconst peer = msg?.from || "unknown";
\t\t\t\t\tif (!state[peer]) {
\t\t\t\t\t\treplyResult.text = (replyResult.text || "") + "\\n\\n_AI agent by Automatyn \xb7 automatyn.co_";
\t\t\t\t\t\tstate[peer] = Date.now();
\t\t\t\t\t\tfs_.writeFileSync(stateFile, JSON.stringify(state));
\t\t\t\t\t}
\t\t\t\t}
\t\t\t}
\t\t}
\t} catch (e) {}'''
if needle not in src:
    print("ERROR: anchor not found in deliverWebReply; manual patch required", file=sys.stderr)
    sys.exit(2)
patched = src.replace(needle, needle + inject, 1)
with open(p, 'w') as f:
    f.write(patched)
PY

sudo cp "$TMP" "$TARGET"
sudo chown root:root "$TARGET"
sudo chmod 644 "$TARGET"
rm -f "$TMP"

echo "Patch applied. Restart gateway: systemctl --user restart openclaw-gateway.service"
