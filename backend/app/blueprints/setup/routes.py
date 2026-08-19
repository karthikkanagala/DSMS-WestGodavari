"""
Setup Wizard blueprint (System Admin only)
------------------------------------------
7-step first-run configuration wizard.
GET  /api/setup/status      — has setup been completed?
POST /api/setup/district    — step 1
POST /api/setup/mandals     — step 2 (manual)
POST /api/setup/mandals/import
POST /api/setup/wards       — step 3
POST /api/setup/wards/import
POST /api/setup/bins        — step 4
POST /api/setup/bins/import
POST /api/setup/users       — step 5
POST /api/setup/users/import
POST /api/setup/collectors/assign — step 6
GET  /api/setup/review      — step 7
POST /api/setup/finish      — mark complete
"""
from flask import Blueprint, request, jsonify, g
import bcrypt
from bson import ObjectId
from datetime import datetime, timezone

from ...extensions import mongo
from ...middleware.rbac import require_auth, require_role, ROLE_SYSADMIN
from ...utils.audit import write_log
from ...utils.validators import validate_required, validate_capacity, sanitise_string, validate_role
from ...utils.excel import parse_excel

setup_bp = Blueprint("setup", __name__)

SETUP_KEY = "setup_complete"


def _hash(p): return bcrypt.hashpw(p.encode(), bcrypt.gensalt()).decode()


# ── Status ────────────────────────────────────
@setup_bp.route("/status", methods=["GET"])
def setup_status():
    flag = mongo.db.system_config.find_one({"key": SETUP_KEY})
    return jsonify({"setup_complete": bool(flag and flag.get("value"))}), 200


# ── Step 1: District ─────────────────────────
@setup_bp.route("/district", methods=["POST"])
@require_auth
@require_role(ROLE_SYSADMIN)
def save_district():
    data = request.get_json(force=True) or {}
    ok, err = validate_required(data, ["name", "code"])
    if not ok:
        return jsonify({"error": err}), 400
    # Upsert: allow re-saving
    result = mongo.db.districts.update_one(
        {"code": sanitise_string(data["code"]).upper()},
        {"$set": {
            "name":        sanitise_string(data["name"]),
            "code":        sanitise_string(data["code"]).upper(),
            "office_name": sanitise_string(data.get("office_name", "")),
            "address":     sanitise_string(data.get("address", "")),
            "phone":       sanitise_string(data.get("phone", "")),
            "email":       sanitise_string(data.get("email", "")),
            "created_at":  datetime.now(timezone.utc),
        }},
        upsert=True,
    )
    write_log("SETUP_DISTRICT")
    return jsonify({"message": "District saved"}), 200


# ── Step 2: Mandals ───────────────────────────
@setup_bp.route("/mandals", methods=["POST"])
@require_auth
@require_role(ROLE_SYSADMIN)
def add_mandal():
    data = request.get_json(force=True) or {}
    ok, err = validate_required(data, ["name", "district_id"])
    if not ok:
        return jsonify({"error": err}), 400
    mongo.db.mandals.insert_one({
        "name":        sanitise_string(data["name"]),
        "district_id": ObjectId(data["district_id"]),
        "created_at":  datetime.now(timezone.utc),
    })
    return jsonify({"message": "Mandal added"}), 201


@setup_bp.route("/mandals/import", methods=["POST"])
@require_auth
@require_role(ROLE_SYSADMIN)
def import_mandals():
    if "file" not in request.files:
        return jsonify({"error": "No file"}), 400
    district_id = request.form.get("district_id")
    if not district_id:
        return jsonify({"error": "district_id required"}), 400
    rows, errors = parse_excel(request.files["file"], ["name"])
    if errors: return jsonify({"errors": errors}), 422
    docs = [{"name": sanitise_string(r.get("name", "")),
             "district_id": ObjectId(district_id),
             "created_at": datetime.now(timezone.utc)} for r in rows if r.get("name")]
    if docs: mongo.db.mandals.insert_many(docs)
    return jsonify({"message": f"Imported {len(docs)} mandals"}), 201


# ── Step 3: Wards/Villages ────────────────────
@setup_bp.route("/wards", methods=["POST"])
@require_auth
@require_role(ROLE_SYSADMIN)
def add_ward():
    data = request.get_json(force=True) or {}
    ok, err = validate_required(data, ["name", "mandal_id", "district_id"])
    if not ok: return jsonify({"error": err}), 400
    mongo.db.wards.insert_one({
        "name":        sanitise_string(data["name"]),
        "type":        data.get("type", "ward"),
        "mandal_id":   ObjectId(data["mandal_id"]),
        "district_id": ObjectId(data["district_id"]),
        "created_at":  datetime.now(timezone.utc),
    })
    return jsonify({"message": "Ward added"}), 201


