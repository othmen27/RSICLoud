# OpenNebula UI

OpenNebula UI is a small web dashboard for managing OpenNebula resources from one place. It includes a React frontend and a Node.js backend that talks to the OpenNebula XML-RPC API.

The dashboard can be used to:

- View and manage virtual machines
- Create VMs from images and templates
- Browse images and networks
- Open browser-based VNC and SSH sessions
- Check Docker and Kubernetes resources when the related addons are installed
- Install and manage supported addons from the UI

## How it works

The project has two parts:

- `client/` - React 19 application built with Vite
- `server/` - Express API that handles authentication and proxies requests to OpenNebula

The frontend runs on port `5173` by default. The backend runs on port `3001`.

## Requirements

- Node.js and npm
- A reachable OpenNebula installation
- OpenNebula XML-RPC access, usually at port `2633`
- Docker and OneKE only if you plan to use the related addon features

## Quick start

From the project root, run:

```bash
bash quick-start.sh
```

Then start the two services in separate terminals:

```bash
cd server
npm start
```

```bash
cd client
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

You can also install dependencies manually:

```bash
cd server && npm install
cd ../client && npm install
```

## Configuration

Create `server/.env` with the connection details for your OpenNebula environment:

```env
PORT=3001
ON_ENDPOINT=http://localhost:2633/RPC2
JWT_SECRET=replace-this-with-a-long-random-value
```

The app uses the OpenNebula credentials entered through the application. Keep `.env` out of version control and use a strong `JWT_SECRET` outside local development.

The frontend currently expects the backend at `http://localhost:3001/api`. If your backend runs somewhere else, update the API base URL in `client/src/services/opennebulaApi.js`.

## Addons

Docker and Kubernetes pages depend on their OpenNebula addons. The UI can manage addon downloads, or you can use the system setup script:

```bash
bash install-addons.sh
```

The script may install system packages and requires `sudo` on supported Linux distributions. It uses `${HOME}/.opennebula/addons` by default; set `ADDONS_DIR` to choose another location.

## Useful commands

Frontend:

```bash
cd client
npm run dev       # Start the Vite development server
npm run build     # Create a production build
npm run lint      # Run ESLint
npm run preview   # Preview the production build
```

Backend:

```bash
cd server
npm start         # Start the API server
npm run dev       # Start with automatic reload
npm test          # Run the API tests
```

## Project layout

```text
client/             React and Vite frontend
server/             Express backend and API tests
server/data/        Local application data
server/public/vnc/  Embedded noVNC client
quick-start.sh      Local development setup helper
install-addons.sh   Docker and OneKE installation helper
```

## Notes

This project is intended for development and internal use. User accounts and VM ownership are currently stored in memory, so they are reset when the backend restarts. Before using it in production, add persistent storage, review authentication and authorization, and move all credentials and secrets into secure configuration.

## Contributing

Small, focused improvements are welcome. Please run the frontend lint check and backend tests before opening a pull request.
