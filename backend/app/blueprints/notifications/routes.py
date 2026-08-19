"""Notifications blueprint — recent collections + overflow alerts."""
from flask import Blueprint, request, jsonify, g
from bson import ObjectId
from datetime import datetime, timezone, timedelta

from ...extensions import mongo
from ...middleware.rbac import require_auth
from ...utils.serializers import serialize_list

notifications_bp = Blueprint("notifications", __name__)


@notifications_bp.route("/", methods=["GET"])
@require_auth
def get_notifications():
    user  = g.current_user
    match = {}
    if user["role"] == "district_admin" and user.get("district_id"):
        match["district_id"] = ObjectId(user["district_id"])
    elif user["role"] == "mandal_officer" and user.get("mandal_id"):
        match["mandal_id"] = ObjectId(user["mandal_id"])
    elif user["role"] == "supervisor" and user.get("ward_ids"):
        match["ward_id"] = {"$in": [ObjectId(w) for w in user["ward_ids"]]}
    elif user["role"] == "collector":
        match["collector_id"] = ObjectId(user["_id"])

    recent_collections = list(
        mongo.db.collections.find(match).sort("timestamp", -1).limit(20)
    )
    recent_overflow = list(
        mongo.db.overflow_alerts.find({**match, "status": "open"}).sort("detected_at", -1).limit(20)
    )
    recent_logs = list(
        mongo.db.activity_logs.find().sort("timestamp", -1).limit(10)
    )

    return jsonify({
        "collections": serialize_list(recent_collections),
        "overflow":    serialize_list(recent_overflow),
        "activity":    serialize_list(recent_logs),
    }), 200
