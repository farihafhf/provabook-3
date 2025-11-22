"""
Management command to seed database with demo data
Usage: python manage.py seed_data
"""
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from apps.orders.models import Order, OrderStatus, OrderCategory
from apps.samples.models import Sample
from apps.financials.models import ProformaInvoice, LetterOfCredit
from decimal import Decimal
from datetime import date, timedelta
from django.utils import timezone
from django.core.files.base import ContentFile
from django.conf import settings
import os

User = get_user_model()


class Command(BaseCommand):
    help = 'Seed database with demo users and sample orders'

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('=== Seeding database ==='))
        
        # Create demo users
        self.create_users()
        
        # Create sample orders
        self.create_orders()
        
        # Create related samples
        self.create_samples()

        # Create financial documents
        self.create_financials()
        
        self.stdout.write(self.style.SUCCESS('\n=== Database seeded successfully! ==='))
        self.stdout.write(self.style.SUCCESS('\nDemo Credentials:'))
        self.stdout.write(self.style.SUCCESS('   Admin: admin@provabook.com / Admin@123'))
        self.stdout.write(self.style.SUCCESS('   Merchandiser: merchandiser@provabook.com / Merchandiser@123'))
        self.stdout.write(self.style.SUCCESS('\nAccess Points:'))
        self.stdout.write(self.style.SUCCESS('   Admin Panel: http://localhost:8000/admin/'))
        self.stdout.write(self.style.SUCCESS('   API Docs: http://localhost:8000/api/docs/\n'))

    def create_users(self):
        """Create demo users"""
        self.stdout.write('Creating demo users...')
        
        # Create Admin user
        if not User.objects.filter(email='admin@provabook.com').exists():
            admin = User.objects.create_user(
                email='admin@provabook.com',
                password='Admin@123',
                full_name='Admin User',
                role='admin',
                is_staff=True,
                is_superuser=True,
                is_active=True,
                phone='+880-1234-567890',
                department='Management'
            )
            self.stdout.write(self.style.SUCCESS(f'  [OK] Created admin: {admin.email}'))
        else:
            self.stdout.write(self.style.WARNING(f'  [SKIP] Admin user already exists'))

        # Create Merchandiser user
        if not User.objects.filter(email='merchandiser@provabook.com').exists():
            merchandiser = User.objects.create_user(
                email='merchandiser@provabook.com',
                password='Merchandiser@123',
                full_name='Merchandiser User',
                role='merchandiser',
                is_active=True,
                phone='+880-1234-567891',
                department='Operations'
            )
            self.stdout.write(self.style.SUCCESS(f'  [OK] Created merchandiser: {merchandiser.email}'))
        else:
            self.stdout.write(self.style.WARNING(f'  [SKIP] Merchandiser user already exists'))

    def create_orders(self):
        """Create sample orders"""
        self.stdout.write('\nCreating sample orders...')
        
        # Get merchandiser user
        merchandiser = User.objects.filter(email='merchandiser@provabook.com').first()
        if not merchandiser:
            self.stdout.write(self.style.WARNING('  [WARN] Merchandiser not found, skipping orders'))
            return
        
        # Sample orders data
        orders_data = [
            {
                'customer_name': 'ABC Garments Ltd',
                'buyer_name': 'H&M',
                'style_number': 'HM-2025-001',
                'fabric_type': 'Single Jersey Cotton',
                'fabric_composition': '100% Cotton',
                'gsm': Decimal('180.00'),
                'finish_type': 'Enzyme Wash',
                'construction': '30s Combed',
                'mill_name': 'Zaber & Zubair Fabrics',
                'mill_price': Decimal('4.50'),
                'prova_price': Decimal('5.20'),
                'currency': 'USD',
                'quantity': Decimal('10000'),
                'unit': 'meters',
                'order_date': date.today() - timedelta(days=30),
                'expected_delivery_date': date.today() + timedelta(days=30),
                'etd': date.today() + timedelta(days=5),
                'eta': date.today() + timedelta(days=20),
                'status': OrderStatus.RUNNING,
                'category': OrderCategory.RUNNING,
                'current_stage': 'Production',
                'colorways': ['Navy Blue', 'Black', 'White'],
                'approval_status': {
                    'labDip': 'approved',
                    'strikeOff': 'approved',
                    'qualityTest': 'pending'
                }
            },
            {
                'customer_name': 'Fashion House BD',
                'buyer_name': 'Zara',
                'style_number': 'ZR-2025-045',
                'fabric_type': 'Pique Polo',
                'fabric_composition': '95% Cotton, 5% Elastane',
                'gsm': Decimal('220.00'),
                'finish_type': 'Silicon Wash',
                'construction': '20s Combed',
                'mill_name': 'Square Textiles',
                'mill_price': Decimal('6.80'),
                'prova_price': Decimal('7.50'),
                'currency': 'USD',
                'quantity': Decimal('15000'),
                'unit': 'meters',
                'order_date': date.today() - timedelta(days=15),
                'expected_delivery_date': date.today() + timedelta(days=45),
                'etd': date.today() + timedelta(days=2),
                'eta': date.today() + timedelta(days=25),
                'status': OrderStatus.UPCOMING,
                'category': OrderCategory.UPCOMING,
                'current_stage': 'Design',
                'colorways': ['White', 'Grey Melange', 'Navy'],
                'approval_status': {
                    'labDip': 'pending',
                    'strikeOff': 'pending'
                }
            },
            {
                'customer_name': 'Elegant Exports',
                'buyer_name': 'Next UK',
                'style_number': 'NXT-2024-789',
                'fabric_type': 'Terry Towel',
                'fabric_composition': '100% Cotton',
                'gsm': Decimal('450.00'),
                'finish_type': 'Reactive Dyed',
                'construction': '16s Combed',
                'mill_name': 'Pasha Fabrics',
                'mill_price': Decimal('8.20'),
                'prova_price': Decimal('9.00'),
                'currency': 'USD',
                'quantity': Decimal('8000'),
                'unit': 'meters',
                'order_date': date.today() - timedelta(days=90),
                'expected_delivery_date': date.today() - timedelta(days=5),
                'actual_delivery_date': date.today() - timedelta(days=3),
                'status': OrderStatus.COMPLETED,
                'category': OrderCategory.ARCHIVED,
                'current_stage': 'Delivered',
                'colorways': ['White', 'Beige', 'Light Blue'],
                'approval_status': {
                    'labDip': 'approved',
                    'strikeOff': 'approved',
                    'qualityTest': 'approved',
                    'bulkSwatch': 'approved'
                }
            },
            {
                'customer_name': 'Global Fashion Co',
                'buyer_name': 'Primark',
                'style_number': 'PRM-2025-123',
                'fabric_type': 'Fleece',
                'fabric_composition': '80% Cotton, 20% Polyester',
                'gsm': Decimal('280.00'),
                'finish_type': 'Brushed',
                'construction': '24s Open End',
                'mill_name': 'Envoy Textiles',
                'mill_price': Decimal('5.50'),
                'prova_price': Decimal('6.30'),
                'currency': 'USD',
                'quantity': Decimal('20000'),
                'unit': 'meters',
                'order_date': date.today() - timedelta(days=20),
                'expected_delivery_date': date.today() + timedelta(days=40),
                'etd': date.today() + timedelta(days=7),
                'eta': date.today() + timedelta(days=35),
                'status': OrderStatus.RUNNING,
                'category': OrderCategory.RUNNING,
                'current_stage': 'In Development',
                'colorways': ['Black', 'Charcoal', 'Navy Blue', 'Maroon'],
                'approval_status': {
                    'labDip': 'approved',
                    'strikeOff': 'approved',
                    'qualityTest': 'pending'
                }
            },
            {
                'customer_name': 'Metro Textiles',
                'buyer_name': 'Walmart',
                'style_number': 'WM-2025-567',
                'fabric_type': 'Denim',
                'fabric_composition': '98% Cotton, 2% Elastane',
                'gsm': Decimal('340.00'),
                'finish_type': 'Stone Wash',
                'construction': '10s Ring Spun',
                'mill_name': 'Ananta Denim',
                'mill_price': Decimal('7.80'),
                'prova_price': Decimal('8.60'),
                'currency': 'USD',
                'quantity': Decimal('12000'),
                'unit': 'meters',
                'order_date': date.today() - timedelta(days=5),
                'expected_delivery_date': date.today() + timedelta(days=60),
                'etd': date.today() + timedelta(days=10),
                'eta': date.today() + timedelta(days=50),
                'status': OrderStatus.UPCOMING,
                'category': OrderCategory.UPCOMING,
                'current_stage': 'Design',
                'colorways': ['Dark Blue', 'Light Blue', 'Black'],
                'approval_status': {
                    'labDip': 'pending'
                }
            },
        ]
        
        # Create orders
        created_count = 0
        for order_data in orders_data:
            # Check if order with same order_number exists
            if not Order.objects.filter(customer_name=order_data['customer_name'], 
                                       fabric_type=order_data['fabric_type']).exists():
                order = Order.objects.create(
                    merchandiser=merchandiser,
                    **order_data
                )
                created_count += 1
                self.stdout.write(self.style.SUCCESS(
                    f'  [OK] Created order: {order.order_number} - {order.customer_name}'
                ))
            else:
                self.stdout.write(self.style.WARNING(
                    f'  [SKIP] Order for {order_data["customer_name"]} - {order_data["fabric_type"]} already exists'
                ))
        three_days_ago = timezone.now() - timedelta(days=4)
        pending_stuck_qs = Order.objects.filter(
            merchandiser=merchandiser,
            status__in=[OrderStatus.UPCOMING, OrderStatus.RUNNING],
        ).filter(
            approval_status__contains={'labDip': 'pending'}
        )

        stuck_updated = pending_stuck_qs.update(updated_at=three_days_ago)
        if stuck_updated:
            self.stdout.write(self.style.SUCCESS(
                f'  Marked {stuck_updated} orders as stuck for approvals alerts'
            ))

        self.stdout.write(self.style.SUCCESS(f'\n  Created {created_count} sample orders'))

    def create_samples(self):
        """Create sample records for orders"""
        self.stdout.write('\nCreating sample records...')
        
        orders = Order.objects.all()
        if not orders.exists():
            self.stdout.write(self.style.WARNING('  [WARN] No orders found, skipping samples'))
            return
        
        sample_configs = [
            ('lab_dip', 'submitted', True),   # Has attachment
            ('strike_off', 'approved', True),  # Has attachment
            ('bulk_swatch', 'pending', False), # No attachment
            ('pp_sample', 'pending', True),    # Has attachment
        ]
        
        # Create dummy PDF content for attachments
        dummy_pdf_content = b"""%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj
2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj
3 0 obj
<<
/Type /Page
/Parent 2 0 R
/Resources <<
/Font <<
/F1 <<
/Type /Font
/Subtype /Type1
/BaseFont /Helvetica
>>
>>
>>
/MediaBox [0 0 612 792]
/Contents 4 0 R
>>
endobj
4 0 obj
<<
/Length 44
>>
stream
BT
/F1 12 Tf
50 700 Td
(Sample Document) Tj
ET
endstream
endobj
xref
0 5
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000314 00000 n 
trailer
<<
/Size 5
/Root 1 0 R
>>
startxref
407
%%EOF"""
        
        created_count = 0
        for order in orders:
            for version, (sample_type, status, has_attachment) in enumerate(sample_configs, start=1):
                if not Sample.objects.filter(order=order, type=sample_type, version=version).exists():
                    submission_date = order.order_date or date.today()
                    sample = Sample.objects.create(
                        order=order,
                        type=sample_type,
                        version=version,
                        status=status,
                        submission_date=submission_date,
                        recipient=f"{order.buyer_name or order.customer_name} Sample Dept",
                        courier_name='DHL',
                        awb_number=f"DHL-{order.order_number}-{version}",
                        notes=f"{sample_type.replace('_', ' ').title()} for {order.style_number or order.order_number}",
                    )
                    
                    # Add attachment for some samples
                    if has_attachment:
                        filename = f"{sample_type}_{order.order_number}_v{version}.pdf"
                        sample.attachment.save(filename, ContentFile(dummy_pdf_content), save=True)
                        
                    created_count += 1
        
        self.stdout.write(self.style.SUCCESS(f'\n  Created {created_count} sample records (some with attachments)'))

    def create_financials(self):
        """Create financial documents (PIs and LCs) for orders"""
        self.stdout.write('\nCreating financial documents...')
        
        merchandiser = User.objects.filter(email='merchandiser@provabook.com').first()
        if not merchandiser:
            self.stdout.write(self.style.WARNING('  [WARN] Merchandiser not found, skipping financials'))
            return
        
        orders = Order.objects.all()
        if not orders.exists():
            self.stdout.write(self.style.WARNING('  [WARN] No orders found, skipping financials'))
            return
        
        pi_created = 0
        lc_created = 0
        
        for order in orders:
            unit_price = order.prova_price or order.mill_price or Decimal('5.00')
            quantity = order.quantity or Decimal('1000')
            amount = unit_price * quantity
            
            if not order.proforma_invoices.exists():
                ProformaInvoice.objects.create(
                    order=order,
                    pi_number=f"PI-{order.order_number}",
                    version=1,
                    status='confirmed' if order.status == OrderStatus.RUNNING else 'draft',
                    amount=amount,
                    currency=order.currency,
                    issue_date=order.order_date or date.today(),
                    created_by=merchandiser,
                )
                pi_created += 1
            
            if not order.letters_of_credit.exists():
                issue_date = order.etd or date.today()
                LetterOfCredit.objects.create(
                    order=order,
                    lc_number=f"LC-{order.order_number}",
                    status='issued' if order.status in [OrderStatus.RUNNING, OrderStatus.COMPLETED] else 'pending',
                    amount=amount,
                    currency=order.currency,
                    issue_date=issue_date,
                    expiry_date=issue_date + timedelta(days=120),
                    issuing_bank='Demo Bank Ltd',
                    created_by=merchandiser,
                )
                lc_created += 1
        
        self.stdout.write(self.style.SUCCESS(
            f'\n  Created {pi_created} proforma invoices and {lc_created} letters of credit'
        ))
