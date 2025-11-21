from typing import Iterable
from datetime import datetime

from openpyxl import Workbook
from openpyxl.styles import Font
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas


def generate_orders_excel(queryset: Iterable) -> Workbook:
    """Generate an Excel workbook for the given orders queryset."""
    workbook = Workbook()
    worksheet = workbook.active
    worksheet.title = "Orders"

    # Header row
    headers = [
        "Order ID",
        "Customer",
        "Style",
        "Stage",
        "Quantity",
        "ETD",
        "Created At",
    ]
    worksheet.append(headers)

    # Make header row bold
    for cell in worksheet[1]:
        cell.font = Font(bold=True)

    # Data rows
    for order in queryset:
        created_at = getattr(order, "created_at", None)
        if isinstance(created_at, datetime) and created_at.tzinfo is not None:
            # Excel does not support timezone-aware datetimes
            created_at = created_at.replace(tzinfo=None)

        worksheet.append([
            getattr(order, "order_number", "") or "",
            getattr(order, "customer_name", "") or "",
            getattr(order, "style_number", "") or "",
            getattr(order, "current_stage", "") or "",
            getattr(order, "quantity", None),
            getattr(order, "etd", None),
            created_at,
        ])

    return workbook


def generate_purchase_order_pdf(order, buffer):
    pdf = canvas.Canvas(buffer, pagesize=A4)
    width, height = A4
    margin = 25 * mm
    y = height - margin

    pdf.setFont("Helvetica-Bold", 14)
    pdf.drawString(margin, y, "Provabook ERP")
    pdf.setFont("Helvetica", 10)
    pdf.drawString(margin, y - 14, "Company Name / Logo")

    pdf.setFont("Helvetica-Bold", 20)
    pdf.drawCentredString(width / 2, y - 40, "PURCHASE ORDER")

    details_y = y - 80
    line_height = 14

    def draw_label_value(label, value, x_label, x_value, y_pos):
        pdf.setFont("Helvetica-Bold", 10)
        pdf.drawString(x_label, y_pos, f"{label}:")
        pdf.setFont("Helvetica", 10)
        pdf.drawString(x_value, y_pos, value if value is not None else "-")

    right_x_label = width - margin - 130
    right_x_value = width - margin - 60

    order_identifier = getattr(order, "order_number", None) or str(getattr(order, "id", ""))
    draw_label_value("Order ID", order_identifier, right_x_label, right_x_value, details_y)
    draw_label_value("Customer", getattr(order, "customer_name", None), right_x_label, right_x_value, details_y - line_height)
    draw_label_value("Style No.", getattr(order, "style_number", None), right_x_label, right_x_value, details_y - 2 * line_height)

    etd_value = getattr(order, "etd", None)
    etd_str = etd_value.strftime("%Y-%m-%d") if etd_value else None
    draw_label_value("ETD", etd_str, right_x_label, right_x_value, details_y - 3 * line_height)

    table_top = details_y - 60
    row_height = 18
    col_x = [margin, margin + 200, margin + 300, width - margin]

    pdf.setFillColorRGB(0.95, 0.95, 0.95)
    pdf.rect(col_x[0], table_top - row_height, col_x[-1] - col_x[0], row_height, stroke=0, fill=1)

    pdf.setFillColorRGB(0, 0, 0)
    pdf.setFont("Helvetica-Bold", 10)
    header_y = table_top - row_height + 5
    pdf.drawString(col_x[0] + 4, header_y, "Item")
    pdf.drawString(col_x[1] + 4, header_y, "Quantity")
    pdf.drawString(col_x[2] + 4, header_y, "Unit Price")
    pdf.drawString(col_x[3] - 70, header_y, "Total")

    data_y = table_top - 2 * row_height + 4
    pdf.setFont("Helvetica", 10)

    description = "Fabric order"
    style_number = getattr(order, "style_number", None)
    if style_number:
        description = f"Fabric order {style_number}"

    quantity_value = getattr(order, "quantity", None)
    unit_value = getattr(order, "unit", "")
    quantity_text = f"{quantity_value} {unit_value}".strip() if quantity_value is not None else ""

    currency = getattr(order, "currency", "")
    prova_price = getattr(order, "prova_price", None)
    mill_price = getattr(order, "mill_price", None)
    unit_price_value = prova_price if prova_price is not None else mill_price
    unit_price_text = f"{unit_price_value} {currency}".strip() if unit_price_value is not None else ""

    total_text = ""
    if unit_price_value is not None and quantity_value is not None:
        try:
            total_value = float(unit_price_value) * float(quantity_value)
            total_text = f"{total_value:.2f} {currency}".strip()
        except (TypeError, ValueError):
            total_text = ""

    pdf.drawString(col_x[0] + 4, data_y, description)
    if quantity_text:
        pdf.drawString(col_x[1] + 4, data_y, quantity_text)
    if unit_price_text:
        pdf.drawString(col_x[2] + 4, data_y, unit_price_text)
    if total_text:
        pdf.drawString(col_x[3] - 70, data_y, total_text)

    for x in col_x:
        pdf.line(x, table_top, x, table_top - 3 * row_height)

    pdf.line(col_x[0], table_top, col_x[-1], table_top)
    pdf.line(col_x[0], table_top - row_height, col_x[-1], table_top - row_height)
    pdf.line(col_x[0], table_top - 2 * row_height, col_x[-1], table_top - 2 * row_height)
    pdf.line(col_x[0], table_top - 3 * row_height, col_x[-1], table_top - 3 * row_height)

    footer_y = margin / 2
    pdf.setFont("Helvetica-Oblique", 9)
    pdf.drawCentredString(width / 2, footer_y, "Generated by Provabook")

    pdf.showPage()
    pdf.save()
