# Last-Mile Delivery Tracker — Full-Stack Logistics System

A production-grade, full-stack **Last-Mile Delivery Tracker** application featuring dynamic rule-based rate calculation, automatic delivery agent auto-assignment, strict status state machines, failed-delivery rescheduling flows, immutable tracking history, and role-based administration panels.

---

## 🚀 Quick Setup Instructions

### Prerequisites
- Node.js (v18+ recommended)
- npm (v9+)

### 1. Backend Setup & Database Seeding

```bash
cd backend
npm install

# Push database schema (Creates SQLite database dev.db automatically)
npx prisma db push

# Seed demo data (Admin, Customers, Delivery Agents, Zones, Rate Cards, Orders)
npm run db:seed

# Run Unit Tests
npm test

# Start Backend API Server (Port 5000)
npm run dev
```

### 2. Frontend Setup

In a new terminal window:

```bash
cd frontend
npm install

# Start Frontend Dev Server (Port 5173)
npm run dev
```

Open `http://localhost:5173` in your browser.

---

## 🔑 Demo Credentials

| Role | Email | Password | Access & Purpose |
|---|---|---|---|
| **Admin** | `admin@delivery.com` | `password123` | Full access to rate card slabs, COD configs, zone mappings, agent rosters, auto/manual assignments, and status overrides |
| **Customer 1** | `customer1@delivery.com` | `password123` | Books shipments, previews volumetric rates, views tracking timeline, reschedules failed deliveries |
| **Customer 2** | `customer2@delivery.com` | `password123` | Inter-zone B2B customer account |
| **Agent 1** | `agent1@delivery.com` | `password123` | North Zone delivery agent console. Toggles duty availability and executes status transitions (`BOOKED → PICKED_UP → IN_TRANSIT → OUT_FOR_DELIVERY → DELIVERED / FAILED`) |

---

## 📐 System Architecture

```
React 18 + Vite + Tailwind CSS (Vercel Frontend)
               │ REST / JSON + JWT Bearer Auth
               ▼
Express.js + TypeScript (Render Backend)
               │
   ┌───────────┴───────────────────────────────────────────────┐
   │ Modular Business Logic Layer                              │
   │  ├── Rate Engine (Volumetric weight, slabs, COD)          │
   │  ├── Zone Detection Service (Pincode lookup)              │
   │  ├── Auto-Assignment Engine (Haversine & zone fallback)   │
   │  ├── Status Engine (State machine & immutable audit log)  │
   │  ├── Reschedule Engine (Failed delivery retry & re-assign)│
   │  └── Notification Service (Pluggable Email & SMS)         │
   └───────────┬───────────────────────────────────────────────┘
               │
          Prisma ORM
               │
     PostgreSQL / SQLite Database
```

---

## 📊 Core Business Logic Explained

### 1. Rate Calculation Engine
- **Volumetric Weight Calculation**: $\text{Volumetric Weight (kg)} = \frac{L \times B \times H \text{ (cm)}}{5000}$
- **Chargeable Weight**: $\text{Chargeable Weight} = \max(\text{Actual Weight}, \text{Volumetric Weight})$
- **Zone Relation**: If $\text{Pickup Zone ID} == \text{Drop Zone ID} \implies \text{INTRA-ZONE}$, else $\text{INTER-ZONE}$.
- **Rate Card Lookup**: Matches `order_type` (`B2B`/`B2C`), `zone_relation` (`INTRA`/`INTER`), and weight slab ($\text{min\_weight} \le \text{chargeable\_weight} \le \text{max\_weight}$).
- **COD Surcharge**:
  - `FLAT`: Fixed ₹ amount added to base freight charge.
  - `PERCENTAGE`: Calculated as percentage of base freight charge.
- **Total Payable Charge**: $\text{Total} = \text{Round2}(\text{Base Charge} + \text{COD Surcharge})$

### 2. Pincode-Based Zone Detection
- Addresses collect mandatory structured pincodes.
- Lookup table `zone_areas` maps pincode to an operational `Zone`.
- Unmapped pincodes return a strict `422 ZONE_NOT_MAPPED` error rather than silently corrupting rate calculations.

