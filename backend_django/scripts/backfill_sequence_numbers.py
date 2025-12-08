"""
Backfill sequence numbers for existing OrderStyle and OrderLine records
based on their created_at timestamps.
"""
import os
import sys
import django

# Setup Django
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.orders.models import Order
from apps.orders.models_style_color import OrderStyle
from apps.orders.models_order_line import OrderLine


def backfill_sequence_numbers():
    """Update sequence numbers for all existing styles and lines"""
    
    orders = Order.objects.all()
    print(f"Processing {orders.count()} orders...")
    
    for order in orders:
        # Update style sequence numbers
        seq = 1
        for style in OrderStyle.objects.filter(order=order).order_by('created_at'):
            if style.sequence_number != seq:
                style.sequence_number = seq
                style.save(update_fields=['sequence_number'])
            seq += 1
        
        # Update line sequence numbers (order-wide)
        seq = 1
        for line in OrderLine.objects.filter(style__order=order).order_by('created_at'):
            if line.sequence_number != seq:
                line.sequence_number = seq
                line.save(update_fields=['sequence_number'])
            seq += 1
    
    print("Done! Sequence numbers updated for all styles and lines.")


if __name__ == '__main__':
    backfill_sequence_numbers()
