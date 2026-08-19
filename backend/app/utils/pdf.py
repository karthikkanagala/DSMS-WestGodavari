"""
PDF Export Utility (ReportLab)
-------------------------------
build_pdf_response(title, headers, rows, filename) → Flask Response
"""
import io
from flask import Response
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib import colors
from reportlab.lib.units import cm
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER
from datetime import datetime


PRIMARY   = colors.HexColor("#2563eb")
HEADER_BG = colors.HexColor("#1e3a5f")
ALT_ROW   = colors.HexColor("#f0f4ff")
WHITE     = colors.white
DARK_TEXT = colors.HexColor("#1e293b")


def build_pdf_response(
    title:    str,
    headers:  list[str],
    rows:     list[list],
    filename: str = "report.pdf",
    landscape_mode: bool = False,
) -> Response:
    """
    Build a PDF from tabular data and return it as a streaming Flask response.

    :param title:    Report title shown at top
    :param headers:  Column header labels
    :param rows:     List of row lists (each inner list matches headers length)
    :param filename: Download filename
    :param landscape_mode: Use landscape A4 for wide tables
    """
    page_size = landscape(A4) if landscape_mode else A4
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=page_size,
        rightMargin=1.5 * cm,
        leftMargin=1.5 * cm,
        topMargin=2 * cm,
        bottomMargin=2 * cm,
    )

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        "Title",
        parent=styles["Title"],
        textColor=PRIMARY,
        fontSize=16,
        alignment=TA_CENTER,
        spaceAfter=6,
    )
    sub_style = ParagraphStyle(
        "Sub",
        parent=styles["Normal"],
        textColor=colors.grey,
        fontSize=9,
        alignment=TA_CENTER,
        spaceAfter=12,
    )

    elements = [
        Paragraph("DSMS — District Sanitation Monitoring System", title_style),
        Paragraph(title, styles["Heading2"]),
        Paragraph(f"Generated: {datetime.now().strftime('%d %b %Y  %H:%M')}", sub_style),
        Spacer(1, 0.3 * cm),
    ]

    # Build table data: header row + data rows
    table_data = [headers] + [[str(cell) if cell is not None else "" for cell in row] for row in rows]

    col_count   = len(headers)
    page_width  = (page_size[0] - 3 * cm)  # subtract margins
    col_width   = page_width / col_count

    table = Table(table_data, colWidths=[col_width] * col_count, repeatRows=1)
    table.setStyle(TableStyle([
        # Header row
        ("BACKGROUND",   (0, 0), (-1, 0), HEADER_BG),
        ("TEXTCOLOR",    (0, 0), (-1, 0), WHITE),
        ("FONTNAME",     (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE",     (0, 0), (-1, 0), 9),
        ("ALIGN",        (0, 0), (-1, 0), "CENTER"),
        ("BOTTOMPADDING",(0, 0), (-1, 0), 8),
        ("TOPPADDING",   (0, 0), (-1, 0), 8),
        # Data rows
        ("FONTNAME",     (0, 1), (-1, -1), "Helvetica"),
        ("FONTSIZE",     (0, 1), (-1, -1), 8),
        ("TEXTCOLOR",    (0, 1), (-1, -1), DARK_TEXT),
        ("ROWBACKGROUNDS",(0, 1), (-1, -1), [WHITE, ALT_ROW]),
        ("ALIGN",        (0, 1), (-1, -1), "CENTER"),
        ("BOTTOMPADDING",(0, 1), (-1, -1), 6),
        ("TOPPADDING",   (0, 1), (-1, -1), 6),
        # Grid
        ("GRID",         (0, 0), (-1, -1), 0.5, colors.HexColor("#d1d5db")),
        ("BOX",          (0, 0), (-1, -1), 1, PRIMARY),
    ]))
    elements.append(table)

    doc.build(elements)
    buffer.seek(0)

    return Response(
        buffer.getvalue(),
        mimetype="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )
