#!/bin/bash
cd /home/marketingpatpat/openclaw/saas-api
exec /usr/bin/node server.js >> /home/marketingpatpat/openclaw/saas-api/server.log 2>&1