### 3. Auto-Assignment Algorithm
1. **Candidate Eligibility**: Filter agents where `is_active = true AND is_available = true AND zone_id = pickup_zone_id`.
2. **Citywide Fallback**: If zero agents in pickup zone, search all active/available agents citywide.
3. **Deterministic Ranking**: Sort candidates by:
   - Haversine distance to pickup location (if coordinates exist)
   - Active workloads (fewer active orders first)
   - Onboarding timestamp (earliest first)
4. **Transactional Safety**: If no agent is available, order remains in `BOOKED` status and surfaces in the Admin "Unassigned" dashboard filter.

### 4. Status State Machine & Audit Immutability
- Delivery agents follow strict forward-only sequence:
  $$\text{BOOKED} \rightarrow \text{PICKED\_UP} \rightarrow \text{IN\_TRANSIT} \rightarrow \text{OUT\_FOR\_DELIVERY} \rightarrow (\text{DELIVERED} \mid \text{FAILED})$$
- Skipping steps or moving backwards returns `409 INVALID_TRANSITION`.
- Every transition inserts an immutable row into `order_status_history`.
- Admins may override any status, but must specify a non-empty `reason` field, which is recorded with `actor_role = ADMIN`.

### 5. Failed-Delivery & Rescheduling Flow
- Agent marks order as `FAILED` with a reason. Active assignment is deactivated.
- Customer receives notification and accesses the Order Detail page.
- Customer selects a new future delivery date and submits a reschedule request.
- System creates a `RescheduleAttempt` record, resets order status to `BOOKED`, writes an audit log entry, and re-triggers the Auto-Assignment Engine.

---

## 🧪 Running Unit Tests

```bash
cd backend
npm test
```

Runs 5 Vitest unit tests covering:
- Volumetric weight vs actual weight rules
- Decimal round-half-up precision
- Forward-only status transition enforcement
- Invalid/skipped state transition rejection

---

## 📝 System Design Write-Up (Section R)

### Architectural Principles & Design Choices

The **Last-Mile Delivery Tracker** is designed around zero hardcoding, strict relational auditability, and clear separation of concerns.

1. **Rule-Driven Rate Calculation Engine**: Pricing in modern logistics relies on dynamic slabs. Hardcoding rate numbers or zone rules inside code branches creates severe maintenance risk. In our system, rate cards are modeled as configurable composite keys `(order_type, zone_relation, min_weight, max_weight)` storing a base price and a per-kg incremental rate. Volumetric weight ($\frac{L \times B \times H}{5000}$) is evaluated against actual scale weight, ensuring the platform bills on chargeable mass. COD surcharges support flat rates and percentage modes configurable per order type via `CODConfig` tables.

2. **Deterministic Zone Resolution**: Pincode-based mapping provides a reliable, deterministic operational boundary model widely standard across Indian logistics operators. Geocoding APIs introduce external network dependencies, rate limits, and latency spikes during order creation. By indexing pincode mappings in database tables (`ZoneArea`), zone resolution executes in $< 1\text{ms}$ while giving admins total control over area boundaries.

3. **Transactionally Safe Auto-Assignment**: Delivery assignment combines geographic locality with workload balancing. When an order is booked, the assignment engine queries candidate agents matching operational zone criteria and availability flags. Candidates are ranked deterministically by active order load and onboarded tenure (with Haversine distance sorting applied when GPS coordinates are available). Database transactions guarantee atomic updates to `AgentAssignment` pointers.

4. **Immutable Audit Timelines & Reschedule Workflows**: Immutability is enforced at the database and application layers. Order status changes write insert-only records to `OrderStatusHistory`, recording previous status, new status, timestamp, actor ID, role, and reason. When a delivery attempt fails, the order transitions to `FAILED` and deactivates the agent assignment. The customer's reschedule action creates a `RescheduleAttempt` record, resets the live status pointer to `BOOKED`, and re-invokes the assignment engine to dispatch a fresh delivery attempt.
#   L a s t M i l e  
 #   L a s t M i l e  
 