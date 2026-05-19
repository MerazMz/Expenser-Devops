# Expenser Documentation Hub

Welcome to the official developer and DevOps documentation for **Expenser**—a modern, containerized personal finance tracker built on Next.js 16, TypeScript, MongoDB, and a production-grade Prometheus/Grafana observability stack.

---

## 🗺️ System Architecture

This diagram visualizes how the local development, production CI/CD, and the newly added monitoring services interact:

```mermaid
graph TB
    subgraph "Local / Production Runtime"
        APP["Next.js App<br/>(:5000)"]
        DB[(MongoDB Atlas)]
    end

    subgraph "Observability Suite"
        PROM["Prometheus<br/>(:9090)"]
        GRAF["Grafana<br/>(:3001)"]
        CADV["cAdvisor<br/>(:8080)"]
        NODE["Node Exporter<br/>(:9100)"]
        LOKI["Loki<br/>(:3100)"]
        PROMT["Promtail"]
    end

    subgraph "CI/CD Pipeline"
        GIT["Git Commit/Push"] --> GHA["GitHub Actions"]
        GHA --> DH["Docker Hub Registry"]
        DH -->|Pull Image| APP
    end

    %% Metrics Pipeline
    APP -- "/api/metrics" --> PROM
    CADV -- "container metrics" --> PROM
    NODE -- "host metrics" --> PROM
    PROM -- "query datasource" --> GRAF

    %% Logging Pipeline
    APP -- "stdout/stderr logs" --> PROMT
    PROMT -- "push logs" --> LOKI
    LOKI -- "query datasource" --> GRAF

    %% Database Connection
    APP --> DB
    
    style APP fill:#c8f135,color:#000,stroke:#9ebd0e,stroke-width:2px
    style GRAF fill:#f46800,color:#fff,stroke:#bf5200,stroke-width:2px
    style PROM fill:#e6522c,color:#fff,stroke:#b33a1b,stroke-width:2px
    style LOKI fill:#2C73D2,color:#fff,stroke:#1a4d96,stroke-width:2px
    style DB fill:#13aa52,color:#fff,stroke:#0f7c3c,stroke-width:2px
```

---

## 📚 Documentation Sections

To help you navigate the system, our documentation is structured into specialized guides:

### 🚀 [1. Getting Started](./getting-started.md)
*Complete local environment setup guide. Covers running the Next.js frontend, database connection parameters, and standard `npm` actions.*

### 📊 [2. Monitoring & Observability](./monitoring.md)
*Deep-dive into the Prometheus, Grafana, Loki, Promtail, cAdvisor, and Node Exporter stack. Includes pre-loaded dashboards, custom log queries, and metrics definitions.*

### 🔌 [3. API & Server Actions Reference](./api.md)
*Comprehensive documentation of the backend layer. Details Next.js Server Actions (Auth, Expenses, Settings) and the newly added Prometheus metrics scrape endpoint.*

### 🚢 [4. DevOps & Deployment](./deployment.md)
*Step-by-step instructions for Git branching, automated GitHub Actions CI/CD pipeline, Docker image publishing, and VPS production hosting.*

---

## 📂 Documentation File Tree

All manuals are organized inside the `docs/` folder at the root of the project:

```
expenser-main/
├── docs/
│   ├── README.md             # You are here (Main Hub)
│   ├── getting-started.md    # Local Setup & Environments
│   ├── monitoring.md         # Metrics & Logging Guide
│   ├── api.md                # Server Actions & API Docs
│   └── deployment.md         # CI/CD & Cloud Hosting
```
