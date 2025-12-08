"""
Backfill created_by field for existing orders.
Sets created_by = merchandiser for all orders where created_by is NULL.
"""
import os
import sys
import django

# Setup Django
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.orders.models import Order

def backfill_created_by():
    # Find orders without created_by
    orders_to_update = Order.objects.filter(created_by__isnull=True)
    count = orders_to_update.count()
    
    print(f"Found {count} orders without created_by")
    
    if count == 0:
        print("Nothing to update.")
        return
    
    # Update each order's created_by to match merchandiser
    updated = 0
    for order in orders_to_update:
        if order.merchandiser:
            order.created_by = order.merchandiser
            order.save(update_fields=['created_by'])
            updated += 1
            print(f"  Updated order {order.order_number}: created_by = {order.merchandiser.full_name}")
        else:
            print(f"  Skipped order {order.order_number}: no merchandiser assigned")
    
    print(f"\nBackfill complete. Updated {updated} orders.")

if __name__ == '__main__':
    backfill_created_by()
