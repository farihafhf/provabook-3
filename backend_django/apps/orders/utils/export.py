from typing import Iterable
from datetime import datetime

from openpyxl import Workbook
from openpyxl.styles import Font


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
