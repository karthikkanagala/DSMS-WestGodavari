"""Mandals blueprint — full CRUD + Excel import."""
from flask import Blueprint, request, jsonify, g
from bson import ObjectId
from datetime import datetime, timezone

from ...extensions import mongo
from ...middleware.rbac import require_auth, require_role, scope_filter, \
    ROLE_SYSADMIN, ROLE_DISTRICT_ADMIN, ROLE_MANDAL_OFFICER, ROLE_SUPERVISOR, ROLE_COLLECTOR
from ...utils.audit import write_log
from ...utils.serializers import serialize_doc, serialize_list
from ...utils.validators import validate_required, sanitise_string
from ...utils.excel import parse_excel

mandals_bp = Blueprint("mandals", __name__)


@mandals_bp.route("/", methods=["GET"])
@require_auth
def get_mandals():
    district_id = request.args.get("district_id")
    query = {}
    if district_id:
        query["district_id"] = ObjectId(district_id)
    # Non-sysadmin: restrict to own district
    user = g.current_user
    if user["role"] != ROLE_SYSADMIN and user.get("district_id"):
        query["district_id"] = ObjectId(user["district_id"])
    docs = list(mongo.db.mandals.find(query).sort("name", 1))
    return jsonify(serialize_list(docs)), 200


@mandals_bp.route("/", methods=["POST"])
@require_auth
@require_role(ROLE_SYSADMIN, ROLE_DISTRICT_ADMIN)
def create_mandal():
    data = request.get_json(force=True) or {}
    ok, err = validate_required(data, ["name", "district_id"])
    if not ok:
        return jsonify({"error": err}), 400

    doc = {
        "name":        sanitise_string(data["name"]),
        "district_id": ObjectId(data["district_id"]),
        "created_at":  datetime.now(timezone.utc),
    }
    result = mongo.db.mandals.insert_one(doc)
    write_log("CREATE_MANDAL", "mandals", result.inserted_id, {"name": doc["name"]})
    return jsonify({"_id": str(result.inserted_id)}), 201


@mandals_bp.route("/<mandal_id>", methods=["PUT"])
@require_auth
@require_role(ROLE_SYSADMIN, ROLE_DISTRICT_ADMIN)
def update_mandal(mandal_id):
    data = request.get_json(force=True) or {}
    update = {}
    if "name" in data:
        update["name"] = sanitise_string(data["name"])
    if not update:
        return jsonify({"error": "No fields to update"}), 400
    mongo.db.mandals.update_one({"_id": ObjectId(mandal_id)}, {"$set": update})
    write_log("UPDATE_MANDAL", "mandals", mandal_id)
    return jsonify({"message": "Mandal updated"}), 200


@mandals_bp.route("/<mandal_id>", methods=["DELETE"])
@require_auth
@require_role(ROLE_SYSADMIN, ROLE_DISTRICT_ADMIN)
def delete_mandal(mandal_id):
    mongo.db.mandals.delete_one({"_id": ObjectId(mandal_id)})
    write_log("DELETE_MANDAL", "mandals", mandal_id)
    return jsonify({"message": "Mandal deleted"}), 200


@mandals_bp.route("/import", methods=["POST"])
@require_auth
@require_role(ROLE_SYSADMIN, ROLE_DISTRICT_ADMIN)
def import_mandals():
    if "file" not in request.files:
        return jsonify({"error": "No file uploaded"}), 400
    file = request.files["file"]
    district_id = request.form.get("district_id")
    if not district_id:
        return jsonify({"error": "district_id is required"}), 400

    rows, errors = parse_excel(file, required_cols=["name"])
    if errors:
        return jsonify({"errors": errors}), 422

    # Validate & build docs
    row_errors = []
    docs = []
    for i, row in enumerate(rows, start=2):
        name = (row.get("name") or "").strip()
        if not name:
            row_errors.append(f"Row {i}: name is empty")
            continue
        docs.append({
            "name":        name,
            "district_id": ObjectId(district_id),
            "created_at":  datetime.now(timezone.utc),
        })

    if row_errors:
        return jsonify({"errors": row_errors}), 422

    if docs:
        mongo.db.mandals.insert_many(docs)
    write_log("IMPORT_MANDALS", "mandals", details={"count": len(docs)})
    return jsonify({"message": f"Imported {len(docs)} mandals"}), 201
