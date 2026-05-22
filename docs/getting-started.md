# Getting Started Guide

This guide covers setting up your local workspace, configuring your runtime environments, and running the Expenser application with or without containerization.

---

## 🛠️ Prerequisites

Before you start, ensure you have the following installed on your machine:
- **Node.js**: `v20.x` or higher (Active LTS recommended)
- **npm**: `v10.x` or higher
- **Docker Desktop**: Required for containerized testing and the monitoring stack

---

## 🔑 Environment Configuration

The application uses environment variables for database connections, JWT signing, and Firebase Client authentication.

Create a file named **`.env.local`** at the project root. Paste your production-ready secrets inside:

```env
# MongoDB Atlas Connection String
MONGODB_URI=mongodb+srv://merazhaque74663_db_user:MerajHaque74663@expenser.o0d2wjo.mongodb.net/?appName=Expenser

# JWT Signing Secret
JWT_SECRET=super-secret-key-123-change-this-in-prod

# Firebase Client configuration (Required for Google Auth & client-side components)
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyBnEmRw4blB4Y7SnY4NRxO-731ia3E5iV8
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=expenseee-saver.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=expenseee-saver
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=expenseee-saver.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=170130520249
NEXT_PUBLIC_FIREBASE_APP_ID=1:170130520249:web:e9d5d5d96daf1e2d7e8368
```

> [!WARNING]
> Keep your `.env.local` file strictly local. It is ignored by Git and Docker builds automatically to prevent credential leakage.

---

## 💻 Standard Local Workflows (Without Docker)

If you are editing the frontend layout, styles, or standard React client logic, running natively in Node.js provides hot-module reloading (HMR) and fast iteration.

### 1. Install Dependencies
```bash
npm install
```

### 2. Start the Development Server
```bash
npm run dev
```
*App is accessible at **`http://localhost:3000`***

### 3. Check for Code Linting / Formatting
```bash
npm run lint
```

### 4. Test the Production Build Locally
```bash
npm run build
npm run start
```
*App compiles and starts in production mode at **`http://localhost:3000`***

---

## 🐳 Containerized Local Workflows (With Docker)

Running in Docker ensures your code runs in an identical sandbox to your production servers, validating production standalone builds and database network pathways.

### Workflow A: Run App Only (Lightweight)
To spin up just your application container using your local codebase:

```bash
# Build the local container and launch it in background mode
docker compose up -d --build
```
*App is mapped and accessible at **`http://localhost:5000`***

To bring it down:
```bash
docker compose down
```

---

### Workflow B: Run App + Full Monitoring Stack (Local DevOps Sandbox)
To run your application container alongside the active Prometheus/Grafana/Loki monitoring suite:

```bash
# 1. Load your local environment variables into your active shell session
export $(grep -v '^#' .env.local | xargs)

# 2. Build and launch all application and telemetry services together
docker compose -f docker-compose.yml -f docker-compose.monitoring.yml up -d --build
```

#### Services Dashboard URLs:
- **Expenser Application**: `http://localhost:5000`
- **Grafana Dashboard**: `http://localhost:3001` (Default login: `admin` / `admin`)
- **Prometheus Scraper**: `http://localhost:9090`
- **cAdvisor Metrics**: `http://localhost:8080`

To tear down the monitoring stack but leave the app running:
```bash
docker compose -f docker-compose.monitoring.yml down
```

To tear down the entire stack completely:
```bash
docker compose -f docker-compose.yml -f docker-compose.monitoring.yml down
```
