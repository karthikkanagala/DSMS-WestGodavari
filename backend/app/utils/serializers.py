"""
Serialisation Helpers
---------------------
Convert MongoDB documents to JSON-safe dicts.
"""
from bson import ObjectId
from datetime import datetime


def serialize_doc(doc: dict) -> dict:
    """Recursively convert ObjectId and datetime to strings."""
    if doc is None:
        return None
    result = {}
    for key, value in doc.items():
        if isinstance(value, ObjectId):
            result[key] = str(value)
        elif isinstance(value, datetime):
            result[key] = value.isoformat()
        elif isinstance(value, list):
            result[key] = [serialize_doc(v) if isinstance(v, dict) else
                           str(v) if isinstance(v, ObjectId) else v for v in value]
        elif isinstance(value, dict):
            result[key] = serialize_doc(value)
        else:
            result[key] = value
    return result


def serialize_list(docs: list) -> list:
    return [serialize_doc(d) for d in docs]
