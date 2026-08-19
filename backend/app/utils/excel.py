"""
Excel Import / Export Utilities
--------------------------------
Uses pandas + openpyxl.

Import helpers:
  parse_excel(file_storage, required_cols) → (rows: list[dict], errors: list[str])

Export helpers:
  build_excel_response(rows, columns, sheet_name, filename) → Flask Response
"""
import io
from flask import Response
import pandas as pd


# ──────────────────────────────────────────────
# IMPORT
# ──────────────────────────────────────────────

def parse_excel(file_storage, required_cols: list[str]) -> tuple[list[dict], list[str]]:
    """
    Read an uploaded .xlsx file, validate required columns, and return
    (rows, errors). If any validation fails, rows is empty.
    """
    errors = []
    try:
        df = pd.read_excel(file_storage, engine="openpyxl", dtype=str)
    except Exception as e:
        return [], [f"Could not read Excel file: {e}"]

    # Normalise column names: strip whitespace, lowercase
    df.columns = [c.strip().lower().replace(" ", "_") for c in df.columns]
    required_norm = [c.strip().lower().replace(" ", "_") for c in required_cols]

    missing_cols = [c for c in required_norm if c not in df.columns]
    if missing_cols:
        return [], [f"Missing columns: {', '.join(missing_cols)}"]

    rows = df.where(df.notna(), None).to_dict(orient="records")
    return rows, errors


# ──────────────────────────────────────────────
# EXPORT
# ──────────────────────────────────────────────

def build_excel_response(
    rows: list[dict],
    columns: list[str],
    sheet_name: str = "Report",
    filename: str = "export.xlsx",
) -> Response:
    """
    Build a streaming Excel response from a list of row dicts.
    Only the specified columns are included, in order.
    """
    df = pd.DataFrame(rows, columns=columns)
    output = io.BytesIO()
    with pd.ExcelWriter(output, engine="openpyxl") as writer:
        df.to_excel(writer, sheet_name=sheet_name, index=False)
    output.seek(0)
    return Response(
        output.getvalue(),
        mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )
