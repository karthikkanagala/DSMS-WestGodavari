"""
Reports blueprint
-----------------
7 report types: daily, weekly, monthly, ward, mandal, collector, overflow
Each can export to Excel or PDF.
"""
from flask import Blueprint, request, jsonify, g
from bson import ObjectId
from datetime import datetime, timezone, timedelta

from ...extensions import mongo
from ...middleware.rbac import require_auth
from ...utils.serializers import serialize_list
from ...utils.excel import build_excel_response
from ...utils.pdf import build_pdf_response

reports_bp = Blueprint("reports", __name__)


def _parse_date_range(args):
    """Parse date_from / date_to query params; default to last 30 days."""
    today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    try:
        date_from = datetime.strptime(args.get("date_from", ""), "%Y-%m-%d").replace(tzinfo=timezone.utc)
    except ValueError:
        date_from = today - timedelta(days=29)
    try:
        date_to = datetime.strptime(args.get("date_to", ""), "%Y-%m-%d").replace(tzinfo=timezone.utc) + timedelta(days=1)
    except ValueError:
        date_to = today + timedelta(days=1)
    return date_from, date_to


def _base_match(args):
    """Build a base match from query args."""
    match = {}
    if args.get("district_id"): match["district_id"] = ObjectId(args["district_id"])
    if args.get("mandal_id"):   match["mandal_id"]   = ObjectId(args["mandal_id"])
    if args.get("ward_id"):     match["ward_id"]      = ObjectId(args["ward_id"])
    date_from, date_to = _parse_date_range(args)
    match["date"] = {"$gte": date_from, "$lt": date_to}
    return match


# ──────────────────────────────────────────────
# REPORT DATA FETCHERS
# ──────────────────────────────────────────────

def _daily_data(args):
    match = _base_match(args)
    docs  = list(mongo.db.collections.find(match).sort("timestamp", -1).limit(1000))
    rows  = []
    for d in docs:
        rows.append([
            d.get("bin_ref", ""),
            d.get("collector_name", ""),
            round(d.get("waste_kg", 0), 1),
            round(d.get("fill_level", 0), 1),
            d.get("status", ""),
            d.get("remarks", ""),
            d.get("timestamp").strftime("%Y-%m-%d %H:%M") if d.get("timestamp") else "",
        ])
    return ["Bin ID", "Collector", "Waste (kg)", "Fill (%)", "Status", "Remarks", "Timestamp"], rows, "Daily Collection Report"


def _weekly_data(args):
    match = _base_match(args)
    agg   = list(mongo.db.collections.aggregate([
        {"$match": match},
        {"$group": {
            "_id":      {"$dateToString": {"format": "%Y-W%V", "date": "$date"}},
            "total_kg": {"$sum": "$waste_kg"},
            "count":    {"$sum": 1},
            "overflow": {"$sum": {"$cond": [{"$eq": ["$status", "overflow"]}, 1, 0]}},
        }},
        {"$sort": {"_id": 1}},
    ]))
    rows  = [[r["_id"], round(r["total_kg"], 1), r["count"], r["overflow"]] for r in agg]
    return ["Week", "Total Waste (kg)", "Collections", "Overflows"], rows, "Weekly Report"


def _monthly_data(args):
    match = _base_match(args)
    agg   = list(mongo.db.collections.aggregate([
        {"$match": match},
        {"$group": {
            "_id":      {"$dateToString": {"format": "%Y-%m", "date": "$date"}},
            "total_kg": {"$sum": "$waste_kg"},
            "count":    {"$sum": 1},
            "overflow": {"$sum": {"$cond": [{"$eq": ["$status", "overflow"]}, 1, 0]}},
        }},
        {"$sort": {"_id": 1}},
    ]))
    rows = [[r["_id"], round(r["total_kg"], 1), r["count"], r["overflow"]] for r in agg]
    return ["Month", "Total Waste (kg)", "Collections", "Overflows"], rows, "Monthly Report"


def _ward_data(args):
    match = _base_match(args)
    agg   = list(mongo.db.collections.aggregate([
        {"$match": match},
        {"$group": {
            "_id":      "$ward_id",
            "total_kg": {"$sum": "$waste_kg"},
            "count":    {"$sum": 1},
            "overflow": {"$sum": {"$cond": [{"$eq": ["$status", "overflow"]}, 1, 0]}},
        }},
    ]))
    ward_ids = [r["_id"] for r in agg if r["_id"]]
    wards    = {w["_id"]: w["name"] for w in mongo.db.wards.find({"_id": {"$in": ward_ids}})}
    rows     = [[wards.get(r["_id"], "?"), round(r["total_kg"], 1), r["count"], r["overflow"]] for r in agg]
    return ["Ward", "Total Waste (kg)", "Collections", "Overflows"], rows, "Ward-wise Report"


