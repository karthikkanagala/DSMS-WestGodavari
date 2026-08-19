"""
Audit Log Utility
-----------------
Writes to the activity_logs collection.
Call write_log() from any route to record user actions.
"""
from datetime import datetime, timezone
from flask import g, request
from bson import ObjectId
from ..extensions import mongo


def write_log(action: str, target_collection: str = None, target_id=None, details: dict = None):
    """
    Write an audit log entry.

    :param action:             Short action string e.g. "CREATE_BIN", "LOGIN"
    :param target_collection:  MongoDB collection name that was acted on
    :param target_id:          ObjectId of the acted-on document (optional)
    :param details:            Extra key-value info (optional)
    """
    user = getattr(g, "current_user", None)
    entry = {
        "user_id":           ObjectId(user["_id"]) if user else None,
        "username":          user["username"] if user else "anonymous",
        "role":              user["role"] if user else "unknown",
        "action":            action,
        "target_collection": target_collection,
        "target_id":         ObjectId(target_id) if target_id else None,
        "details":           details,
        "ip":                request.remote_addr if request else None,
        "timestamp":         datetime.now(timezone.utc),
    }
    try:
        mongo.db.activity_logs.insert_one(entry)
    except Exception:
        pass  # Never let audit logging crash a real request
