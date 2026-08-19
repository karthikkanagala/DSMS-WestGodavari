"""
Authentication Blueprint
------------------------
Routes: /api/auth/login, /api/auth/logout, /api/auth/refresh, /api/auth/me
"""
from flask import Blueprint, request, jsonify, g
from flask_jwt_extended import (
    create_access_token,
    get_jwt_identity,
    verify_jwt_in_request,
)
from datetime import datetime, timezone
import bcrypt
from bson import ObjectId

from ..extensions import mongo
from ..middleware.rbac import require_auth
from ..utils.audit import write_log
from ..utils.serializers import serialize_doc

auth_bp = Blueprint("auth", __name__)


def _hash_password(plain: str) -> str:
    return bcrypt.hashpw(plain.encode(), bcrypt.gensalt()).decode()


def _check_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode(), hashed.encode())


# ──────────────────────────────────────────────
# POST /api/auth/login
# ──────────────────────────────────────────────
@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json(force=True) or {}
    username = (data.get("username") or "").strip()
    password = data.get("password") or ""

    if not username or not password:
        return jsonify({"error": "Username and password are required"}), 400

    user = mongo.db.users.find_one({"username": username})
    if not user:
        return jsonify({"error": "Invalid credentials"}), 401

    if user.get("status") != "active":
        return jsonify({"error": "Account is inactive. Contact administrator."}), 403

    if not _check_password(password, user["password_hash"]):
        return jsonify({"error": "Invalid credentials"}), 401

    # Create JWT
    token = create_access_token(identity=str(user["_id"]))

    # Update last_login
    mongo.db.users.update_one(
        {"_id": user["_id"]},
        {"$set": {"last_login": datetime.now(timezone.utc)}}
    )

    # Build safe user object
    user_data = {
        "_id":         str(user["_id"]),
        "username":    user["username"],
        "full_name":   user.get("full_name", ""),
        "role":        user["role"],
        "district_id": str(user["district_id"]) if user.get("district_id") else None,
        "mandal_id":   str(user["mandal_id"])   if user.get("mandal_id")   else None,
        "ward_ids":    [str(w) for w in user.get("ward_ids", [])],
        "bin_ids":     [str(b) for b in user.get("bin_ids",  [])],
        "status":      user.get("status"),
    }

    # Audit
    g.current_user = user_data
    write_log("LOGIN")

    return jsonify({"token": token, "user": user_data}), 200


# ──────────────────────────────────────────────
# POST /api/auth/logout
# ──────────────────────────────────────────────
@auth_bp.route("/logout", methods=["POST"])
@require_auth
def logout():
    write_log("LOGOUT")
    return jsonify({"message": "Logged out successfully"}), 200


# ──────────────────────────────────────────────
# GET /api/auth/me
# ──────────────────────────────────────────────
@auth_bp.route("/me", methods=["GET"])
@require_auth
def me():
    return jsonify({"user": g.current_user}), 200


# ──────────────────────────────────────────────
# POST /api/auth/forgot-password  (stub)
# ──────────────────────────────────────────────
@auth_bp.route("/forgot-password", methods=["POST"])
def forgot_password():
    return jsonify({
        "message": "Please contact your System Administrator to reset your password."
    }), 200
