"""Districts blueprint — CRUD for the districts collection."""
from flask import Blueprint, request, jsonify, g
from bson import ObjectId
from datetime import datetime, timezone

from ...extensions import mongo
from ...middleware.rbac import require_auth, require_role, ROLE_SYSADMIN, ROLE_DISTRICT_ADMIN
from ...utils.audit import write_log
from ...utils.serializers import serialize_doc, serialize_list
from ...utils.validators import validate_required, sanitise_string

districts_bp = Blueprint("districts", __name__)


@districts_bp.route("/", methods=["GET"])
@require_auth
def get_districts():
    docs = list(mongo.db.districts.find().sort("name", 1))
    return jsonify(serialize_list(docs)), 200


@districts_bp.route("/<district_id>", methods=["GET"])
@require_auth
def get_district(district_id):
    doc = mongo.db.districts.find_one({"_id": ObjectId(district_id)})
    if not doc:
        return jsonify({"error": "District not found"}), 404
    return jsonify(serialize_doc(doc)), 200


@districts_bp.route("/", methods=["POST"])
@require_auth
@require_role(ROLE_SYSADMIN)
def create_district():
    data = request.get_json(force=True) or {}
    ok, err = validate_required(data, ["name", "code"])
    if not ok:
        return jsonify({"error": err}), 400

    doc = {
        "name":        sanitise_string(data["name"]),
        "code":        sanitise_string(data["code"]).upper(),
        "office_name": sanitise_string(data.get("office_name", "")),
        "address":     sanitise_string(data.get("address", "")),
        "phone":       sanitise_string(data.get("phone", "")),
        "email":       sanitise_string(data.get("email", "")),
        "created_at":  datetime.now(timezone.utc),
    }
    result = mongo.db.districts.insert_one(doc)
    write_log("CREATE_DISTRICT", "districts", result.inserted_id, {"name": doc["name"]})
    return jsonify({"_id": str(result.inserted_id), **serialize_doc(doc)}), 201


@districts_bp.route("/<district_id>", methods=["PUT"])
@require_auth
@require_role(ROLE_SYSADMIN, ROLE_DISTRICT_ADMIN)
def update_district(district_id):
    data = request.get_json(force=True) or {}
    update = {}
    for field in ["name", "code", "office_name", "address", "phone", "email"]:
        if field in data:
            update[field] = sanitise_string(data[field])
    if not update:
        return jsonify({"error": "No fields to update"}), 400
    mongo.db.districts.update_one({"_id": ObjectId(district_id)}, {"$set": update})
    write_log("UPDATE_DISTRICT", "districts", district_id, update)
    return jsonify({"message": "District updated"}), 200


@districts_bp.route("/<district_id>", methods=["DELETE"])
@require_auth
@require_role(ROLE_SYSADMIN)
def delete_district(district_id):
    mongo.db.districts.delete_one({"_id": ObjectId(district_id)})
    write_log("DELETE_DISTRICT", "districts", district_id)
    return jsonify({"message": "District deleted"}), 200
