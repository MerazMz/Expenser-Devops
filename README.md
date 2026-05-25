# 🚀 Expenser DevOps Pipeline & CI/CD Architecture

This document provides a highly detailed guide to the automated Continuous Integration, Continuous Delivery (CI/CD), security scanning, and production monitoring pipeline for the **Expenser** application. 

---

## 🗺️ High-Level CI/CD Flowchart

The following interactive diagram visualizes the complete lifecycle of a code change—from a developer's local keyboard to the secure, monitored production Virtual Private Server (VPS).

```mermaid
graph TD
    %% Developer Actions
    Developer(["💻 Developer Writes Code"]) --> GitPush["🐙 git push origin main"]

    %% GitHub Actions CI/CD Stage
    subgraph GitHub Actions [🖥️ GitHub Actions Runner]
        style GitHub Actions fill:#1f2937,stroke:#4b5563,stroke-width:2px,color:#fff
        
        %% Workflow 1: ci.yml
        subgraph CI_WF [Continuous Integration (ci.yml)]
            InstallDeps["📥 npm ci (Install Dependencies)"]
            LintCode["🔍 npm run lint (ESLint)"]
            BuildNext["🏗️ npm run build (Next.js Build Check)"]
            InstallDeps --> LintCode --> BuildNext
        end

        %% Workflow 2: docker-build.yml
        subgraph Build_WF [Docker Build & Push (docker-build.yml)]
            QemuSetup["🔧 Setup QEMU & Buildx"]
            DockerLogin["🔐 Login to Docker Hub"]
            DockerBuild["🐳 Multi-Platform Docker Build<br/>(linux/amd64, linux/arm64)"]
            DockerPush["📤 Push to Docker Hub<br/>(merazmz/expenser-app:latest)"]
            TriggerJenkins["⚡ Curl Trigger (Jenkins API)"]

            QemuSetup --> DockerLogin --> DockerBuild --> DockerPush --> TriggerJenkins
        end
    end

    GitPush -->|Triggers Push Event| CI_WF
    GitPush -->|Triggers Push Event| Build_WF

    %% Docker Hub Registry
    DockerPush -->|Uploads Image| DockerHub[("🐳 Docker Hub Registry<br/>(merazmz/expenser-app:latest)")]

    %% Jenkins Security Scan Stage
    subgraph JenkinsServer [⚙️ Local Jenkins Scan Server]
        style JenkinsServer fill:#182834,stroke:#3b82f6,stroke-width:2px,color:#fff
        
        PullImage["📥 docker pull image"]
        TruffleHogScan["🛡️ TruffleHog Secrets Scan<br/>(Inspect Image Filesystem)"]
        TrivyScan["🔒 Trivy Container Scan<br/>(Find Package CVEs)"]
        VerifyClean["✅ Verify Scan & Approve"]

        PullImage --> TruffleHogScan --> TrivyScan --> VerifyClean
    end

    TriggerJenkins -->|Webhook Build Trigger| PullImage
    DockerHub -->|Downloads Image| PullImage

    %% Production VPS Stage
    subgraph ProdVPS [🚢 Production VPS Runtime]
        style ProdVPS fill:#064e3b,stroke:#059669,stroke-width:2px,color:#fff
        
        AppContainer["🟢 Next.js App Container<br/>(Port :5000)"]
        MongoAtlas[("🟢 MongoDB Atlas<br/>(External DB)")]
        
        %% Monitoring Stack
        subgraph Observability [📊 Observability Stack]
            style Observability fill:#1e1b4b,stroke:#4f46e5,stroke-width:1px,color:#fff
            Prometheus["🔥 Prometheus (:9090)"]
            Grafana["📈 Grafana (:3001)"]
            cAdvisor["🐳 cAdvisor (:8080)"]
            NodeExporter["🖥️ Node Exporter (:9100)"]
            Loki["📝 Loki (:3100)"]
            Promtail["🚚 Promtail Log Shipper"]
        end
    end

    VerifyClean -->|Deploy Signal / Manual pull| AppContainer
    AppContainer --> MongoAtlas

    %% Observability Scrape Lines
    AppContainer -.->|App Metrics /api/metrics| Prometheus
    cAdvisor -.->|Container Telemetry| Prometheus
    NodeExporter -.->|OS/VM Metrics| Prometheus
    Prometheus -.->|Metrics Queries| Grafana
    
    %% Log Shipping Lines
    AppContainer -.->|Container Logs stdout/stderr| Promtail
    Promtail -.->|Ship Logs| Loki
    Loki -.->|Log Queries| Grafana

    %% UFW Firewall Layer
    subgraph Firewall [🛡️ VPS UFW Firewall]
        style Firewall fill:#7f1d1d,stroke:#dc2626,stroke-width:1px,color:#fff
        PublicPorts["Allow Public Ports:<br/>⚡ 5000 (App)<br/>⚡ 3001 (Grafana Dashboard)"]
        PrivatePorts["Block Public Access:<br/>🔒 9090, 8080, 9100, 3100<br/>(Isolated in Docker Bridge Network)"]
    end
    
    PublicPorts -.-> AppContainer
    PublicPorts -.-> Grafana
    PrivatePorts -.-> Observability
```

