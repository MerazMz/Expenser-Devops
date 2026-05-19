# DevOps & Deployment Guide

This guide walks you through Git workflows, the automated GitHub Actions CI/CD pipeline, and hosting both the application and monitoring stack on a production Virtual Private Server (VPS).

---

## 💻 1. The Local-to-Cloud Git Workflow

All application code is securely deployed to production via Git. Every time you push to the `main` branch, our automated CI/CD runs tests and pushes the new Docker image to Docker Hub.

### Step 1: Stage All Local Changes
Once you have tested your modifications locally (e.g., verifying custom route additions or layouts), stage your changes:
```bash
git add .
```

### Step 2: Commit Your Code with a Clear Message
Write a descriptive, professional message detailing your changes:
```bash
git commit -m "feat: integrate Prometheus and Grafana monitoring stack with pre-built dashboards"
```

### Step 3: Push to GitHub
Push the branch to the remote repository:
```bash
git push
```
*This action instantly triggers the GitHub Actions continuous delivery pipelines.*

---

## ⚙️ 2. GitHub Actions CI/CD Pipeline

The repository utilizes two automated workflows located in `.github/workflows/`:

```
GitHub Push to main
   ├── 🟢 Continuous Integration (ci.yml)
   │     ├── Install dependencies (npm ci)
   │     ├── Run linter (eslint)
   │     └── Verify Next.js compilation (next build)
   │
   └── 🟢 Build and Push Docker Image (docker-build.yml)
         ├── Log into Docker Hub Registry
         ├── Build stand-alone Next.js Docker image
         └── Publish image: `merazmz/expenser-app:latest`
```

---

## 🚢 3. Production VPS Deployment Guide

Deploying your containerized application and monitoring stack on a cloud server (such as DigitalOcean, AWS EC2, or Linode running Ubuntu) is simple and highly secure.

### Step 1: Install Docker & Docker Compose on the VPS
Connect to your VPS via SSH and run these standard commands to set up Docker:

```bash
# Update package database
sudo apt update

# Install Docker
sudo apt install -y docker.io docker-compose-v2

# Start and enable Docker daemon
sudo systemctl enable --now docker
```

### Step 2: Clone the Project Repository on your VPS
```bash
git clone https://github.com/MerazMz/Expenser-Devops.git
cd Expenser-Devops
```

### Step 3: Set Up Production Environment Variables
Create a production `.env.local` file inside the project root on the VPS:
```bash
nano .env.local
```
Paste all active production variables (`MONGODB_URI`, `JWT_SECRET`, and `NEXT_PUBLIC_FIREBASE_*` credentials). Save and exit (`Ctrl+O`, `Enter`, `Ctrl+X`).

### Step 4: Boot Up the Application Natively in Docker
To launch the entire suite of services on the VPS:

```bash
# 1. Load variables into active session environment
export $(grep -v '^#' .env.local | xargs)

# 2. Pull the latest compiled image from Docker Hub and start everything
docker compose -f docker-compose.yml -f docker-compose.monitoring.yml pull
docker compose -f docker-compose.yml -f docker-compose.monitoring.yml up -d
```

---

## 🔒 4. Production Firewall & Security (CRITICAL)

For security, you must **never** expose internal telemetry ports to the public internet. Only the app itself (`5000`) and the Grafana dashboard (`3001`) should be open.

Configure your VPS firewall (typically `ufw` on Ubuntu) using these rules:

```bash
# 1. Deny everything by default
sudo ufw default deny incoming
sudo ufw default allow outgoing

# 2. Allow SSH access so you don't lock yourself out
sudo ufw allow ssh

# 3. Allow your Next.js Web App to be visited by users
sudo ufw allow 5000/tcp

# 4. Allow Grafana dashboards (restrict or keep open depending on your needs)
sudo ufw allow 3001/tcp

# 5. Enable the firewall
sudo ufw enable
```

#### Why this is secure:
By applying these rules, ports `9090` (Prometheus), `8080` (cAdvisor), `9100` (Node Exporter), and `3100` (Loki) are **completely blocked** from external scans and hackers. They remain securely connected internally inside the isolated Docker network bridge, visible only to Grafana.
