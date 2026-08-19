"""Wards blueprint — covers both Ward (urban) and Village (rural)."""
from flask import Blueprint, request, jsonify, g
from bson import ObjectId
from datetime import datetime, timezone

from ...extensions import mongo
from ...middleware.rbac import require_auth, require_role, ROLE_SYSADMIN, ROLE_DISTRICT_ADMIN
from ...utils.audit import write_log
from ...utils.serializers import serialize_doc, serialize_list
from ...utils.validators import validate_required, sanitise_string
from ...utils.excel import parse_excel

wards_bp = Blueprint("wards", __name__)

VALID_TYPES = {"ward", "village"}


@wards_bp.route("/", methods=["GET"])
@require_auth
def get_wards():
    mandal_id   = request.args.get("mandal_id")
    district_id = request.args.get("district_id")
    ward_type   = request.args.get("type")

    user  = g.current_user
    query = {}
    if ward_type in VALID_TYPES:
        query["type"] = ward_type
    if mandal_id:
        query["mandal_id"] = ObjectId(mandal_id)
    elif district_id:
        query["district_id"] = ObjectId(district_id)
    elif user["role"] == "district_admin" and user.get("district_id"):
        query["district_id"] = ObjectId(user["district_id"])
    elif user["role"] == "mandal_officer" and user.get("mandal_id"):
        query["mandal_id"] = ObjectId(user["mandal_id"])

    docs = list(mongo.db.wards.find(query).sort("name", 1))
    return jsonify(serialize_list(docs)), 200


@wards_bp.route("/", methods=["POST"])
@require_auth
@require_role(ROLE_SYSADMIN, ROLE_DISTRICT_ADMIN)
def create_ward():
    data = request.get_json(force=True) or {}
    ok, err = validate_required(data, ["name", "mandal_id", "district_id"])
    if not ok:
        return jsonify({"error": err}), 400

    ward_type = data.get("type", "ward")
    if ward_type not in VALID_TYPES:
        return jsonify({"error": f"type must be 'ward' or 'village'"}), 400

    doc = {
        "name":        sanitise_string(data["name"]),
        "type":        ward_type,
        "mandal_id":   ObjectId(data["mandal_id"]),
        "district_id": ObjectId(data["district_id"]),
        "created_at":  datetime.now(timezone.utc),
    }
    result = mongo.db.wards.insert_one(doc)
    write_log("CREATE_WARD", "wards", result.inserted_id, {"name": doc["name"], "type": ward_type})
    return jsonify({"_id": str(result.inserted_id)}), 201


@wards_bp.route("/<ward_id>", methods=["PUT"])
@require_auth
@require_role(ROLE_SYSADMIN, ROLE_DISTRICT_ADMIN)
def update_ward(ward_id):
    data   = request.get_json(force=True) or {}
    update = {}
    for field in ["name", "type"]:
        if field in data:
            update[field] = sanitise_string(data[field])
    if not update:
        return jsonify({"error": "No fields to update"}), 400
    mongo.db.wards.update_one({"_id": ObjectId(ward_id)}, {"$set": update})
    write_log("UPDATE_WARD", "wards", ward_id)
    return jsonify({"message": "Ward updated"}), 200


@wards_bp.route("/<ward_id>", methods=["DELETE"])
@require_auth
@require_role(ROLE_SYSADMIN, ROLE_DISTRICT_ADMIN)
def delete_ward(ward_id):
    mongo.db.wards.delete_one({"_id": ObjectId(ward_id)})
    write_log("DELETE_WARD", "wards", ward_id)
    return jsonify({"message": "Ward deleted"}), 200


@wards_bp.route("/import", methods=["POST"])
@require_auth
@require_role(ROLE_SYSADMIN, ROLE_DISTRICT_ADMIN)
def import_wards():
    if "file" not in request.files:
        return jsonify({"error": "No file uploaded"}), 400
    file        = request.files["file"]
    district_id = request.form.get("district_id")
    if not district_id:
        return jsonify({"error": "district_id required"}), 400

    rows, errors = parse_excel(file, required_cols=["name", "mandal_name", "type"])
    if errors:
        return jsonify({"errors": errors}), 422

    # Build mandal lookup {name_lower: ObjectId}
    mandals = {m["name"].lower(): m["_id"] for m in mongo.db.mandals.find(
        {"district_id": ObjectId(district_id)}
    )}

    row_errors, docs = [], []
    for i, row in enumerate(rows, start=2):
        name        = (row.get("name") or "").strip()
        mandal_name = (row.get("mandal_name") or "").strip().lower()
        ward_type   = (row.get("type") or "ward").strip().lower()

        if not name:
            row_errors.append(f"Row {i}: name is empty"); continue
        if ward_type not in VALID_TYPES:
            row_errors.append(f"Row {i}: type must be 'ward' or 'village'"); continue
        if mandal_name not in mandals:
            row_errors.append(f"Row {i}: mandal '{mandal_name}' not found"); continue

        docs.append({
            "name":        name,
            "type":        ward_type,
            "mandal_id":   mandals[mandal_name],
            "district_id": ObjectId(district_id),
            "created_at":  datetime.now(timezone.utc),
        })

    if row_errors:
        return jsonify({"errors": row_errors}), 422
    if docs:
        mongo.db.wards.insert_many(docs)
    write_log("IMPORT_WARDS", "wards", details={"count": len(docs)})
    return jsonify({"message": f"Imported {len(docs)} wards/villages"}), 201
