# PulsePM — Lightweight AI Project & Employee Management Platform

PulsePM is a dual-role project and employee management platform built to eliminate complex Agile overhead (story point voting, sprint ceremonies, multi-state Jira ticket transitions) and unorganized Slack communication.

## Key Features

1. **Dual-Role Workflow**:
   - **Project Manager (Admin)**: Create projects, provision granular tasks with explicit start/end dates, manage workforce directory, monitor progress on the interactive Calendar Matrix Heatmap, and analyze team health with 360° analytics.
   - **Contributors (Employees)**: View assigned active tasks with countdown tags (`Due in 3 days`), submit daily progress updates (raw unstructured notes or "Did not work today" blocker toggle), and receive instant visual confirmation.

2. **Interactive Calendar Matrix Heatmap GUI**:
   - Dynamic grid displaying employees & tasks vs calendar days.
   - 🟢 **Logged (Green)**: Click to inspect raw text logs.
   - 🔴 **No Work / Blocker (Red/Amber)**: Click to inspect impediment reasons.
   - ⚪ **Pending**: Future dates or unscheduled window.

3. **Employee 360° Deep Analysis Portal**:
   - **Module 1**: Allocated Projects & Active Tasks Breakdown with workload capacity meter.
   - **Module 2**: Complete Work History & Chronological Log Stream with consistency score.
   - **Module 3**: Leave & Inactivity Track Record with automated reason categorization (External / Internal / Personal).
   - **Module 4**: AI Performance Profile & Diagnostic Summary with 1-click printable dossier export.

4. **Multi-Dimensional AI Summary Engine**:
   - Synthesizes raw daily submissions into executive digests across 5 dimensions:
     1. Single Employee Summary (Individual Drilldown)
     2. Multiple Employees Comparative Summary (Team Cohort)
     3. Task-Based Summary (Milestone Tracking)
     4. Project-Based Summary (Project Health & Status)
     5. Overall / Fleet-Level Summary (Company-Wide Overview)
   - Dynamic multi-filter control panel with copy and export features.

5. **1-Click Demo User Switcher**:
   - Switch between PM (Alex Mercer) and Contributors (Rahul Sharma, Ananya Patel, Vikram Verma, Sneha Roy, David Kim) directly from the top navigation.

---

## Getting Started

### 1. Install & Run Dev Server
```bash
npm run dev
```
- **Web App**: [http://localhost:5173](http://localhost:5173)
- **Backend API**: [http://localhost:5000/api](http://localhost:5000/api)

### 2. Seed Mock Enterprise Data
```bash
npm run seed
```

### 3. Run Automated Tests
```bash
node test-suite.mjs
```
