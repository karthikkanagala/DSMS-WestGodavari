"""Public Bins blueprint — full CRUD + Excel import with validation."""
from flask import Blueprint, request, jsonify, g
from bson import ObjectId
from datetime import datetime, timezone

from ...extensions import mongo
from ...middleware.rbac import require_auth, require_role, \
    ROLE_SYSADMIN, ROLE_DISTRICT_ADMIN, ROLE_MANDAL_OFFICER, ROLE_SUPERVISOR, ROLE_COLLECTOR
from ...utils.audit import write_log
from ...utils.serializers import serialize_doc, serialize_list
from ...utils.validators import validate_required, validate_capacity, validate_bin_id_format, sanitise_string
from ...utils.excel import parse_excel

bins_bp = Blueprint("bins", __name__)


def _scoped_query():
    user  = g.current_user
    query = {}
    if user["role"] == ROLE_SYSADMIN:
        pass
    elif user["role"] == ROLE_DISTRICT_ADMIN and user.get("district_id"):
        query["district_id"] = ObjectId(user["district_id"])
    elif user["role"] == ROLE_MANDAL_OFFICER and user.get("mandal_id"):
        query["mandal_id"] = ObjectId(user["mandal_id"])
    elif user["role"] == ROLE_SUPERVISOR and user.get("ward_ids"):
        query["ward_id"] = {"$in": [ObjectId(w) for w in user["ward_ids"]]}
    elif user["role"] == ROLE_COLLECTOR and user.get("bin_ids"):
        query["_id"] = {"$in": [ObjectId(b) for b in user["bin_ids"]]}
    return query


@bins_bp.route("/", methods=["GET"])
@require_auth
def get_bins():
    query = _scoped_query()
    # Extra URL filters
    for param, field in [("ward_id", "ward_id"), ("mandal_id", "mandal_id"),
                         ("district_id", "district_id"), ("status", "status")]:
        val = request.args.get(param)
        if val and param != "status":
            query[field] = ObjectId(val)
        elif val:
            query[field] = val

    page     = max(int(request.args.get("page", 1)), 1)
    per_page = min(int(request.args.get("per_page", 50)), 200)
    skip     = (page - 1) * per_page
    total    = mongo.db.public_bins.count_documents(query)
    docs     = list(mongo.db.public_bins.find(query).skip(skip).limit(per_page).sort("bin_id", 1))
    return jsonify({
        "data":  serialize_list(docs),
        "total": total,
        "page":  page,
        "pages": (total + per_page - 1) // per_page,
    }), 200


@bins_bp.route("/<bin_id>", methods=["GET"])
@require_auth
def get_bin(bin_id):
    doc = mongo.db.public_bins.find_one({"_id": ObjectId(bin_id)})
    if not doc:
        return jsonify({"error": "Bin not found"}), 404
    return jsonify(serialize_doc(doc)), 200


@bins_bp.route("/", methods=["POST"])
@require_auth
@require_role(ROLE_SYSADMIN, ROLE_DISTRICT_ADMIN)
def create_bin():
    data = request.get_json(force=True) or {}
    ok, err = validate_required(data, ["bin_id", "name", "capacity_kg", "district_id", "mandal_id", "ward_id"])
    if not ok:
        return jsonify({"error": err}), 400

    ok, err = validate_capacity(data["capacity_kg"])
    if not ok:
        return jsonify({"error": err}), 400

    # Check duplicate bin_id
    if mongo.db.public_bins.find_one({"bin_id": sanitise_string(data["bin_id"]).upper()}):
        return jsonify({"error": f"Bin ID '{data['bin_id']}' already exists"}), 409

    doc = {
        "bin_id":      sanitise_string(data["bin_id"]).upper(),
        "name":        sanitise_string(data["name"]),
        "capacity_kg": float(data["capacity_kg"]),
        "district_id": ObjectId(data["district_id"]),
        "mandal_id":   ObjectId(data["mandal_id"]),
        "ward_id":     ObjectId(data["ward_id"]),
        "location":    sanitise_string(data.get("location", "")),
        "latitude":    float(data["latitude"])  if data.get("latitude")  else None,
        "longitude":   float(data["longitude"]) if data.get("longitude") else None,
        "status":      "active",
        "created_at":  datetime.now(timezone.utc),
    }
    result = mongo.db.public_bins.insert_one(doc)
    write_log("CREATE_BIN", "public_bins", result.inserted_id, {"bin_id": doc["bin_id"]})
    return jsonify({"_id": str(result.inserted_id)}), 201


