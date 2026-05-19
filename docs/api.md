# API & Server Actions Reference

Expenser is built on Next.js standalone architecture. Rather than relying on traditional REST routes for database operations, it uses **Next.js Server Actions** (`"use server"`) to execute mutations securely on the server side directly from the client.

This document describes all Server Actions (Auth, Expenses, Settings) and the newly added telemetry REST endpoint.

---

## 📊 Telemetry REST Endpoint

### `/api/metrics`
* **Method**: `GET`
* **Access**: Public (Internal network only behind VPS firewall)
* **Response Type**: `text/plain; version=0.0.4`
* **Description**: Exposes Prometheus-compatible time-series metrics. Returns standard Node.js event-loop details, memory footmarks, and custom application trackers.

#### Sample Output Format:
```text
# HELP expenser_http_requests_total Total number of HTTP requests
# TYPE expenser_http_requests_total counter
expenser_http_requests_total{method="GET",route="/dashboard",status_code="200"} 42
expenser_http_requests_total{method="POST",route="/login",status_code="200"} 12

# HELP expenser_http_request_duration_seconds Duration of HTTP requests in seconds
# TYPE expenser_http_request_duration_seconds histogram
expenser_http_request_duration_seconds_bucket{method="GET",route="/dashboard",status_code="200",le="0.1"} 38
expenser_http_request_duration_seconds_bucket{method="GET",route="/dashboard",status_code="200",le="0.5"} 42
expenser_http_request_duration_seconds_sum{method="GET",route="/dashboard",status_code="200"} 1.48
```

---

## 🔑 Authentication Server Actions (`src/actions/auth.ts`)

These methods handle registration, login, JWT issuance, Google account synchronization, and OTP-based password resets.

### `signup(formData)`
Registers a new user and sets a secure httpOnly JWT cookie.
* **Arguments**: 
  ```typescript
  formData: { email: "string", password: "string", displayName?: "string" }
  ```
* **Returns**:
  ```typescript
  { success: boolean, user?: { uid: string, email: string, displayName: string }, error?: string }
  ```

### `login(formData)`
Authenticates credentials, generates a JWT token, and writes an httpOnly cookie.
* **Arguments**: 
  ```typescript
  formData: { email: "string", password: "string" }
  ```
* **Returns**:
  ```typescript
  { success: boolean, user?: { uid: string, email: string, displayName: string }, error?: string }
  ```

### `syncGoogleUser(userData)`
Synchronizes Google accounts with the internal MongoDB user registry.
* **Arguments**:
  ```typescript
  userData: { uid: string, email: string, displayName: string, photoURL: string }
  ```
* **Returns**: Same as login.

### `requestOTP(email)`
Generates a cryptographically secure 6-digit OTP and triggers a password-reset transaction.
* **Arguments**: `email: string`
* **Returns**: `{ success: boolean, error?: string }`

---

## 💵 Expense Server Actions (`src/actions/expenses.ts`)

These actions manage daily spending thresholds, logging, streaks, and monthly statistics calculations.

### `getTodayExpense(userId)`
Fetches today's logged expense and spending limit for a user.
* **Arguments**: `userId: string`
* **Returns**:
  ```typescript
  { _id: string, userId: string, date: string, limit: number, spent: number, saved: number, note: string }
  ```

### `saveExpense(userId, date, spent, note?)`
Logs a new transaction and automatically calculates dynamic savings. Triggers Next.js page revalidation for live dashboard updates.
* **Arguments**: `userId: string, date: string, spent: number, note?: string`
* **Returns**: Updated expense record JSON.

### `getMonthlySummary(userId, monthStr)`
Calculates aggregates (total limit, total spent, and net savings) for a specific billing cycle.
* **Arguments**: `userId: string, monthStr: string` (Format: `YYYY-MM`)
* **Returns**:
  ```typescript
  { totalSpent: number, totalSaved: number, totalLimit: number, totalLimitTillNow: number }
  ```

---

## ⚙️ Settings Server Actions (`src/actions/settings.ts`)

These methods initialize default configurations and handle user system configurations.

### `saveSettings(userId, data)`
Saves currency, theme, and monthly budget. Auto-calculates dynamic daily budget and generates placeholders for the entire month to optimize queries.
* **Arguments**: 
  ```typescript
  userId: string, 
  data: { monthlyBudget: number, currency?: string, theme?: string }
  ```
* **Returns**: Updated settings JSON.

### `resetMonth(userId)`
Completely wipes and regenerates transactions for the current month based on the configured settings.
* **Arguments**: `userId: string`
* **Returns**: `void`
