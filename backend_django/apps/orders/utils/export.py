from typing import Iterable

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
        worksheet.append([
            getattr(order, "order_number", "") or "",
            getattr(order, "customer_name", "") or "",
            getattr(order, "style_number", "") or "",
            getattr(order, "current_stage", "") or "",
            getattr(order, "quantity", None),
            getattr(order, "etd", None),
            getattr(order, "created_at", None),
        ])

    return workbook
