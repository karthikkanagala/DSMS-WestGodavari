"""
Collections blueprint
---------------------
POST /api/collections  — collector submits a waste collection record
GET  /api/collections  — scoped fetch with filters and pagination
GET  /api/collections/<id> — single record
PUT  /api/collections/<id>/verify — supervisor verifies

Overflow auto-detection runs on every POST.
"""
from flask import Blueprint, request, jsonify, g
from bson import ObjectId
from datetime import datetime, timezone, date

from ...extensions import mongo
from ...middleware.rbac import require_auth, require_role, \
    ROLE_SYSADMIN, ROLE_DISTRICT_ADMIN, ROLE_MANDAL_OFFICER, ROLE_SUPERVISOR, ROLE_COLLECTOR
from ...utils.audit import write_log
from ...utils.serializers import serialize_doc, serialize_list
from ...utils.validators import validate_required, validate_waste_kg

collections_bp = Blueprint("collections", __name__)


# ──────────────────────────────────────────────
# OVERFLOW DETECTION (called on every POST)
# ──────────────────────────────────────────────
def _check_overflow(bin_doc, waste_kg: float, collection_id, user):
    """If waste_kg >= bin capacity, create/update an overflow alert."""
    if waste_kg >= bin_doc["capacity_kg"]:
        now = datetime.now(timezone.utc)
        existing = mongo.db.overflow_alerts.find_one({
            "bin_id": bin_doc["_id"],
            "status": "open",
        })
        if not existing:
            mongo.db.overflow_alerts.insert_one({
                "bin_id":        bin_doc["_id"],
                "bin_ref":       bin_doc["bin_id"],
                "ward_id":       bin_doc["ward_id"],
                "mandal_id":     bin_doc["mandal_id"],
                "district_id":   bin_doc["district_id"],
                "collection_id": collection_id,
                "detected_at":   now,
                "status":        "open",
                "resolved_at":   None,
                "resolved_by":   None,
            })
        return True
    return False


# ──────────────────────────────────────────────
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
    elif user["role"] == ROLE_COLLECTOR:
        query["collector_id"] = ObjectId(user["_id"])
    return query


@collections_bp.route("/", methods=["GET"])
@require_auth
def get_collections():
    query = _scoped_query()
    # Optional filters
    for param, field in [("ward_id", "ward_id"), ("mandal_id", "mandal_id"),
                         ("district_id", "district_id"), ("collector_id", "collector_id")]:
        val = request.args.get(param)
        if val:
            query[field] = ObjectId(val)
    if request.args.get("date"):
        try:
            d = datetime.strptime(request.args["date"], "%Y-%m-%d").date()
            query["date"] = {"$gte": datetime(d.year, d.month, d.day, tzinfo=timezone.utc),
                             "$lt":  datetime(d.year, d.month, d.day, 23, 59, 59, tzinfo=timezone.utc)}
        except ValueError:
            pass

    page     = max(int(request.args.get("page", 1)), 1)
    per_page = min(int(request.args.get("per_page", 50)), 200)
    skip     = (page - 1) * per_page
    total    = mongo.db.collections.count_documents(query)
    docs     = list(mongo.db.collections.find(query).sort("timestamp", -1).skip(skip).limit(per_page))
    return jsonify({"data": serialize_list(docs), "total": total, "page": page,
                    "pages": (total + per_page - 1) // per_page}), 200


@collections_bp.route("/<col_id>", methods=["GET"])
@require_auth
def get_collection(col_id):
    doc = mongo.db.collections.find_one({"_id": ObjectId(col_id)})
    if not doc:
        return jsonify({"error": "Record not found"}), 404
    return jsonify(serialize_doc(doc)), 200


@collections_bp.route("/", methods=["POST"])
@require_auth
@require_role(ROLE_COLLECTOR, ROLE_SUPERVISOR, ROLE_DISTRICT_ADMIN, ROLE_SYSADMIN)
def submit_collection():
    data = request.get_json(force=True) or {}
    ok, err = validate_required(data, ["bin_id", "waste_kg"])
    if not ok:
        return jsonify({"error": err}), 400

    ok, err = validate_waste_kg(data["waste_kg"])
    if not ok:
        return jsonify({"error": err}), 400

    waste_kg = float(data["waste_kg"])
    user     = g.current_user

    # Fetch bin
    bin_doc = mongo.db.public_bins.find_one({"_id": ObjectId(data["bin_id"])})
    if not bin_doc:
        return jsonify({"error": "Bin not found"}), 404

    # Collectors can only submit for their assigned bins
    if user["role"] == ROLE_COLLECTOR:
        if str(bin_doc["_id"]) not in user.get("bin_ids", []):
            return jsonify({"error": "Forbidden: bin not assigned to you"}), 403

    now       = datetime.now(timezone.utc)
    fill_pct  = round((waste_kg / bin_doc["capacity_kg"]) * 100, 1) if bin_doc["capacity_kg"] > 0 else 0
    is_overflow = waste_kg >= bin_doc["capacity_kg"]
    status    = "overflow" if is_overflow else ("completed" if fill_pct >= 100 else "in_progress")

    record = {
        "bin_id":         bin_doc["_id"],
        "bin_ref":        bin_doc["bin_id"],
        "collector_id":   ObjectId(user["_id"]),
        "collector_name": user.get("full_name", user["username"]),
        "ward_id":        bin_doc["ward_id"],
        "mandal_id":      bin_doc["mandal_id"],
        "district_id":    bin_doc["district_id"],
        "waste_kg":       waste_kg,
        "fill_level":     fill_pct,
        "status":         status,
        "remarks":        (data.get("remarks") or "").strip()[:500],
        "photo_url":      data.get("photo_url"),
        "date":           now,
        "timestamp":      now,
        "created_at":     now,
    }
    result = mongo.db.collections.insert_one(record)

    # Overflow detection
    _check_overflow(bin_doc, waste_kg, result.inserted_id, user)

    write_log("SUBMIT_COLLECTION", "collections", result.inserted_id,
              {"bin_ref": bin_doc["bin_id"], "waste_kg": waste_kg})
    return jsonify({"_id": str(result.inserted_id), "status": status, "fill_level": fill_pct}), 201


@collections_bp.route("/<col_id>/verify", methods=["PUT"])
@require_auth
@require_role(ROLE_SUPERVISOR, ROLE_DISTRICT_ADMIN, ROLE_SYSADMIN)
def verify_collection(col_id):
    mongo.db.collections.update_one(
        {"_id": ObjectId(col_id)},
        {"$set": {"verified": True, "verified_by": ObjectId(g.current_user["_id"]),
                  "verified_at": datetime.now(timezone.utc)}}
    )
    write_log("VERIFY_COLLECTION", "collections", col_id)
    return jsonify({"message": "Collection verified"}), 200