@setup_bp.route("/wards/import", methods=["POST"])
@require_auth
@require_role(ROLE_SYSADMIN)
def import_wards():
    if "file" not in request.files: return jsonify({"error": "No file"}), 400
    district_id = request.form.get("district_id")
    if not district_id: return jsonify({"error": "district_id required"}), 400
    rows, errors = parse_excel(request.files["file"], ["name", "mandal_name"])
    if errors: return jsonify({"errors": errors}), 422
    mandals = {m["name"].lower(): m["_id"] for m in mongo.db.mandals.find({"district_id": ObjectId(district_id)})}
    row_errors, docs = [], []
    for i, row in enumerate(rows, 2):
        name = sanitise_string(row.get("name", ""))
        mkey = (row.get("mandal_name") or "").strip().lower()
        if not name: row_errors.append(f"Row {i}: name empty"); continue
        if mkey not in mandals: row_errors.append(f"Row {i}: mandal '{mkey}' not found"); continue
        docs.append({"name": name, "type": row.get("type", "ward"), "mandal_id": mandals[mkey],
                     "district_id": ObjectId(district_id), "created_at": datetime.now(timezone.utc)})
    if row_errors: return jsonify({"errors": row_errors}), 422
    if docs: mongo.db.wards.insert_many(docs)
    return jsonify({"message": f"Imported {len(docs)} wards"}), 201


# ── Step 4: Bins ──────────────────────────────
@setup_bp.route("/bins", methods=["POST"])
@require_auth
@require_role(ROLE_SYSADMIN)
def add_bin():
    data = request.get_json(force=True) or {}
    ok, err = validate_required(data, ["bin_id", "name", "capacity_kg", "district_id", "mandal_id", "ward_id"])
    if not ok: return jsonify({"error": err}), 400
    ok, err = validate_capacity(data["capacity_kg"])
    if not ok: return jsonify({"error": err}), 400
    bid = sanitise_string(data["bin_id"]).upper()
    if mongo.db.public_bins.find_one({"bin_id": bid}):
        return jsonify({"error": f"Bin ID {bid} already exists"}), 409
    mongo.db.public_bins.insert_one({
        "bin_id": bid, "name": sanitise_string(data["name"]),
        "capacity_kg": float(data["capacity_kg"]),
        "district_id": ObjectId(data["district_id"]),
        "mandal_id":   ObjectId(data["mandal_id"]),
        "ward_id":     ObjectId(data["ward_id"]),
        "location":    sanitise_string(data.get("location", "")),
        "latitude":    float(data["latitude"])  if data.get("latitude")  else None,
        "longitude":   float(data["longitude"]) if data.get("longitude") else None,
        "status": "active", "created_at": datetime.now(timezone.utc),
    })
    return jsonify({"message": "Bin added"}), 201


@setup_bp.route("/bins/import", methods=["POST"])
@require_auth
@require_role(ROLE_SYSADMIN)
def import_bins():
    if "file" not in request.files: return jsonify({"error": "No file"}), 400
    rows, errors = parse_excel(request.files["file"], ["bin_id", "name", "capacity_kg", "mandal_name", "ward_name", "location"])
    if errors: return jsonify({"errors": errors}), 422
    district_map = {d["name"].lower(): d["_id"] for d in mongo.db.districts.find()}
    mandal_map   = {m["name"].lower(): m["_id"] for m in mongo.db.mandals.find()}
    ward_map     = {w["name"].lower(): w["_id"] for w in mongo.db.wards.find()}
    existing     = {b["bin_id"] for b in mongo.db.public_bins.find({}, {"bin_id": 1})}
    row_errors, docs, seen = [], [], set()
    for i, row in enumerate(rows, 2):
        bid  = sanitise_string(row.get("bin_id", "")).upper()
        cap  = row.get("capacity_kg")
        mkey = (row.get("mandal_name") or "").strip().lower()
        wkey = (row.get("ward_name") or "").strip().lower()
        if not bid: row_errors.append(f"Row {i}: bin_id empty"); continue
        if bid in existing or bid in seen: row_errors.append(f"Row {i}: duplicate bin_id {bid}"); continue
        ok, err = validate_capacity(cap)
        if not ok: row_errors.append(f"Row {i}: {err}"); continue
        if mkey not in mandal_map: row_errors.append(f"Row {i}: mandal not found"); continue
        if wkey not in ward_map:   row_errors.append(f"Row {i}: ward not found");   continue
        seen.add(bid)
        # Determine district from mandal
        mandal_doc = mongo.db.mandals.find_one({"_id": mandal_map[mkey]})
        docs.append({"bin_id": bid, "name": sanitise_string(row.get("name", bid)),
                     "capacity_kg": float(cap), "district_id": mandal_doc["district_id"],
                     "mandal_id": mandal_map[mkey], "ward_id": ward_map[wkey],
                     "location": sanitise_string(row.get("location", "")),
                     "latitude": float(row["latitude"]) if row.get("latitude") else None,
                     "longitude": float(row["longitude"]) if row.get("longitude") else None,
                     "status": "active", "created_at": datetime.now(timezone.utc)})
    if row_errors: return jsonify({"errors": row_errors, "valid_count": len(docs)}), 422
    if docs: mongo.db.public_bins.insert_many(docs)
    return jsonify({"message": f"Imported {len(docs)} bins"}), 201