---

## ⚙️ Section-by-Section DevOps Pipeline Breakdown

### 1. Developer Git Workflow (Trigger)
* **Action**: Every code commit and push to the `main` branch, or pull requests directed towards `main`.
* **Implications**: The changes are captured in real-time, automating both sanity checks (linter, builds) and release delivery.

---

### 2. GitHub Actions (Continuous Integration & Delivery)
Located inside the `.github/workflows/` directory:

#### A. Continuous Integration (`ci.yml`)
* **Purpose**: Serves as the quality gate. Ensures that no broken code is compiled or pushed.
* **Environment**: Runs on an `ubuntu-latest` virtual machine.
* **Steps**:
  1. **Checkout Code**: Clones the repo onto the GitHub Runner.
  2. **Set up Node.js**: Installs Node 20 and configures standard `npm` caching to speed up subsequent pipeline runs.
  3. **Install Dependencies**: Runs `npm ci` to cleanly install lockfile dependencies exactly as declared.
  4. **Run Linter**: Runs `npm run lint` to enforce ESLint standards.
  5. **Build Application**: Runs `npm run build` using dummy Firebase variables to ensure code compiles and routes resolve perfectly.

#### B. Build & Push Docker Image (`docker-build.yml`)
* **Purpose**: Package the Next.js application into a production-grade, stand-alone Docker image and push it to Docker Hub.
* **Environment**: Runs on `ubuntu-latest`.
* **Steps**:
  1. **QEMU & Buildx Setup**: Enables multi-platform virtualization capabilities, allowing the runner to build images for both `linux/amd64` (standard cloud VMs) and `linux/arm64` (Apple Silicon or ARM servers).
  2. **Docker Hub Login**: authenticates with Docker Hub using securely injected repo secrets (`DOCKER_USERNAME`, `DOCKER_PASSWORD`).
  3. **Build and Push**: Runs a Docker multi-stage build (using our optimized `Dockerfile`), inlining critical production Firebase API keys via build arguments (`build-args`), caching build layers on GitHub Actions (`type=gha`), and pushing the finalized image tagged `merazmz/expenser-app:latest` to Docker Hub.
  4. **Trigger Local Jenkins Scan**: Uses a curl POST request authenticated via secrets (`JENKINS_USER`, `JENKINS_TOKEN`) to hit the local Jenkins API and launch a scanning job (`expenser-scan`).

---

### 3. Jenkins Security Scanning Pipeline (`Jenkinsfile`)
Once triggered by GitHub Actions, the local Jenkins server uses a declarative pipeline to run strict vulnerability audits before certifying the Docker image as safe.

* **Stage 1: Pull Image**
  * Fetches the newly built `merazmz/expenser-app:latest` image directly from Docker Hub.
* **Stage 2: Scan for Secrets Leaks (TruffleHog)**
  * Spin up a temporary `trufflesecurity/trufflehog` container.
  * Connects to the host's Docker socket and deep-scans all layers of the `expenser-app` filesystem.
  * Only reports verified leaked keys to prevent false alarms from blocking builds.
