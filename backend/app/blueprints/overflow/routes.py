"""Overflow alerts blueprint."""
from flask import Blueprint, request, jsonify, g
from bson import ObjectId
from datetime import datetime, timezone

from ...extensions import mongo
from ...middleware.rbac import require_auth, require_role, \
    ROLE_SYSADMIN, ROLE_DISTRICT_ADMIN, ROLE_MANDAL_OFFICER, ROLE_SUPERVISOR
from ...utils.audit import write_log
from ...utils.serializers import serialize_list, serialize_doc

overflow_bp = Blueprint("overflow", __name__)


def _scoped_query():
    user  = g.current_user
    query = {}
    if user["role"] == ROLE_DISTRICT_ADMIN and user.get("district_id"):
        query["district_id"] = ObjectId(user["district_id"])
    elif user["role"] == ROLE_MANDAL_OFFICER and user.get("mandal_id"):
        query["mandal_id"] = ObjectId(user["mandal_id"])
    elif user["role"] == ROLE_SUPERVISOR and user.get("ward_ids"):
        query["ward_id"] = {"$in": [ObjectId(w) for w in user["ward_ids"]]}
    return query


@overflow_bp.route("/", methods=["GET"])
@require_auth
def get_overflow_alerts():
    query  = _scoped_query()
    status = request.args.get("status")
    if status:
        query["status"] = status
    page     = max(int(request.args.get("page", 1)), 1)
    per_page = min(int(request.args.get("per_page", 50)), 200)
    skip     = (page - 1) * per_page
    total    = mongo.db.overflow_alerts.count_documents(query)
    docs     = list(mongo.db.overflow_alerts.find(query).sort("detected_at", -1).skip(skip).limit(per_page))
    return jsonify({"data": serialize_list(docs), "total": total}), 200


@overflow_bp.route("/<alert_id>/resolve", methods=["PUT"])
@require_auth
@require_role(ROLE_SUPERVISOR, ROLE_DISTRICT_ADMIN, ROLE_SYSADMIN)
def resolve_alert(alert_id):
    mongo.db.overflow_alerts.update_one(
        {"_id": ObjectId(alert_id)},
        {"$set": {
            "status":      "resolved",
            "resolved_at": datetime.now(timezone.utc),
            "resolved_by": ObjectId(g.current_user["_id"]),
        }}
    )
    write_log("RESOLVE_OVERFLOW", "overflow_alerts", alert_id)
    return jsonify({"message": "Alert resolved"}), 200
