"""
Analytics blueprint
--------------------
Powers the dashboard cards, charts, heatmap, and ward drill-down.
All queries are scoped per the user's role.
"""
from flask import Blueprint, request, jsonify, g
from bson import ObjectId
from datetime import datetime, timezone, timedelta

from ...extensions import mongo
from ...middleware.rbac import require_auth, ROLE_SYSADMIN, ROLE_DISTRICT_ADMIN, \
    ROLE_MANDAL_OFFICER, ROLE_SUPERVISOR

analytics_bp = Blueprint("analytics", __name__)


def _scope():
    """Return a base match dict scoped to the current user."""
    user  = g.current_user
    match = {}
    if user["role"] == ROLE_SYSADMIN:
        pass
    elif user["role"] == ROLE_DISTRICT_ADMIN and user.get("district_id"):
        match["district_id"] = ObjectId(user["district_id"])
    elif user["role"] == ROLE_MANDAL_OFFICER and user.get("mandal_id"):
        match["mandal_id"] = ObjectId(user["mandal_id"])
    elif user["role"] == ROLE_SUPERVISOR and user.get("ward_ids"):
        match["ward_id"] = {"$in": [ObjectId(w) for w in user["ward_ids"]]}
    return match


@analytics_bp.route("/dashboard", methods=["GET"])
@require_auth
def dashboard():
    """Return all card + chart data in one call."""
    match    = _scope()
    district = request.args.get("district_id")
    mandal   = request.args.get("mandal_id")
    ward     = request.args.get("ward_id")
    date_str = request.args.get("date")

    if district: match["district_id"] = ObjectId(district)
    if mandal:   match["mandal_id"]   = ObjectId(mandal)
    if ward:     match["ward_id"]     = ObjectId(ward)

    date_match = dict(match)
    if date_str:
        try:
            d = datetime.strptime(date_str, "%Y-%m-%d")
            date_match["date"] = {
                "$gte": datetime(d.year, d.month, d.day, tzinfo=timezone.utc),
                "$lt":  datetime(d.year, d.month, d.day, 23, 59, 59, tzinfo=timezone.utc),
            }
        except ValueError:
            pass

    # Bin counts
    total_bins  = mongo.db.public_bins.count_documents(match)
    # Overflow count (open)
    overflow_count = mongo.db.overflow_alerts.count_documents({**match, "status": "open"})
    # Collections today
    today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    today_match = {**match, "date": {"$gte": today, "$lt": today + timedelta(days=1)}}
    total_waste  = list(mongo.db.collections.aggregate([
        {"$match": date_match},
        {"$group": {"_id": None, "total": {"$sum": "$waste_kg"}}}
    ]))
    total_waste_kg = total_waste[0]["total"] if total_waste else 0

    completed_today = mongo.db.collections.count_documents({**today_match, "status": "completed"})
    in_progress_today = mongo.db.collections.count_documents({**today_match, "status": "in_progress"})
    overflow_today  = mongo.db.collections.count_documents({**today_match, "status": "overflow"})
    not_started     = max(total_bins - completed_today - in_progress_today - overflow_today, 0)

    avg_waste_agg = list(mongo.db.collections.aggregate([
        {"$match": date_match},
        {"$group": {"_id": None, "avg": {"$avg": "$waste_kg"}}}
    ]))
    avg_waste = round(avg_waste_agg[0]["avg"], 1) if avg_waste_agg else 0

    total_collectors = mongo.db.users.count_documents({**({} if g.current_user["role"] == ROLE_SYSADMIN else {"district_id": ObjectId(g.current_user.get("district_id", "000000000000000000000000"))}), "role": "collector", "status": "active"}) if g.current_user["role"] != ROLE_SYSADMIN else mongo.db.users.count_documents({"role": "collector", "status": "active"})

    # Daily trend (last 30 days)
    thirty_ago = today - timedelta(days=29)
    daily_agg  = list(mongo.db.collections.aggregate([
        {"$match": {**match, "date": {"$gte": thirty_ago}}},
        {"$group": {
            "_id":   {"$dateToString": {"format": "%Y-%m-%d", "date": "$date"}},
            "total": {"$sum": "$waste_kg"},
        }},
        {"$sort": {"_id": 1}},
    ]))

    # Recent collections (10)
    recent_cols = list(mongo.db.collections.find(match).sort("timestamp", -1).limit(10))
    from ...utils.serializers import serialize_list
    recent_cols = serialize_list(recent_cols)

    # Recent overflow (10)
    recent_overflow = list(mongo.db.overflow_alerts.find({**match, "status": "open"}).sort("detected_at", -1).limit(10))
    recent_overflow = serialize_list(recent_overflow)

    return jsonify({
        "cards": {
            "total_bins":          total_bins,
            "total_waste_kg":      round(total_waste_kg, 1),
            "overflow_count":      overflow_count,
            "completed_today":     completed_today,
            "in_progress_today":   in_progress_today,
            "overflow_today":      overflow_today,
            "not_started":         not_started,
            "avg_waste_per_bin":   avg_waste,
            "total_collectors":    total_collectors,
        },
        "daily_trend": daily_agg,
        "recent_collections": recent_cols,
        "recent_overflow":    recent_overflow,
    }), 200


