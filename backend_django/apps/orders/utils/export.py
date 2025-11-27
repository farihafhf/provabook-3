from typing import Iterable
from datetime import datetime
import pytz

from openpyxl import Workbook
from openpyxl.styles import Font, Alignment
from openpyxl.utils import get_column_letter
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas

APPROVAL_HEADER_LABELS = {
    'aop': 'AOP Approval Date',
    'handloom': 'Handloom Approval Date',
    'labDip': 'Lab Dip Approval Date',
    'ppSample': 'PP Sample Approval Date',
    'price': 'Price Approval Date',
}


def generate_orders_excel(queryset: Iterable, filters: dict = None) -> tuple:
    """
    Generate an Excel workbook for the given orders queryset.
    Returns (workbook, filename) tuple.
    
    Args:
        queryset: QuerySet of Order objects
        filters: Dictionary of applied filters for filename generation
    """
    from apps.orders.models_style_color import OrderStyle
    from apps.orders.models_order_line import OrderLine
    from apps.orders.models_supplier_delivery import SupplierDelivery
    from apps.orders.models_document import Document
    from apps.orders.models import ApprovalHistory
    
    workbook = Workbook()
    worksheet = workbook.active
    worksheet.title = "Orders Export"
    
    # Get unique approval types across all orders for dynamic columns
    approval_types = set()
    for order in queryset:
        if order.approval_status:
            approval_types.update(order.approval_status.keys())
        # Also check approval history for all approval types
        for history in ApprovalHistory.objects.filter(order=order):
            approval_types.add(history.approval_type)
    
    # Sort approval types for consistent column order
    approval_types = sorted(list(approval_types))

    # Filter out approval types that should not appear as columns
    visible_approval_types = [
        t for t in approval_types
        if t not in {"bulkSwatch", "qualityTest", "strikeOff"}
    ]
    
    # Build header row
    headers = [
        "Order No.",
        "Style Number",
        "Color Code",
        "CAD Name",
        "Description",
        "Buyer",
        "Assigned To",
        "Quantity Expected",
        "Unit",
        "Mill Price",
        "LC Open Price",
        "Profit per Unit",
        "ETD Date",
        "ETA Date",
        "ETD Quantity",
        "Delivery Excess/Shortage",
    ]
    
    # Add dynamic approval stage columns
    for approval_type in visible_approval_types:
        header_label = APPROVAL_HEADER_LABELS.get(
            approval_type,
            f"approval_stage_{approval_type}_date",
        )
        headers.append(header_label)
    
    headers.extend([
        "Order Status",
        "Bulk Start Date",
        "Latest PI Sent Date",
        "LC Received Date",
        "Total Commission",
        "Adjusted Profit",
        "Reduced Profit",
        "Supplier Delivery History",
    ])
    
    worksheet.append(headers)
    
    # Format header row
    for cell in worksheet[1]:
        cell.font = Font(bold=True)
        cell.alignment = Alignment(horizontal='center', vertical='center', wrap_text=True)
    
    # Freeze header row
    worksheet.freeze_panes = 'A2'
    
    # Process each order
    dhaka_tz = pytz.timezone('Asia/Dhaka')
    
    for order in queryset:
        # Get all styles for this order
        styles = OrderStyle.objects.filter(order=order).prefetch_related('lines')
        
        if not styles.exists():
            # No styles - export order-level data only
            row_data = _build_order_row(
                order, None, None, visible_approval_types, dhaka_tz
            )
            worksheet.append(row_data)
        else:
            # Export each order line
            for style in styles:
                lines = style.lines.all()
                
                if not lines.exists():
                    # Style has no lines - export style-level data
                    row_data = _build_order_row(
                        order, style, None, visible_approval_types, dhaka_tz
                    )
                    worksheet.append(row_data)
                else:
                    # Export each line
                    for line in lines:
                        row_data = _build_order_row(
                            order, style, line, visible_approval_types, dhaka_tz
                        )
                        worksheet.append(row_data)
    
    # Auto-size columns
    for idx, column in enumerate(worksheet.columns, start=1):
        max_length = 0
        column_letter = get_column_letter(idx)
        
        for cell in column:
            try:
                if cell.value:
                    max_length = max(max_length, len(str(cell.value)))
            except:
                pass
        
        adjusted_width = min(max_length + 2, 50)
        worksheet.column_dimensions[column_letter].width = adjusted_width
    
    # Generate filename
    filename = _generate_filename(filters, dhaka_tz)
    
    return workbook, filename


