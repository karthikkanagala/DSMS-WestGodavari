"""
DSMS Full-Scale Seed Script
Populates MongoDB with realistic demo data.
Supports both direct execution and import via run_seed(db).
"""
import os, random, bcrypt
from datetime import datetime, timezone, timedelta
from bson import ObjectId

def _hash(p): return bcrypt.hashpw(p.encode(), bcrypt.gensalt()).decode()

def run_seed(db):
    print("Clearing existing data...")
    for col in ["districts","mandals","wards","public_bins","collections",
                "overflow_alerts","users","activity_logs","system_config"]:
        db[col].drop()

    # ──────────────────────────────────────────────
    # DISTRICT
    # ──────────────────────────────────────────────
    print("Creating district...")
    district_id = db.districts.insert_one({
        "name":        "West Godavari",
        "code":        "WG",
        "office_name": "District Collector's Office, Eluru",
        "address":     "Collector's Office, Main Road, Eluru, Andhra Pradesh 534001",
        "phone":       "08812-234567",
        "email":       "collector.wg@ap.gov.in",
        "created_at":  datetime.now(timezone.utc),
    }).inserted_id

    # ──────────────────────────────────────────────
    # MANDALS (19)
    # ──────────────────────────────────────────────
    MANDAL_NAMES = [
        "Tadepalligudem", "Bhimavaram", "Eluru", "Nidadavole", "Palakol",
        "Tanuku", "Kovvur", "Rajam", "Undi", "Akividu",
        "Palakollu", "Narasapuram", "Attili", "Jangareddigudem", "Ganapavaram",
        "Peravali", "Unguturu", "Polavaram", "Denduluru"
    ]
    print(f"Creating {len(MANDAL_NAMES)} mandals...")
    mandal_ids = {}
    for name in MANDAL_NAMES:
        mid = db.mandals.insert_one({
            "name":        name,
            "district_id": district_id,
            "created_at":  datetime.now(timezone.utc),
        }).inserted_id
        mandal_ids[name] = mid

    # ──────────────────────────────────────────────
    # WARDS / VILLAGES (~356 total)
    # ──────────────────────────────────────────────
    WARD_LOCATIONS = [
        "Market Road","Bus Stand","Main Road","School Road","Temple Road",
        "Hospital Area","Railway Station","Old Town","New Colony","Lake Side",
        "Industrial Area","Residential Block","Commercial Zone","Park Area","River Bank",
        "East Street","West Street","North Road","South End","Central Area",
    ]
    print("Creating wards/villages...")
    ward_ids_by_mandal = {}
    all_ward_ids = []

    ward_num = 1
    for mname, mid in mandal_ids.items():
        count = random.randint(17, 20)
        wids  = []
        for i in range(1, count + 1):
            wtype = "village" if i > count // 2 else "ward"
            wname = f"Ward {ward_num}" if wtype == "ward" else f"Village {ward_num}"
            wid   = db.wards.insert_one({
                "name":        wname,
                "type":        wtype,
                "mandal_id":   mid,
                "district_id": district_id,
                "created_at":  datetime.now(timezone.utc),
            }).inserted_id
            wids.append(wid)
            all_ward_ids.append(wid)
            ward_num += 1
        ward_ids_by_mandal[mname] = wids

    total_wards = len(all_ward_ids)
    print(f"   Created {total_wards} wards/villages")

    # ──────────────────────────────────────────────
    # PUBLIC BINS (~8 per ward)
    # ──────────────────────────────────────────────
    print("Creating public bins...")
    all_bin_docs = []
    bin_seq      = 1

    for mname, mid in mandal_ids.items():
        for wid in ward_ids_by_mandal[mname]:
            num_bins = random.randint(6, 10)
            for b in range(1, num_bins + 1):
                bid = f"BIN-{bin_seq:04d}"
                loc = random.choice(WARD_LOCATIONS)
                cap = random.choice([80, 100, 120, 150, 200])
                lat = round(16.0 + random.uniform(0, 1.5), 6)
                lng = round(80.5 + random.uniform(0, 1.5), 6)
                doc = {
                    "bin_id":      bid,
                    "name":        f"{loc} Bin",
                    "capacity_kg": cap,
                    "district_id": district_id,
                    "mandal_id":   mid,
                    "ward_id":     wid,
                    "location":    loc,
                    "latitude":    lat,
                    "longitude":   lng,
                    "status":      "active",
                    "created_at":  datetime.now(timezone.utc),
                }
                all_bin_docs.append(doc)
                bin_seq += 1

    db.public_bins.insert_many(all_bin_docs)
    all_bins = list(db.public_bins.find())
    print(f"   Created {len(all_bins)} bins")

    # ──────────────────────────────────────────────
    # USERS
    # ──────────────────────────────────────────────
    print("Creating users...")

    default_seed_pw = os.environ.get("SEED_USER_PASSWORD", "ChangeMe@123")

    def make_user(username, full_name, role, password=None,
                  district_id=None, mandal_id=None, ward_ids=None, bin_ids=None):
        return {
            "username":      username,
            "password_hash": _hash(password or default_seed_pw),
            "full_name":     full_name,
            "role":          role,
            "status":        "active",
            "district_id":   district_id,
            "mandal_id":     mandal_id,
            "ward_ids":      ward_ids or [],
            "bin_ids":       bin_ids  or [],
            "created_at":    datetime.now(timezone.utc),
            "last_login":    None,
        }

    users_to_insert = [
        make_user("admin",       "System Administrator",    "system_admin"),
        make_user("sysadmin",    "System Administrator",    "system_admin"),
        make_user("distadmin",   "District Collector (Dist Admin)", "district_admin", district_id=district_id),
        make_user("mandal_tpg",  "V. Satyanarayana (Mandal Officer - Tadepalligudem)", "mandal_officer", district_id=district_id, mandal_id=mandal_ids.get("Tadepalligudem")),
        make_user("mandal_officer", "K. Rama Rao (Mandal Officer - Bhimavaram)", "mandal_officer", district_id=district_id, mandal_id=mandal_ids.get("Bhimavaram")),
        make_user("supervisor",  "K. Ramanjaneyulu (Sanitation Supervisor)", "supervisor", district_id=district_id, mandal_id=mandal_ids.get("Tadepalligudem")),
        make_user("collector",   "K. Venkateswarlu (Senior Waste Collector)", "collector", district_id=district_id, mandal_id=mandal_ids.get("Tadepalligudem")),
    ]

    mandal_list = list(mandal_ids.items())
    for i, (mname, mid) in enumerate(mandal_list[:5]):
        users_to_insert.append(make_user(
            f"mandal_officer{i+1}", f"Officer {mname}",
            "mandal_officer", district_id=district_id, mandal_id=mid
        ))

    for i in range(10):
        mname, mid = mandal_list[i % len(mandal_list)]
        wards_for_mandal = ward_ids_by_mandal[mname]
        sup_wards = wards_for_mandal[:3]
        users_to_insert.append(make_user(
            f"supervisor{i+1}", f"Supervisor {i+1}", "supervisor",
            district_id=district_id, mandal_id=mid, ward_ids=sup_wards
        ))

    all_ward_list = list(ward_ids_by_mandal.items())
    wards_flat    = [(mname, wid) for mname, wids in all_ward_list for wid in wids]
    random.shuffle(wards_flat)
    chunks        = [wards_flat[i:i+2] for i in range(0, min(60, len(wards_flat)), 2)]

    for i, chunk in enumerate(chunks[:30]):
        mname = chunk[0][0]
        mid   = mandal_ids[mname]
        wids  = [c[1] for c in chunk]
        bids  = []
        for wid in wids:
            bins_in_ward = [b["_id"] for b in all_bins if b["ward_id"] == wid]
            bids.extend(bins_in_ward)
        users_to_insert.append(make_user(
            f"collector{i+1}", f"Collector {i+1}", "collector",
            district_id=district_id, mandal_id=mid, ward_ids=wids, bin_ids=bids
        ))

    db.users.insert_many(users_to_insert)
    all_collector_docs = list(db.users.find({"role": "collector"}))
    print(f"   Created {len(users_to_insert)} users ({len(all_collector_docs)} collectors)")

    # ──────────────────────────────────────────────
    # COLLECTION RECORDS (~5000 over last 30 days)
    # ──────────────────────────────────────────────
    print("Creating collection records...")
    collection_docs = []
    overflow_docs   = []
    now = datetime.now(timezone.utc)

    ward_collector_map = {}
    for col_doc in all_collector_docs:
        for wid in col_doc.get("ward_ids", []):
            ward_collector_map[wid] = col_doc

    for day_offset in range(30):
        record_date = now - timedelta(days=day_offset)
        daily_bins = random.sample(all_bins, k=min(int(len(all_bins) * 0.16), len(all_bins)))
        for bin_doc in daily_bins:
            wid       = bin_doc["ward_id"]
            collector = ward_collector_map.get(wid) or random.choice(all_collector_docs)
            cap       = bin_doc["capacity_kg"]

            waste_pct = random.choices(
                [random.uniform(0.2, 0.6), random.uniform(0.6, 0.95), random.uniform(0.95, 1.2)],
                weights=[50, 35, 15]
            )[0]
            waste_kg  = round(cap * waste_pct, 1)
            fill_pct  = round(min((waste_kg / cap) * 100, 120), 1)
            is_overflow = waste_kg >= cap
            status    = "overflow" if is_overflow else ("completed" if fill_pct >= 80 else "in_progress")

            record_time = record_date.replace(
                hour=random.randint(6, 17),
                minute=random.randint(0, 59),
                second=0, microsecond=0
            )
            rec = {
                "bin_id":         bin_doc["_id"],
                "bin_ref":        bin_doc["bin_id"],
                "collector_id":   collector["_id"],
                "collector_name": collector["full_name"],
                "ward_id":        bin_doc["ward_id"],
                "mandal_id":      bin_doc["mandal_id"],
                "district_id":    district_id,
                "waste_kg":       waste_kg,
                "fill_level":     fill_pct,
                "status":         status,
                "remarks":        "Bin collected" if not is_overflow else "Bin overflowing. Cleaned.",
                "photo_url":      None,
                "date":           record_time,
                "timestamp":      record_time,
                "created_at":     record_time,
            }
            collection_docs.append(rec)

            if is_overflow:
                overflow_docs.append({
                    "bin_id":      bin_doc["_id"],
                    "bin_ref":     bin_doc["bin_id"],
                    "ward_id":     bin_doc["ward_id"],
                    "mandal_id":   bin_doc["mandal_id"],
                    "district_id": district_id,
                    "detected_at": record_time,
                    "status":      "open" if day_offset < 3 else "resolved",
                    "resolved_at": (record_time + timedelta(hours=random.randint(1, 8))) if day_offset >= 3 else None,
                    "resolved_by": None,
                })

    if collection_docs:
        db.collections.insert_many(collection_docs)
    if overflow_docs:
        db.overflow_alerts.insert_many(overflow_docs)

    print(f"   Created {len(collection_docs)} collection records")
    print(f"   Created {len(overflow_docs)} overflow alerts")

    # ──────────────────────────────────────────────
    # SYSTEM CONFIG
    # ──────────────────────────────────────────────
    db.system_config.insert_one({
        "key": "setup_complete",
        "value": True,
        "finished_at": datetime.now(timezone.utc),
    })

    # ──────────────────────────────────────────────
    # INDEXES
    # ──────────────────────────────────────────────
    print("Creating indexes...")
    db.users.create_index("username", unique=True)
    db.public_bins.create_index("bin_id", unique=True)
    db.public_bins.create_index([("district_id", 1), ("mandal_id", 1), ("ward_id", 1)])
    db.collections.create_index([("ward_id", 1), ("date", -1)])
    db.collections.create_index([("district_id", 1), ("date", -1)])
    db.collections.create_index([("collector_id", 1), ("date", -1)])
    db.overflow_alerts.create_index([("status", 1), ("detected_at", -1)])

    print("\nSeed complete!\n")

if __name__ == "__main__":
    from pymongo import MongoClient
    import os
    MONGO_URI = os.environ.get("MONGO_URI", "mongodb://localhost:27017/dsms_db")
    try:
        client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=2000)
        client.admin.command('ping')
        _db = client.get_default_database()
        print("Connected to MongoDB server.")
    except Exception:
        print("Local MongoDB server not reachable. Running seed on mongomock in-memory DB...")
        import mongomock
        client = mongomock.MongoClient()
        _db = client["dsms_db"]
    run_seed(_db)
