#!/bin/bash

# Exit on errors
set -e

# Update & install dependencies
apt-get update && apt-get install -y wget

# Download and install Chrome
mkdir -p /opt/render/.cache/puppeteer
cd /opt/render/.cache/puppeteer
wget https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb
apt-get install -y ./google-chrome-stable_current_amd64.deb
