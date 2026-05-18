# OpenNebula Docker & Kubernetes Setup Guide

## Overview

This guide covers the complete setup of Docker and Kubernetes (OneKE) addons for OpenNebula using the integrated addon management system in the OpenNebula UI.

## Quick Start

### 1. Initialize Environment

```bash
# Run from the project root directory
bash quick-start.sh
```

This script will:
- Create the addon directory (`~/.opennebula/addons`)
- Install Node.js dependencies
- Prepare the environment

### 2. Start Backend and Frontend

**Terminal 1 - Backend:**
```bash
cd server
npm start
```

**Terminal 2 - Frontend:**
```bash
cd client
npm run dev
```

### 3. Access the UI

Open http://localhost:5173 and log in with:
- **Username**: admin
- **Password**: password

### 4. Install Addons via UI

1. Navigate to **Addons** in the top navigation
2. Click **Install Addon** on Docker Machine or Kubernetes addon
3. Wait for installation to complete
4. Check Docker and Kubernetes pages to use the features

## Complete System Installation

For production use with actual Docker and Kubernetes capabilities:

```bash
# Run the comprehensive installation script
bash install-addons.sh
```

This script will guide you through:
- Installing Docker
- Installing Kubernetes prerequisites
- Installing OneKE addon
- Installing Docker Machine addon
- Verifying the installation

### Prerequisites for Full Installation

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install -y curl wget git build-essential
```

**CentOS/RHEL/Fedora:**
```bash
sudo yum install -y curl wget git gcc make
```

## Architecture

### Components

```
┌─────────────────────────────────────────────────────┐
│           OpenNebula UI (React/Vite)               │
│  ┌──────────────────────────────────────────────┐  │
│  │  Addons Page | Docker | Kubernetes Pages    │  │
│  └──────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
              ↓ (HTTP/Axios)
┌─────────────────────────────────────────────────────┐
│        Backend Server (Express.js Node)            │
│  ┌──────────────────────────────────────────────┐  │
│  │  Addon Management System                     │  │
│  │  - Download & Install addons                 │  │
│  │  - Check installation status                 │  │
│  │  - OpenNebula API proxy                      │  │
│  └──────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────────────────┐
│    Addon Directory (~/.opennebula/addons)          │
│  ┌──────────────────────────────────────────────┐  │
│  │  ├── docker-machine/                         │  │
│  │  │   └── ... addon files                     │  │
│  │  └── oneke/                                  │  │
│  │      └── ... addon files                     │  │
│  └──────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────────────────┐
│         System-Level Docker & Kubernetes           │
│  ┌──────────────────────────────────────────────┐  │
│  │  Docker daemon (via addon)                   │  │
│  │  Kubernetes cluster (via OneKE)              │  │
│  └──────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

## API Endpoints

### Addon Management

```
GET    /api/addons              # List all available addons
GET    /api/addons/status       # Check installation status
POST   /api/addons/:name/install # Start addon installation
DELETE /api/addons/:name        # Uninstall addon
```

### Docker Integration (requires docker-machine addon)

```
GET    /api/docker/containers   # List Docker containers
```

### Kubernetes Integration (requires kubernetes addon)

```
GET    /api/kubernetes/clusters # List Kubernetes clusters
```

## Addon Details

### Docker Machine Addon

**What it does:**
- Manages Docker containers through OpenNebula
- Provides VM-like interface for containers
- Enables container orchestration via OpenNebula

**Installation:**
```bash
# Via UI: Addons page → Install Addon
# Or manually:
cd ~/.opennebula/addons
git clone https://github.com/OpenNebula/addon-docker-machine.git
```

**Requirements:**
- Docker installed on host
- Write permissions to addon directory
- Network access to Docker daemon

**Usage:**
1. Install addon via UI
2. Go to Docker page
3. Deploy and manage containers

### Kubernetes Addon (OneKE)

**What it does:**
- Deploys Kubernetes clusters
- Manages cluster lifecycle
- Provides integration with OpenNebula orchestration

**Installation:**
```bash
# Via UI: Addons page → Install Addon
# Or manually:
cd ~/.opennebula/addons
git clone https://github.com/OpenNebula/oneke.git
```

**Requirements:**
- Ruby and development tools
- kubectl CLI
- Git
- Network connectivity
- Kubernetes knowledge

**Usage:**
1. Install addon via UI
2. Go to Kubernetes page
3. Create and manage clusters

## Environment Configuration

### Custom Addon Directory

Set the `ADDONS_DIR` environment variable:

