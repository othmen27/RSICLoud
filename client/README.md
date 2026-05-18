# OpenNebula UI

A modern, responsive frontend for managing OpenNebula virtual machines and resources.

## Features

- **Dashboard**: View all virtual machines with status and basic info
- **VM Management**: Create, view details, start/stop VMs
- **Images**: Manage OS images and templates
- **Docker**: View and manage Docker containers (requires Docker Machine addon)
- **Kubernetes**: Manage Kubernetes clusters (requires Kubernetes addon)
- **Modern UI**: Built with React, Tailwind CSS, and Framer Motion animations
- **Responsive Design**: Works on desktop and mobile devices
- **Dark Mode Support**: Automatic dark/light mode based on system preference

## Tech Stack

- **Frontend**: React 19, Vite, Tailwind CSS v4, Framer Motion, React Icons, React Router
- **Backend**: Node.js, Express, Axios, CORS
- **Testing**: Jest, Supertest

## Setup

1. **Backend Setup**:
   ```bash
   cd server
   npm install
   # Configure .env with your OpenNebula credentials
   npm start
   ```

2. **Frontend Setup**:
   ```bash
   cd client
   npm install
   npm run dev
   ```

3. Open http://localhost:5174 in your browser

## OpenNebula Integration

The backend proxies requests to OpenNebula API. Configure credentials in `server/.env`:

```env
ON_ENDPOINT=http://your-opennnebula-server:2633/RPC2
ON_USERNAME=oneadmin
ON_PASSWORD=your-password
PORT=3001
```

## API Endpoints

### VMs
- `GET /api/vms` - List all VMs
- `GET /api/vms/:id` - Get VM details
- `POST /api/vms` - Create new VM
- `POST /api/vms/:id/action` - Perform action (start/stop)

### Images
- `GET /api/images` - List all images
- `GET /api/images/:id` - Get image details
- `POST /api/images` - Create new image

### Networks
- `GET /api/networks` - List all networks

### Docker
- `GET /api/docker/containers` - List Docker containers

### Kubernetes
- `GET /api/kubernetes/clusters` - List Kubernetes clusters

### Addons Management
- `GET /api/addons` - List all available addons
- `GET /api/addons/status` - Check addon installation status
- `POST /api/addons/:name/install` - Download and install addon
- `DELETE /api/addons/:name` - Uninstall addon

## Addons System

The application includes a comprehensive addon management system for extending OpenNebula functionality:

### Available Addons

1. **Docker Machine** (docker-machine)
   - Manage Docker containers as virtual machines
   - Version: 1.2.0
   - Downloads from: GitHub OpenNebula addon repository

2. **Kubernetes** (kubernetes)
   - Deploy and manage Kubernetes clusters
   - Version: 1.3.0
   - Downloads from: GitHub OpenNebula addon repository

### Managing Addons

1. Navigate to **Addons** page from the main navigation
2. View all available addons with their status
3. Click **Install Addon** to download and install
4. Click **Uninstall** to remove an addon
5. Installation status is checked automatically every 2 seconds

### Addon Requirements

- Write permissions to `/var/lib/opennebula/addons`
- Stable internet connection for downloading
- Sufficient disk space
- OpenNebula system running and configured

## Running Tests

```bash
cd server
npm test
```

## Addons Required

- **Docker Integration**: Requires OpenNebula Docker Machine addon
- **Kubernetes Integration**: Requires OpenNebula Kubernetes addon

## Development

- Backend runs on port 3001
- Frontend runs on port 5173/5174
- Hot reload enabled for both

## Contributing

Feel free to contribute by adding new features or improving the UI!