# ── Step 5: Users ─────────────────────────────
@setup_bp.route("/users", methods=["POST"])
@require_auth
@require_role(ROLE_SYSADMIN)
def add_user():
    data = request.get_json(force=True) or {}
    ok, err = validate_required(data, ["username", "password", "role", "full_name"])
    if not ok: return jsonify({"error": err}), 400
    ok, err = validate_role(data["role"])
    if not ok: return jsonify({"error": err}), 400
    if mongo.db.users.find_one({"username": data["username"]}):
        return jsonify({"error": "Username already exists"}), 409
    mongo.db.users.insert_one({
        "username": sanitise_string(data["username"]),
        "password_hash": _hash(data["password"]),
        "full_name": sanitise_string(data["full_name"]),
        "role": data["role"], "status": "active",
        "district_id": ObjectId(data["district_id"]) if data.get("district_id") else None,
        "mandal_id":   ObjectId(data["mandal_id"])   if data.get("mandal_id")   else None,
        "ward_ids": [], "bin_ids": [],
        "created_at": datetime.now(timezone.utc), "last_login": None,
    })
    return jsonify({"message": "User created"}), 201


@setup_bp.route("/users/import", methods=["POST"])
@require_auth
@require_role(ROLE_SYSADMIN)
def import_users():
    if "file" not in request.files: return jsonify({"error": "No file"}), 400
    rows, errors = parse_excel(request.files["file"], ["username", "full_name", "role"])
    if errors: return jsonify({"errors": errors}), 422
    docs = []
    for r in rows:
        username = sanitise_string(r.get("username", ""))
        if not username or mongo.db.users.find_one({"username": username}): continue
        role = (r.get("role") or "collector").strip().lower()
        docs.append({"username": username, "password_hash": _hash(r.get("password", "Admin@123")),
                     "full_name": sanitise_string(r.get("full_name", username)),
                     "role": role, "status": "active", "district_id": None, "mandal_id": None,
                     "ward_ids": [], "bin_ids": [],
                     "created_at": datetime.now(timezone.utc), "last_login": None})
    if docs: mongo.db.users.insert_many(docs)
    return jsonify({"message": f"Imported {len(docs)} users"}), 201


# ── Step 6: Assign Collectors ─────────────────
@setup_bp.route("/collectors/assign", methods=["POST"])
@require_auth
@require_role(ROLE_SYSADMIN)
def assign_collector():
    data = request.get_json(force=True) or {}
    ok, err = validate_required(data, ["collector_id"])
    if not ok: return jsonify({"error": err}), 400
    update = {
        "ward_ids": [ObjectId(w) for w in data.get("ward_ids", [])],
        "bin_ids":  [ObjectId(b) for b in data.get("bin_ids",  [])],
    }
    if data.get("district_id"): update["district_id"] = ObjectId(data["district_id"])
    if data.get("mandal_id"):   update["mandal_id"]   = ObjectId(data["mandal_id"])
    mongo.db.users.update_one({"_id": ObjectId(data["collector_id"])}, {"$set": update})
    write_log("SETUP_ASSIGN_COLLECTOR", "users", data["collector_id"])
    return jsonify({"message": "Collector assigned"}), 200


# ── Step 7: Review ────────────────────────────
@setup_bp.route("/review", methods=["GET"])
@require_auth
@require_role(ROLE_SYSADMIN)
def review():
    return jsonify({
        "districts": mongo.db.districts.count_documents({}),
        "mandals":   mongo.db.mandals.count_documents({}),
        "wards":     mongo.db.wards.count_documents({}),
        "bins":      mongo.db.public_bins.count_documents({}),
        "users":     mongo.db.users.count_documents({"role": {"$ne": "system_admin"}}),
        "collectors":mongo.db.users.count_documents({"role": "collector"}),
    }), 200


# ── Finish ────────────────────────────────────
@setup_bp.route("/finish", methods=["POST"])
@require_auth
@require_role(ROLE_SYSADMIN)
def finish_setup():
    mongo.db.system_config.update_one(
        {"key": SETUP_KEY},
        {"$set": {"key": SETUP_KEY, "value": True, "finished_at": datetime.now(timezone.utc)}},
        upsert=True,
    )
    write_log("SETUP_FINISH")
    return jsonify({"message": "Setup complete"}), 200