def _mandal_data(args):
    match = _base_match(args)
    agg   = list(mongo.db.collections.aggregate([
        {"$match": match},
        {"$group": {
            "_id":      "$mandal_id",
            "total_kg": {"$sum": "$waste_kg"},
            "count":    {"$sum": 1},
            "overflow": {"$sum": {"$cond": [{"$eq": ["$status", "overflow"]}, 1, 0]}},
        }},
    ]))
    mandal_ids = [r["_id"] for r in agg if r["_id"]]
    mandals    = {m["_id"]: m["name"] for m in mongo.db.mandals.find({"_id": {"$in": mandal_ids}})}
    rows       = [[mandals.get(r["_id"], "?"), round(r["total_kg"], 1), r["count"], r["overflow"]] for r in agg]
    return ["Mandal", "Total Waste (kg)", "Collections", "Overflows"], rows, "Mandal-wise Report"


def _collector_data(args):
    match = _base_match(args)
    agg   = list(mongo.db.collections.aggregate([
        {"$match": match},
        {"$group": {
            "_id":      "$collector_id",
            "name":     {"$first": "$collector_name"},
            "total_kg": {"$sum": "$waste_kg"},
            "count":    {"$sum": 1},
            "overflow": {"$sum": {"$cond": [{"$eq": ["$status", "overflow"]}, 1, 0]}},
        }},
        {"$sort": {"total_kg": -1}},
    ]))
    rows = [[r.get("name", "?"), round(r["total_kg"], 1), r["count"], r["overflow"]] for r in agg]
    return ["Collector", "Total Waste (kg)", "Collections", "Overflows"], rows, "Collector Performance Report"


def _overflow_data(args):
    match = {}
    if args.get("district_id"): match["district_id"] = ObjectId(args["district_id"])
    if args.get("mandal_id"):   match["mandal_id"]   = ObjectId(args["mandal_id"])
    date_from, date_to = _parse_date_range(args)
    match["detected_at"] = {"$gte": date_from, "$lt": date_to}
    docs = list(mongo.db.overflow_alerts.find(match).sort("detected_at", -1).limit(1000))
    ward_ids = list({d["ward_id"] for d in docs if d.get("ward_id")})
    wards    = {w["_id"]: w["name"] for w in mongo.db.wards.find({"_id": {"$in": ward_ids}})}
    rows     = [[
        d.get("bin_ref", ""),
        wards.get(d.get("ward_id"), "?"),
        d["detected_at"].strftime("%Y-%m-%d %H:%M") if d.get("detected_at") else "",
        d.get("status", ""),
        d["resolved_at"].strftime("%Y-%m-%d %H:%M") if d.get("resolved_at") else "",
    ] for d in docs]
    return ["Bin ID", "Ward", "Detected At", "Status", "Resolved At"], rows, "Overflow Report"


REPORT_MAP = {
    "daily":     _daily_data,
    "weekly":    _weekly_data,
    "monthly":   _monthly_data,
    "ward":      _ward_data,
    "mandal":    _mandal_data,
    "collector": _collector_data,
    "overflow":  _overflow_data,
}


# ──────────────────────────────────────────────
# ROUTES
# ──────────────────────────────────────────────

@reports_bp.route("/<report_type>", methods=["GET"])
@require_auth
def get_report(report_type):
    if report_type not in REPORT_MAP:
        return jsonify({"error": f"Unknown report type: {report_type}"}), 404
    headers, rows, title = REPORT_MAP[report_type](request.args)
    return jsonify({"title": title, "headers": headers, "rows": rows, "count": len(rows)}), 200


@reports_bp.route("/<report_type>/export/excel", methods=["GET"])
@require_auth
def export_excel(report_type):
    if report_type not in REPORT_MAP:
        return jsonify({"error": "Unknown report type"}), 404
    headers, rows, title = REPORT_MAP[report_type](request.args)
    return build_excel_response(
        rows=[dict(zip(headers, r)) for r in rows],
        columns=headers,
        sheet_name=title[:31],
        filename=f"dsms_{report_type}_report.xlsx",
    )


@reports_bp.route("/<report_type>/export/pdf", methods=["GET"])
@require_auth
def export_pdf(report_type):
    if report_type not in REPORT_MAP:
        return jsonify({"error": "Unknown report type"}), 404
    headers, rows, title = REPORT_MAP[report_type](request.args)
    landscape = len(headers) > 5
    return build_pdf_response(
        title=title,
        headers=headers,
        rows=rows,
        filename=f"dsms_{report_type}_report.pdf",
        landscape_mode=landscape,
    )