def _build_order_row(order, style, line, approval_types, dhaka_tz):
    """Build a single row of data for Excel export."""
    from apps.orders.models_supplier_delivery import SupplierDelivery
    from apps.orders.models_document import Document
    from apps.orders.models import ApprovalHistory
    
    # Helper function to format datetime
    def format_datetime(dt):
        if dt is None:
            return ""
        if isinstance(dt, datetime):
            if dt.tzinfo is None:
                dt = pytz.utc.localize(dt)
            dt = dt.astimezone(dhaka_tz)
            return dt.strftime("%Y-%m-%d %I:%M %p")
        else:
            # Date only
            return dt.strftime("%Y-%m-%d")
    
    # Determine data source (line > style > order)
    data_source = line if line else (style if style else order)
    
    # ID
    id_value = order.order_number
    
    # Order No.
    order_no = order.order_number
    
    # Style Number
    style_number = style.style_number if style else (order.style_number or "")
    
    # Color
    color = ""
    if line and line.color_code:
        color = f"{line.color_code}"
        if line.color_name:
            color += f" ({line.color_name})"
    
    # CAD
    cad = ""
    if line and line.cad_code:
        cad = f"{line.cad_code}"
        if line.cad_name:
            cad += f" ({line.cad_name})"
    elif order.cad:
        cad = order.cad
    
    # Description
    description_parts = []
    fabric_type = getattr(style, 'fabric_type', None) or order.fabric_type
    if fabric_type:
        description_parts.append(f"**Fabric Type** {fabric_type}")
    
    composition = getattr(style, 'fabric_composition', None) or order.fabric_composition
    if composition:
        description_parts.append(f"Composition: {composition}")
    
    gsm = getattr(style, 'gsm', None) or order.gsm
    if gsm:
        description_parts.append(f"GSM: {gsm}")
    
    finish_type = getattr(style, 'finish_type', None) or order.finish_type
    if finish_type:
        description_parts.append(f"Finish Type: {finish_type}")
    
    construction = getattr(style, 'construction', None) or order.construction
    if construction:
        description_parts.append(f"Construction: {construction}")
    
    description = "\n".join(description_parts)
    
    # Buyer
    buyer = order.buyer_name or order.customer_name
    
    # Supplier
    supplier = getattr(data_source, 'mill_name', None) or order.mill_name or ""
    
    # Assigned To
    assigned_to = order.merchandiser.full_name if order.merchandiser else ""
    
    # Quantity Expected
    quantity_expected = float(data_source.quantity) if hasattr(data_source, 'quantity') else 0
    
    # Unit
    unit = getattr(data_source, 'unit', 'meters')
    
    # Mill Price
    mill_price = float(data_source.mill_price) if hasattr(data_source, 'mill_price') and data_source.mill_price else 0
    
    # LC Open Price (Prova Price)
    lc_open_price = float(data_source.prova_price) if hasattr(data_source, 'prova_price') and data_source.prova_price else 0
    
    # Profit per Unit
    profit_per_unit = lc_open_price - mill_price
    
    # Original Profit
    original_profit = profit_per_unit * quantity_expected
    
    # ETD Date
    etd_date = format_datetime(getattr(data_source, 'etd', None) or order.etd)
    
    # ETA Date
    eta_date = format_datetime(getattr(data_source, 'eta', None) or order.eta)
    
    # ETD Quantity & ETD Total Quantity
    # Get deliveries for this order
    deliveries = SupplierDelivery.objects.filter(order=order)
    if style:
        deliveries = deliveries.filter(style=style)
    
    etd_quantity = sum(float(d.delivered_quantity) for d in deliveries)
    etd_total_quantity = float(order.total_delivered_quantity)
    
    # Delivery Excess/Shortage
    delivery_excess_shortage = etd_quantity - quantity_expected
    
    # Approval stage dates (dynamic columns)
    approval_dates = []
    for approval_type in approval_types:
        # Get the latest approved date for this approval type
        approval_date = ""
        
        # Check line-level approval history first
        if line:
            history = ApprovalHistory.objects.filter(
                order=order,
                order_line=line,
                approval_type=approval_type,
                status='approved'
            ).order_by('-created_at').first()
            
            if history:
                approval_date = format_datetime(history.created_at)
        
        # Fallback to order-level approval history
        if not approval_date:
            history = ApprovalHistory.objects.filter(
                order=order,
                order_line__isnull=True,
                approval_type=approval_type,
                status='approved'
            ).order_by('-created_at').first()
            
            if history:
                approval_date = format_datetime(history.created_at)
        
        approval_dates.append(approval_date)
    
    # Order Status (use order-level status)
    order_status = order.get_status_display()
    
    # Bulk Start Date
    bulk_start_date = ""
    if order.status == 'bulk':
        # Try to find when status changed to bulk
        # This would require status change tracking - for now use updated_at
        bulk_start_date = format_datetime(order.updated_at)
    
    # Latest PI Sent Date
    pi_sent_date = ""
    pi_docs = Document.objects.filter(order=order, category='pi').order_by('-created_at').first()
    if pi_docs:
        pi_sent_date = format_datetime(pi_docs.created_at)
    
    # LC Received Date
    lc_received_date = ""
    lc_docs = Document.objects.filter(order=order, category='lc').order_by('-created_at').first()
    if lc_docs:
        lc_received_date = format_datetime(lc_docs.created_at)
    
    # Total Commission
    commission = getattr(data_source, 'commission', None)
    total_commission = float(commission) * quantity_expected if commission else 0
    
    # Adjusted Profit (based on delivered quantity)
    if etd_total_quantity > 0:
        delivery_ratio = min(1.0, etd_total_quantity / float(order.quantity))
    else:
        delivery_ratio = 0.0
    adjusted_profit = original_profit * delivery_ratio
    
    # Reduced Profit
    reduced_profit = adjusted_profit - original_profit
    
    # Supplier Delivery History
    delivery_history_parts = []
    for delivery in deliveries.order_by('delivery_date'):
        delivery_history_parts.append(
            f"{delivery.delivery_date.strftime('%Y-%m-%d')}:{delivery.delivered_quantity}"
        )
    supplier_delivery_history = "; ".join(delivery_history_parts)
    
    # Build row
    row = [
        order_no,
        style_number,
        color,
        cad,
        description,
        buyer,
        assigned_to,
        quantity_expected,
        unit,
        mill_price,
        lc_open_price,
        profit_per_unit,
        etd_date,
        eta_date,
        etd_quantity,
        delivery_excess_shortage,
    ]
    
    # Add approval dates
    row.extend(approval_dates)
    
    # Add remaining columns
    row.extend([
        order_status,
        bulk_start_date,
        pi_sent_date,
        lc_received_date,
        total_commission,
        adjusted_profit,
        reduced_profit,
        supplier_delivery_history,
    ])
    
    return row


def _generate_filename(filters, dhaka_tz):
    """Generate filename based on filters and current timestamp."""
    # Build filter description
    filter_parts = []
    
    if filters:
        if filters.get('status'):
            filter_parts.append(filters['status'])
        if filters.get('category'):
            filter_parts.append(filters['category'])
        if filters.get('merchandiser'):
            filter_parts.append('merchandiser')
        if filters.get('search'):
            filter_parts.append('search')
    
    filter_desc = "_".join(filter_parts) if filter_parts else "all"
    
    # Get current timestamp in Asia/Dhaka timezone
    now = datetime.now(dhaka_tz)
    date_str = now.strftime("%Y%m%d")
    time_str = now.strftime("%I%M%p")
    
    filename = f"prova_orders_export_{filter_desc}_{date_str}_{time_str}.xlsx"
    
    return filename


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