@analytics_bp.route("/heatmap", methods=["GET"])
@require_auth
def heatmap():
    """Return per-ward waste totals for the heatmap."""
    match    = _scope()
    district = request.args.get("district_id")
    mandal   = request.args.get("mandal_id")
    if district: match["district_id"] = ObjectId(district)
    if mandal:   match["mandal_id"]   = ObjectId(mandal)

    pipeline = [
        {"$match": match},
        {"$group": {
            "_id":           "$ward_id",
            "total_waste":   {"$sum": "$waste_kg"},
            "completed":     {"$sum": {"$cond": [{"$eq": ["$status", "completed"]}, 1, 0]}},
            "overflow_count":{"$sum": {"$cond": [{"$eq": ["$status", "overflow"]},  1, 0]}},
            "last_updated":  {"$max": "$timestamp"},
        }},
    ]
    agg = list(mongo.db.collections.aggregate(pipeline))

    # Enrich with ward info
    ward_ids = [row["_id"] for row in agg if row["_id"]]
    wards    = {w["_id"]: w for w in mongo.db.wards.find({"_id": {"$in": ward_ids}})}
    bins_agg = list(mongo.db.public_bins.aggregate([
        {"$match": {"ward_id": {"$in": ward_ids}}},
        {"$group": {"_id": "$ward_id", "count": {"$sum": 1}}},
    ]))
    bin_counts = {b["_id"]: b["count"] for b in bins_agg}

    result = []
    for row in agg:
        ward = wards.get(row["_id"], {})
        result.append({
            "ward_id":      str(row["_id"]) if row["_id"] else None,
            "ward_name":    ward.get("name", "Unknown"),
            "ward_type":    ward.get("type", "ward"),
            "total_waste":  round(row["total_waste"], 1),
            "total_bins":   bin_counts.get(row["_id"], 0),
            "completed":    row["completed"],
            "overflow_count": row["overflow_count"],
            "last_updated": row["last_updated"].isoformat() if row["last_updated"] else None,
        })

    return jsonify(result), 200


@analytics_bp.route("/ward/<ward_id>", methods=["GET"])
@require_auth
def ward_detail(ward_id):
    """Detail panel for a clicked ward on the heatmap."""
    oid   = ObjectId(ward_id)
    ward  = mongo.db.wards.find_one({"_id": oid})
    if not ward:
        return jsonify({"error": "Ward not found"}), 404

    total_bins = mongo.db.public_bins.count_documents({"ward_id": oid})
    agg = list(mongo.db.collections.aggregate([
        {"$match": {"ward_id": oid}},
        {"$group": {
            "_id":            None,
            "total_waste":    {"$sum": "$waste_kg"},
            "completed":      {"$sum": {"$cond": [{"$eq": ["$status", "completed"]}, 1, 0]}},
            "overflow_count": {"$sum": {"$cond": [{"$eq": ["$status", "overflow"]},  1, 0]}},
            "last_updated":   {"$max": "$timestamp"},
        }}
    ]))
    stats = agg[0] if agg else {}

    # Assigned collectors
    collectors = list(mongo.db.users.find(
        {"ward_ids": oid, "role": "collector", "status": "active"},
        {"full_name": 1, "username": 1}
    ))
    from ...utils.serializers import serialize_list
    return jsonify({
        "ward_id":      str(ward["_id"]),
        "ward_name":    ward["name"],
        "ward_type":    ward.get("type"),
        "total_bins":   total_bins,
        "total_waste":  round(stats.get("total_waste", 0), 1),
        "completed":    stats.get("completed", 0),
        "overflow_count": stats.get("overflow_count", 0),
        "last_updated": stats.get("last_updated").isoformat() if stats.get("last_updated") else None,
        "collectors":   serialize_list(collectors),
    }), 200


@analytics_bp.route("/trends", methods=["GET"])
@require_auth
def trends():
    """Weekly and monthly aggregation for trend charts."""
    match = _scope()
    # Weekly (last 12 weeks)
    weekly = list(mongo.db.collections.aggregate([
        {"$match": match},
        {"$group": {
            "_id":   {"$dateToString": {"format": "%Y-W%V", "date": "$date"}},
            "total": {"$sum": "$waste_kg"},
        }},
        {"$sort": {"_id": -1}},
        {"$limit": 12},
    ]))
    # Monthly (last 12 months)
    monthly = list(mongo.db.collections.aggregate([
        {"$match": match},
        {"$group": {
            "_id":   {"$dateToString": {"format": "%Y-%m", "date": "$date"}},
            "total": {"$sum": "$waste_kg"},
        }},
        {"$sort": {"_id": -1}},
        {"$limit": 12},
    ]))
    return jsonify({"weekly": weekly[::-1], "monthly": monthly[::-1]}), 200
