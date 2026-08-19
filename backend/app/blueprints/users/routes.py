"""Users blueprint — CRUD + collector assignment."""
import bcrypt
from flask import Blueprint, request, jsonify, g
from bson import ObjectId
from datetime import datetime, timezone

from ...extensions import mongo
from ...middleware.rbac import require_auth, require_role, \
    ROLE_SYSADMIN, ROLE_DISTRICT_ADMIN
from ...utils.audit import write_log
from ...utils.serializers import serialize_doc, serialize_list
from ...utils.validators import validate_required, validate_role, sanitise_string
from ...utils.excel import parse_excel

users_bp = Blueprint("users", __name__)


def _hash(plain: str) -> str:
    return bcrypt.hashpw(plain.encode(), bcrypt.gensalt()).decode()


def _safe(user: dict) -> dict:
    """Remove password hash before returning."""
    user.pop("password_hash", None)
    return user


@users_bp.route("/me", methods=["GET"])
@require_auth
def get_me():
    user = mongo.db.users.find_one({"_id": ObjectId(g.current_user["_id"])})
    return jsonify(_safe(serialize_doc(user))), 200


@users_bp.route("/", methods=["GET"])
@require_auth
@require_role(ROLE_SYSADMIN, ROLE_DISTRICT_ADMIN)
def get_users():
    query = {}
    if g.current_user["role"] == ROLE_DISTRICT_ADMIN and g.current_user.get("district_id"):
        query["district_id"] = ObjectId(g.current_user["district_id"])
    if request.args.get("role"):
        query["role"] = request.args["role"]
    page     = max(int(request.args.get("page", 1)), 1)
    per_page = min(int(request.args.get("per_page", 50)), 200)
    skip     = (page - 1) * per_page
    total    = mongo.db.users.count_documents(query)
    docs     = list(mongo.db.users.find(query, {"password_hash": 0}).skip(skip).limit(per_page))
    return jsonify({"data": serialize_list(docs), "total": total, "page": page}), 200


@users_bp.route("/", methods=["POST"])
@require_auth
@require_role(ROLE_SYSADMIN, ROLE_DISTRICT_ADMIN)
def create_user():
    data = request.get_json(force=True) or {}
    ok, err = validate_required(data, ["username", "password", "role", "full_name"])
    if not ok:
        return jsonify({"error": err}), 400

    ok, err = validate_role(data["role"])
    if not ok:
        return jsonify({"error": err}), 400

    # District admins cannot create sysadmin
    if g.current_user["role"] == ROLE_DISTRICT_ADMIN and data["role"] == ROLE_SYSADMIN:
        return jsonify({"error": "Forbidden"}), 403

    if mongo.db.users.find_one({"username": data["username"]}):
        return jsonify({"error": "Username already exists"}), 409

    doc = {
        "username":      sanitise_string(data["username"]),
        "password_hash": _hash(data["password"]),
        "full_name":     sanitise_string(data["full_name"]),
        "role":          data["role"],
        "status":        "active",
        "district_id":   ObjectId(data["district_id"]) if data.get("district_id") else None,
        "mandal_id":     ObjectId(data["mandal_id"])   if data.get("mandal_id")   else None,
        "ward_ids":      [ObjectId(w) for w in data.get("ward_ids", [])],
        "bin_ids":       [ObjectId(b) for b in data.get("bin_ids", [])],
        "created_at":    datetime.now(timezone.utc),
        "last_login":    None,
    }
    result = mongo.db.users.insert_one(doc)
    write_log("CREATE_USER", "users", result.inserted_id, {"username": doc["username"], "role": doc["role"]})
    return jsonify({"_id": str(result.inserted_id)}), 201


@users_bp.route("/<user_id>", methods=["PUT"])
@require_auth
@require_role(ROLE_SYSADMIN, ROLE_DISTRICT_ADMIN)
def update_user(user_id):
    data   = request.get_json(force=True) or {}
    update = {}
    for field in ["full_name", "status"]:
        if field in data:
            update[field] = sanitise_string(data[field])
    if "password" in data and data["password"]:
        update["password_hash"] = _hash(data["password"])
    if "ward_ids" in data:
        update["ward_ids"] = [ObjectId(w) for w in data["ward_ids"]]
    if "bin_ids" in data:
        update["bin_ids"]  = [ObjectId(b) for b in data["bin_ids"]]
    if not update:
        return jsonify({"error": "Nothing to update"}), 400
    mongo.db.users.update_one({"_id": ObjectId(user_id)}, {"$set": update})
    write_log("UPDATE_USER", "users", user_id)
    return jsonify({"message": "User updated"}), 200


@users_bp.route("/<user_id>", methods=["DELETE"])
@require_auth
@require_role(ROLE_SYSADMIN)
def delete_user(user_id):
    mongo.db.users.delete_one({"_id": ObjectId(user_id)})
    write_log("DELETE_USER", "users", user_id)
    return jsonify({"message": "User deleted"}), 200


@users_bp.route("/import", methods=["POST"])
@require_auth
@require_role(ROLE_SYSADMIN, ROLE_DISTRICT_ADMIN)
def import_users():
    if "file" not in request.files:
        return jsonify({"error": "No file uploaded"}), 400
    file = request.files["file"]
    rows, errors = parse_excel(file, required_cols=["username", "full_name", "role", "password"])
    if errors:
        return jsonify({"errors": errors}), 422

    row_errors, docs = [], []
    for i, row in enumerate(rows, start=2):
        username  = sanitise_string(row.get("username") or "")
        full_name = sanitise_string(row.get("full_name") or "")
        role      = (row.get("role") or "").strip().lower()
        password  = (row.get("password") or "Admin@123")

        if not username:
            row_errors.append(f"Row {i}: username empty"); continue
        ok, err = validate_role(role)
        if not ok:
            row_errors.append(f"Row {i}: {err}"); continue
        if mongo.db.users.find_one({"username": username}):
            row_errors.append(f"Row {i}: username '{username}' already exists"); continue

        district_name = (row.get("district_name") or "").strip().lower()
        d = mongo.db.districts.find_one({"name": {"$regex": f"^{district_name}$", "$options": "i"}}) if district_name else None

        docs.append({
            "username":      username,
            "password_hash": _hash(password),
            "full_name":     full_name,
            "role":          role,
            "status":        "active",
            "district_id":   d["_id"] if d else None,
            "mandal_id":     None,
            "ward_ids":      [],
            "bin_ids":       [],
            "created_at":    datetime.now(timezone.utc),
            "last_login":    None,
        })

    if row_errors:
        return jsonify({"errors": row_errors}), 422
    if docs:
        mongo.db.users.insert_many(docs)
    write_log("IMPORT_USERS", "users", details={"count": len(docs)})
    return jsonify({"message": f"Imported {len(docs)} users"}), 201


@users_bp.route("/<user_id>/assign-collectors", methods=["PUT"])
@require_auth
@require_role(ROLE_SYSADMIN, ROLE_DISTRICT_ADMIN)
def assign_collector(user_id):
    """Assign ward_ids and bin_ids to a collector."""
    data = request.get_json(force=True) or {}
    update = {
        "ward_ids": [ObjectId(w) for w in data.get("ward_ids", [])],
        "bin_ids":  [ObjectId(b) for b in data.get("bin_ids",  [])],
    }
    mongo.db.users.update_one({"_id": ObjectId(user_id)}, {"$set": update})
    write_log("ASSIGN_COLLECTOR", "users", user_id, {"ward_count": len(update["ward_ids"])})
    return jsonify({"message": "Assignments updated"}), 200
