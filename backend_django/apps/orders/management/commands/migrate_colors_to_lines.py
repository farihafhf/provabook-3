"""
Management command to migrate OrderColor records to OrderLine records
This is needed for existing orders that have colors but no lines yet.
"""
from django.core.management.base import BaseCommand
from apps.orders.models_style_color import OrderStyle, OrderColor
from apps.orders.models_order_line import OrderLine


class Command(BaseCommand):
    help = 'Migrate OrderColor records to OrderLine records for backward compatibility'

    def handle(self, *args, **kwargs):
        self.stdout.write('Starting migration of OrderColor to OrderLine...')
        
        created_count = 0
        skipped_count = 0
        
        # Get all styles
        styles = OrderStyle.objects.prefetch_related('colors', 'lines').all()
        
        for style in styles:
            # Skip if this style already has lines
            if style.lines.exists():
                self.stdout.write(f'  Style {style.style_number} already has lines, skipping...')
                skipped_count += style.colors.count()
                continue
            
            # Create OrderLine for each OrderColor
            for color in style.colors.all():
                line = OrderLine.objects.create(
                    style=style,
                    color_code=color.color_code,
                    color_name=color.color_name,
                    cad_code=None,  # Colors don't have CAD
                    cad_name=None,
                    quantity=color.quantity,
                    unit=color.unit,
                    mill_name=color.mill_name,
                    mill_price=color.mill_price,
                    prova_price=color.prova_price,
                    commission=None,  # Not in old model
                    currency=color.currency,
                    etd=color.etd,
                    eta=color.eta,
                    submission_date=color.submission_date,
                    approval_date=color.approval_date,
                    approval_status=color.approval_status or {},
                    notes=color.notes,
                )
                created_count += 1
                self.stdout.write(f'  Created line for {style.style_number} - {color.color_code}')
        
        self.stdout.write(self.style.SUCCESS(
            f'\nMigration complete! Created {created_count} OrderLine records. Skipped {skipped_count} existing records.'
        ))
