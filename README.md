# District Sanitation Monitoring & Waste Collection Management System (DSMS)

An enterprise-grade e-Governance portal built for a District Collector's Office to digitally monitor, track, and manage municipal sanitation operations across an administrative hierarchy.

---

## Administrative Hierarchy
```
District (West Godavari)
   └── Mandal (19 Mandals)
        └── Ward (Urban) / Village (Rural) (356 Wards/Villages)
             └── Public Bin (~2,850 Bins)
                  └── Waste Collection Record (~5,000 Records)
```

---

## 🚀 Tech Stack

- **Frontend:** React 18 (Vite), Tailwind CSS, React Router v6, Axios, Leaflet.js / react-leaflet (interactive waste heatmap), Chart.js / react-chartjs-2 (analytics)
- **Backend:** Python Flask (Blueprints architecture), REST APIs, JWT Authentication, bcrypt password hashing, Flask-CORS
- **Database:** MongoDB via PyMongo (with automatic fallback to `mongomock` in-memory DB when local `mongod` server is not present)
- **Data & File I/O:** pandas + openpyxl (Excel import/export), ReportLab (PDF report generation)
- **Auto-Refresh:** 30-second polling (`setInterval` + Axios hook) — No WebSockets required.

---

## 👥 Demo User Accounts & Credentials

The database is pre-seeded with realistic data across all 19 mandals and 356 wards.

| Role | Username | Password | Scope / Permissions |
|---|---|---|---|
| **System Administrator** | `sysadmin` | `Admin@123` | Full system access, Setup Wizard, database backup/restore, user creation |
| **District Administrator** | `distadmin` | `Admin@123` | District-wide dashboard, mandals, wards, bins, collector assignments, reports |
| **Mandal Officer** | `mandal_officer1` | `Admin@123` | Mandal-scoped view (Tadepalligudem), ward analytics, reports |
| **Sanitation Supervisor** | `supervisor1` | `Admin@123` | Assigned ward collections, overflow alert resolution |
| **Waste Collector** | `collector1` | `Admin@123` | Mobile-first collector app, update bin collection, auto-timestamping |

---

## ⚡ How to Run

### 1. Backend Setup (Flask)
```bash
cd backend
pip install -r requirements.txt
python run.py
```
*The backend runs on `http://localhost:5000`*. On first boot, if the database is empty, it automatically populates demo data!

### 2. Frontend Setup (React / Vite)
```bash
cd frontend
npm install
npm run dev
```
*The frontend runs on `http://localhost:5173`*.

---

## 📊 Core Features

1. **Role-Based Access Control (RBAC):** Server-side enforced decorators (`@require_auth`, `@require_role`) and query-level scope filters.
2. **System Setup Wizard:** 7-step onboarding wizard for System Administrators supporting both **Manual Entry** and **Excel (.xlsx) Import** with full row validation.
3. **Interactive Waste Heatmap:** Leaflet map with ward-level polygon shading based on waste volume (Green → Yellow → Orange → Red) and interactive ward detail panel drill-down.
4. **Automatic Overflow Detection:** Triggers an automated overflow alert whenever submitted `waste_kg >= capacity_kg` for any public bin.
5. **Reports & Exports:** 7 report types (Daily, Weekly, Monthly, Ward-wise, Mandal-wise, Collector Performance, Overflow) with one-click **Excel** and **PDF** export.
6. **Mobile-First Collector App:** Purpose-built mobile screen for sanitation collectors to select assigned bins, enter waste kg, set fill levels, and auto-stamp timestamps.
7. **Live Auto-Refresh:** Polling hook refreshes cards, charts, heatmap, and notifications every 30 seconds without full page reload.

---

## 🔮 Future Extensibility

- **GPS Tracking:** Schema includes `latitude` and `longitude` fields on `public_bins` and `collections` ready for vehicle GPS integration.
- **QR Codes:** `bin_id` string formatted for direct QR scanning on physical bins.
- **IoT Bins:** `collections` API accepts automated readings from IoT fill-level sensors.
