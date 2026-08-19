"""
Backup / Restore blueprint (System Admin only)
----------------------------------------------
POST /api/backup/export  — dump all collections to JSON, returned as zip
POST /api/backup/import  — restore from uploaded zip
"""
import io, json, zipfile
from flask import Blueprint, request, jsonify, send_file
from datetime import datetime, timezone
from bson import ObjectId

from ...extensions import mongo
from ...middleware.rbac import require_auth, require_role, ROLE_SYSADMIN
from ...utils.audit import write_log

backup_bp = Blueprint("backup", __name__)

COLLECTIONS = ["districts", "mandals", "wards", "public_bins",
               "collections", "overflow_alerts", "users", "activity_logs"]


def _to_json_safe(docs: list) -> list:
    result = []
    for d in docs:
        row = {}
        for k, v in d.items():
            if isinstance(v, ObjectId):
                row[k] = {"$oid": str(v)}
            elif isinstance(v, datetime):
                row[k] = {"$date": v.isoformat()}
            elif isinstance(v, list):
                row[k] = [{"$oid": str(x)} if isinstance(x, ObjectId) else x for x in v]
            else:
                row[k] = v
        result.append(row)
    return result


@backup_bp.route("/export", methods=["POST"])
@require_auth
@require_role(ROLE_SYSADMIN)
def export_backup():
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        for col in COLLECTIONS:
            docs = list(mongo.db[col].find())
            data = _to_json_safe(docs)
            zf.writestr(f"{col}.json", json.dumps(data, ensure_ascii=False, indent=2))
    buf.seek(0)
    write_log("BACKUP_EXPORT", details={"collections": len(COLLECTIONS)})
    stamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    return send_file(buf, mimetype="application/zip",
                     as_attachment=True, download_name=f"dsms_backup_{stamp}.zip")


@backup_bp.route("/import", methods=["POST"])
@require_auth
@require_role(ROLE_SYSADMIN)
def import_backup():
    if "file" not in request.files:
        return jsonify({"error": "No file uploaded"}), 400
    file = request.files["file"]
    try:
        with zipfile.ZipFile(io.BytesIO(file.read())) as zf:
            names = zf.namelist()
            for col in COLLECTIONS:
                fname = f"{col}.json"
                if fname not in names:
                    continue
                docs = json.loads(zf.read(fname))
                # Convert $oid / $date back
                converted = []
                for d in docs:
                    row = {}
                    for k, v in d.items():
                        if isinstance(v, dict) and "$oid" in v:
                            row[k] = ObjectId(v["$oid"])
                        elif isinstance(v, dict) and "$date" in v:
                            row[k] = datetime.fromisoformat(v["$date"])
                        elif isinstance(v, list):
                            row[k] = [ObjectId(x["$oid"]) if isinstance(x, dict) and "$oid" in x else x for x in v]
                        else:
                            row[k] = v
                    converted.append(row)
                if converted:
                    mongo.db[col].drop()
                    mongo.db[col].insert_many(converted)
    except Exception as e:
        return jsonify({"error": f"Restore failed: {e}"}), 500

    write_log("BACKUP_IMPORT")
    return jsonify({"message": "Backup restored successfully"}), 200