@bins_bp.route("/<bin_id>", methods=["PUT"])
@require_auth
@require_role(ROLE_SYSADMIN, ROLE_DISTRICT_ADMIN)
def update_bin(bin_id):
    data   = request.get_json(force=True) or {}
    update = {}
    for field in ["name", "location", "status"]:
        if field in data:
            update[field] = sanitise_string(data[field])
    if "capacity_kg" in data:
        ok, err = validate_capacity(data["capacity_kg"])
        if not ok:
            return jsonify({"error": err}), 400
        update["capacity_kg"] = float(data["capacity_kg"])
    if "latitude"  in data: update["latitude"]  = float(data["latitude"])  if data["latitude"]  else None
    if "longitude" in data: update["longitude"] = float(data["longitude"]) if data["longitude"] else None

    if not update:
        return jsonify({"error": "No fields to update"}), 400
    mongo.db.public_bins.update_one({"_id": ObjectId(bin_id)}, {"$set": update})
    write_log("UPDATE_BIN", "public_bins", bin_id)
    return jsonify({"message": "Bin updated"}), 200


@bins_bp.route("/<bin_id>", methods=["DELETE"])
@require_auth
@require_role(ROLE_SYSADMIN, ROLE_DISTRICT_ADMIN)
def delete_bin(bin_id):
    mongo.db.public_bins.delete_one({"_id": ObjectId(bin_id)})
    write_log("DELETE_BIN", "public_bins", bin_id)
    return jsonify({"message": "Bin deleted"}), 200


@bins_bp.route("/import", methods=["POST"])
@require_auth
@require_role(ROLE_SYSADMIN, ROLE_DISTRICT_ADMIN)
def import_bins():
    if "file" not in request.files:
        return jsonify({"error": "No file uploaded"}), 400
    file = request.files["file"]

    required = ["bin_id", "name", "capacity_kg", "district_name", "mandal_name", "ward_name", "location"]
    rows, errors = parse_excel(file, required_cols=required)
    if errors:
        return jsonify({"errors": errors}), 422

    # Build lookup maps
    district_map = {d["name"].lower(): d["_id"] for d in mongo.db.districts.find()}
    mandal_map   = {m["name"].lower(): m["_id"] for m in mongo.db.mandals.find()}
    ward_map     = {w["name"].lower(): w["_id"] for w in mongo.db.wards.find()}
    existing_ids = {b["bin_id"] for b in mongo.db.public_bins.find({}, {"bin_id": 1})}

    row_errors, docs = [], []
    seen_ids = set()

    for i, row in enumerate(rows, start=2):
        bid   = sanitise_string(row.get("bin_id") or "").upper()
        name  = sanitise_string(row.get("name") or "")
        cap   = row.get("capacity_kg")
        dname = (row.get("district_name") or "").strip().lower()
        mname = (row.get("mandal_name") or "").strip().lower()
        wname = (row.get("ward_name") or "").strip().lower()

        if not bid:
            row_errors.append(f"Row {i}: bin_id is empty"); continue
        if bid in existing_ids or bid in seen_ids:
            row_errors.append(f"Row {i}: Duplicate bin ID '{bid}'"); continue
        ok, err = validate_capacity(cap)
        if not ok:
            row_errors.append(f"Row {i}: {err}"); continue
        if dname not in district_map:
            row_errors.append(f"Row {i}: District '{dname}' not found"); continue
        if mname not in mandal_map:
            row_errors.append(f"Row {i}: Mandal '{mname}' not found"); continue
        if wname not in ward_map:
            row_errors.append(f"Row {i}: Ward '{wname}' not found"); continue

        seen_ids.add(bid)
        docs.append({
            "bin_id":      bid,
            "name":        name,
            "capacity_kg": float(cap),
            "district_id": district_map[dname],
            "mandal_id":   mandal_map[mname],
            "ward_id":     ward_map[wname],
            "location":    sanitise_string(row.get("location") or ""),
            "latitude":    float(row["latitude"])  if row.get("latitude")  else None,
            "longitude":   float(row["longitude"]) if row.get("longitude") else None,
            "status":      "active",
            "created_at":  datetime.now(timezone.utc),
        })

    if row_errors:
        return jsonify({"errors": row_errors, "valid_count": len(docs)}), 422
    if docs:
        mongo.db.public_bins.insert_many(docs)
    write_log("IMPORT_BINS", "public_bins", details={"count": len(docs)})
    return jsonify({"message": f"Imported {len(docs)} bins"}), 201