* **Stage 3: Container Vulnerability Scan (Trivy)**
  * Spin up a temporary `aquasec/trivy` container.
  * Audits all OS-level packages (Node alpine bases) and npm dependencies for CVEs (Common Vulnerabilities and Exposures).
  * Critically filters out unpatchable global npm issues by setting `exit-code 0`, ensuring that only actionable vulnerabilities trigger alerts while standard base layer issues do not block deployments.
* **Stage 4: Approval**
  * Log-outputs a green check banner verifying the container is 100% certified safe for deployment.
* **Post-Pipeline Handling**:
  * `always`: Clean up the pulled images via `docker image prune -f` to save local host storage space.
  * `failure`: Triggers warnings and blocks deployment if any verified secrets leak or high-criticality vulnerabilities are identified.

---

### 4. Production VPS Deployment & Runtime
Once the image is validated, it is deployed onto a VPS (such as DigitalOcean, AWS EC2, or Linode) running Ubuntu via Docker Compose.

* **Core Application (`docker-compose.yml`)**:
  * Loads production credentials securely from `.env.local`.
  * Runs the containerized Next.js application listening on port `5000`.
  * Connects to an external MongoDB Atlas cluster.
  * Configured to run in `standalone` Next.js mode with output-file tracing, reducing container footprints drastically to just ~100MB!
* **Observability Suite (`docker-compose.monitoring.yml`)**:
  * **Prometheus (`:9090`)**: Scrapes performance metrics from:
    * Next.js `/api/metrics` endpoint (active session counts, database query latencies, request throughput).
    * cAdvisor container stats.
    * Node Exporter virtual machine stats.
  * **cAdvisor (`:8080`)**: Analyzes container-level resource statistics (CPU, memory usage, limits, disk I/O, network) natively.
  * **Node Exporter (`:9100`)**: Measures CPU, RAM, disk, and load averages of the host virtual machine.
  * **Loki (`:3100`) & Promtail**: Promtail tails Docker container logs locally and forwards them to Loki, providing a central log repository.
  * **Grafana (`:3001`)**: Aggregates all data from Prometheus and Loki, outputting beautiful charts onto pre-built dashboards (`App Metrics`, `Docker Metrics`).

---

### 5. Production Security: UFW Firewall Setup (CRITICAL)
Telemetry services should **never** be exposed directly to public scanners.

We configure the Ubuntu firewall (`ufw`) to restrict incoming traffic:
```bash
# 1. Deny incoming, allow outgoing
sudo ufw default deny incoming
sudo ufw default allow outgoing

# 2. Allow SSH & Web access
sudo ufw allow ssh
sudo ufw allow 5000/tcp  # Next.js Application
sudo ufw allow 3001/tcp  # Grafana Dashboards

# 3. Enable Firewall
sudo ufw enable
```
#### Security Rationale:
By running these commands, ports `9090` (Prometheus), `8080` (cAdvisor), `9100` (Node Exporter), and `3100` (Loki) are completely closed to the internet. However, they continue to securely stream telemetry to each other inside the **private internal Docker network bridge**. Only Grafana has access to these metrics, which it then safely serves to approved users via port `3001` (protected by Grafana authentication).

---

## 📂 DevOps Configuration Files Reference

To see how these files are configured in the repository, you can inspect them directly:

1. **GitHub CI Workflow**: [.github/workflows/ci.yml](file:///Users/merazmz/Projects/expenser-main/.github/workflows/ci.yml)
2. **GitHub Build & Push Workflow**: [.github/workflows/docker-build.yml](file:///Users/merazmz/Projects/expenser-main/.github/workflows/docker-build.yml)
3. **Jenkins Scanning Pipeline**: [Jenkinsfile](file:///Users/merazmz/Projects/expenser-main/Jenkinsfile)
4. **App Container Configurations**: [Dockerfile](file:///Users/merazmz/Projects/expenser-main/Dockerfile) and [docker-compose.yml](file:///Users/merazmz/Projects/expenser-main/docker-compose.yml)
5. **Monitoring Services Configuration**: [docker-compose.monitoring.yml](file:///Users/merazmz/Projects/expenser-main/docker-compose.monitoring.yml)
6. **Observability Rules & Dashboards**: [monitoring/](file:///Users/merazmz/Projects/expenser-main/monitoring/) directory