```bash
# In .env file (server/.env)
ADDONS_DIR=/custom/path/to/addons

# Or via shell
export ADDONS_DIR=/custom/path/to/addons
npm start
```

Default locations (checked in order):
1. `$ADDONS_DIR` (environment variable)
2. `/var/lib/opennebula/addons` (system path)
3. `~/.opennebula/addons` (fallback, home directory)

### OpenNebula Configuration

Configure in `server/.env`:

```env
ON_ENDPOINT=http://localhost:2633/RPC2
ON_USERNAME=oneadmin
ON_PASSWORD=your-password
```

## Troubleshooting

### Permission Denied Error

**Problem:** `EACCES: permission denied, mkdir '/var/lib/opennebula/addons'`

**Solution:**
- Fallback to home directory happens automatically
- Or set `ADDONS_DIR` to a writable location
- Or run with sudo: `sudo npm start`

### Addon Download Fails

**Problem:** Network error during addon download

**Solution:**
```bash
# Check internet connection
ping github.com

# Manually download addon
cd ~/.opennebula/addons
git clone https://github.com/OpenNebula/addon-docker-machine.git
git clone https://github.com/OpenNebula/oneke.git
```

### Docker Page Shows Installation Prompt

**Problem:** "Docker Machine addon not installed"

**Solution:**
1. Go to Addons page
2. Click "Install Addon" for Docker Machine
3. Wait for installation
4. Refresh Docker page

### Kubernetes Page Shows Installation Prompt

**Problem:** "Kubernetes addon not installed"

**Solution:**
1. Go to Addons page
2. Click "Install Addon" for Kubernetes
3. Install system dependencies: `bash install-addons.sh`
4. Refresh Kubernetes page

### Port Already in Use

**Problem:** `EADDRINUSE: address already in use :::3001`

**Solution:**
```bash
# Find and kill process using port 3001
lsof -ti:3001 | xargs kill -9

# Or use different port
PORT=3002 npm start
```

## File Structure

```
opennebula-ui/
├── client/                          # React frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── Addons.jsx          # Addon management UI
│   │   │   ├── Docker.jsx          # Docker integration
│   │   │   ├── Kubernetes.jsx      # Kubernetes integration
│   │   │   └── ...
│   │   ├── App.jsx                  # Main app with routes
│   │   └── services/
│   │       └── opennebulaApi.js    # API client
│   └── package.json
├── server/                          # Express backend
│   ├── index.js                     # Main server + addon system
│   ├── .env                         # Configuration
│   └── package.json
├── quick-start.sh                   # Quick setup script
├── install-addons.sh                # Full installation script
├── ADDONS_IMPLEMENTATION.md         # Implementation details
└── DOCKER_K8S_SETUP_GUIDE.md       # This file
```

## Performance Notes

- Addon status is checked every 2 seconds (configurable)
- Installation happens asynchronously in background
- No blocking operations during install/uninstall
- Suitable for development and small deployments

## Security Considerations

⚠️ **Development Only:**
- Default credentials used
- No SSL/TLS enabled
- Addons directory accessible locally
- JWT secret is hardcoded

**For Production:**
- Change JWT secret in `.env`
- Use strong OpenNebula credentials
- Enable HTTPS
- Restrict addon directory permissions
- Run behind reverse proxy
- Use environment-specific configuration

## Advanced Usage

### Manual Addon Installation

```bash
# Navigate to addon directory
cd ~/.opennebula/addons

# Clone addon repository
git clone https://github.com/OpenNebula/addon-docker-machine.git

# Check if installed
ls -la docker-machine/

# UI will automatically detect it
```

### Monitoring Addon Installation

Check server logs:
```bash
# Terminal running npm start
# Look for lines like:
# "Successfully installed addon: docker-machine"
# "Failed to install addon docker-machine: ..."
```

### Custom Addon Development

To add your own addon:

1. Update `ADDONS_DATA` in `server/index.js`
2. Implement download URL
3. Add UI component for management
4. Test via addon system

## Support & Documentation

- **OpenNebula Docs**: https://docs.opennebula.io
- **OneKE Docs**: https://docs.opennebula.io/stable/reference/addons/oneke.html
- **Docker Docs**: https://docs.docker.com
- **Kubernetes Docs**: https://kubernetes.io/docs

## Next Steps

1. ✅ Run quick-start.sh
2. ✅ Start backend and frontend
3. ✅ Access UI at http://localhost:5173
4. ✅ Install addons via UI
5. ✅ Use Docker/Kubernetes pages
6. ✅ (Optional) Run full system installation for production use

Happy cloud managing! 🚀
