"""
Backfill script to update OrderLine production dates based on existing ProductionEntry records.
Run with: python manage.py shell < scripts/backfill_production_dates.py
Or: python scripts/backfill_production_dates.py
"""
import os
import sys

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from decimal import Decimal
from django.db.models import Sum
from apps.orders.models_order_line import OrderLine
from apps.orders.models_production_entry import ProductionEntry, ProductionEntryType

print("\n" + "="*80)
print("BACKFILLING PRODUCTION DATES")
print("="*80)

# Get all order lines that have production entries
order_lines_with_entries = OrderLine.objects.filter(
    production_entries__isnull=False
).distinct()

print(f"\nFound {order_lines_with_entries.count()} order lines with production entries\n")

updated_count = 0

for order_line in order_lines_with_entries:
    print(f"Processing: {order_line.id} ({order_line.line_label})")
    
    # Get target quantity
    greige_qty = order_line.greige_quantity or Decimal('0')
    line_qty = order_line.quantity or Decimal('0')
    target_qty = Decimal(str(greige_qty)) if greige_qty > 0 else Decimal(str(line_qty))
    
    changes_made = False
    
    # Process KNITTING entries
    knitting_entries = ProductionEntry.objects.filter(
        order_line=order_line,
        entry_type=ProductionEntryType.KNITTING
    )
    
    if knitting_entries.exists():
        knitting_total = knitting_entries.aggregate(total=Sum('quantity'))['total'] or Decimal('0')
        knitting_total = Decimal(str(knitting_total))
        
        earliest_knitting = knitting_entries.order_by('entry_date').first()
        latest_knitting = knitting_entries.order_by('-entry_date').first()
        
        # Set start date
        if earliest_knitting and order_line.knitting_start_date != earliest_knitting.entry_date:
            order_line.knitting_start_date = earliest_knitting.entry_date
            changes_made = True
            print(f"  -> Set knitting_start_date = {earliest_knitting.entry_date}")
        
        # Set complete date if 100%
        is_knitting_complete = target_qty > 0 and knitting_total >= target_qty
        if is_knitting_complete and latest_knitting:
            if order_line.knitting_complete_date != latest_knitting.entry_date:
                order_line.knitting_complete_date = latest_knitting.entry_date
                changes_made = True
                print(f"  -> Set knitting_complete_date = {latest_knitting.entry_date} (100% complete: {knitting_total}/{target_qty})")
        elif not is_knitting_complete and order_line.knitting_complete_date is not None:
            # Clear if not complete (only if it was set by production entries, not manually)
            pass  # Don't clear - might have been set manually
    
    # Process DYEING entries
    dyeing_entries = ProductionEntry.objects.filter(
        order_line=order_line,
        entry_type=ProductionEntryType.DYEING
    )
    
    if dyeing_entries.exists():
        dyeing_total = dyeing_entries.aggregate(total=Sum('quantity'))['total'] or Decimal('0')
        dyeing_total = Decimal(str(dyeing_total))
        
        earliest_dyeing = dyeing_entries.order_by('entry_date').first()
        latest_dyeing = dyeing_entries.order_by('-entry_date').first()
        
        # Set start date
        if earliest_dyeing and order_line.dyeing_start_date != earliest_dyeing.entry_date:
            order_line.dyeing_start_date = earliest_dyeing.entry_date
            changes_made = True
            print(f"  -> Set dyeing_start_date = {earliest_dyeing.entry_date}")
        
        # Set complete date if 100%
        is_dyeing_complete = target_qty > 0 and dyeing_total >= target_qty
        if is_dyeing_complete and latest_dyeing:
            if order_line.dyeing_complete_date != latest_dyeing.entry_date:
                order_line.dyeing_complete_date = latest_dyeing.entry_date
                changes_made = True
                print(f"  -> Set dyeing_complete_date = {latest_dyeing.entry_date} (100% complete: {dyeing_total}/{target_qty})")
    
    if changes_made:
        order_line.save(update_fields=[
            'knitting_start_date', 'knitting_complete_date',
            'dyeing_start_date', 'dyeing_complete_date',
            'updated_at'
        ])
        updated_count += 1
        print(f"  SAVED!")
    else:
        print(f"  No changes needed")

print("\n" + "="*80)
print(f"BACKFILL COMPLETE: Updated {updated_count} order lines")
print("="*80 + "\n")
