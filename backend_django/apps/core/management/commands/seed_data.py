"""
Management command to seed database with comprehensive demo data
Usage: python manage.py seed_data
"""
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from apps.orders.models import Order, OrderStatus, OrderCategory, ApprovalHistory
from apps.orders.models_style_color import OrderStyle, OrderColor
from apps.orders.models_order_line import OrderLine
from apps.orders.models_supplier_delivery import SupplierDelivery
from apps.samples.models import Sample
from apps.financials.models import ProformaInvoice, LetterOfCredit
from apps.shipments.models import Shipment
from decimal import Decimal
from datetime import date, timedelta
from django.utils import timezone
from django.core.files.base import ContentFile
import random

User = get_user_model()


class Command(BaseCommand):
    help = 'Seed database with comprehensive demo users, orders, styles, colors, and lines'

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('=== Seeding database ==='))
        
        # Create demo users
        self.create_users()
        
        # Create sample orders
        self.create_orders()
        
        # Create order styles, colors, and lines
        self.create_order_lines()
        
        # Create approval history for order lines
        self.create_approval_history()
        
        # Create supplier delivery records
        self.create_supplier_deliveries()
        
        # Create related samples
        self.create_samples()

        # Create financial documents
        self.create_financials()
        
        # Create shipments
        self.create_shipments()
        
        self.stdout.write(self.style.SUCCESS('\n=== Database seeded successfully! ==='))
        self.stdout.write(self.style.SUCCESS('\nDemo Credentials:'))
        self.stdout.write(self.style.SUCCESS('   Admin: admin@provabook.com / Admin@123'))
        self.stdout.write(self.style.SUCCESS('   Merchandiser 1: john.smith@provabook.com / Merchandiser@123'))
        self.stdout.write(self.style.SUCCESS('   Merchandiser 2: sarah.jones@provabook.com / Merchandiser@123'))
        self.stdout.write(self.style.SUCCESS('   Merchandiser 3: mike.wilson@provabook.com / Merchandiser@123'))
        self.stdout.write(self.style.SUCCESS('\nAccess Points:'))
        self.stdout.write(self.style.SUCCESS('   Admin Panel: http://localhost:8000/admin/'))
        self.stdout.write(self.style.SUCCESS('   API Docs: http://localhost:8000/api/docs/\n'))

    def create_users(self):
        """Create demo users including multiple merchandisers"""
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
            self.stdout.write(self.style.WARNING('  [SKIP] Admin user already exists'))

        # Create multiple merchandiser users
        merchandisers_data = [
            {
                'email': 'john.smith@provabook.com',
                'full_name': 'John Smith',
                'phone': '+880-1711-111111',
                'department': 'Operations'
            },
            {
                'email': 'sarah.jones@provabook.com',
                'full_name': 'Sarah Jones',
                'phone': '+880-1711-222222',
                'department': 'Operations'
            },
            {
                'email': 'mike.wilson@provabook.com',
                'full_name': 'Mike Wilson',
                'phone': '+880-1711-333333',
                'department': 'Operations'
            },
            {
                'email': 'emily.davis@provabook.com',
                'full_name': 'Emily Davis',
                'phone': '+880-1711-444444',
                'department': 'Operations'
            },
        ]
        
        for merch_data in merchandisers_data:
            if not User.objects.filter(email=merch_data['email']).exists():
                merchandiser = User.objects.create_user(
                    email=merch_data['email'],
                    password='Merchandiser@123',
                    full_name=merch_data['full_name'],
                    role='merchandiser',
                    is_active=True,
                    phone=merch_data['phone'],
                    department=merch_data['department']
                )
                self.stdout.write(self.style.SUCCESS(f'  [OK] Created merchandiser: {merchandiser.email}'))
            else:
                self.stdout.write(self.style.WARNING(f'  [SKIP] Merchandiser {merch_data["email"]} already exists'))

    def create_orders(self):
        """Create sample orders spanning 12 months with varied data"""
        self.stdout.write('\nCreating sample orders...')
        
        # Get all merchandiser users
        merchandisers = list(User.objects.filter(role='merchandiser'))
        if not merchandisers:
            self.stdout.write(self.style.WARNING('  [WARN] No merchandisers found, skipping orders'))
            return
        
        # Define data pools for variation
        customers = [
            'ABC Garments Ltd', 'Fashion House BD', 'Elegant Exports', 'Global Fashion Co',
            'Metro Textiles', 'Continental Knits', 'Delta Apparel Ltd', 'Modern Knitwear',
            'Prime Textiles BD', 'Atlas Fashion', 'Heritage Mills', 'Evergreen Apparels',
            'Skyline Textiles', 'Oceanic Fabrics', 'Apex Garments', 'Stellar Textiles'
        ]
        
        buyers = [
            'H&M', 'Zara', 'Next UK', 'Primark', 'Walmart', 'C&A', 'Tesco', 
            'Marks & Spencer', 'Lidl', 'Target', "Kohl's", 'Old Navy', 'Gap', 
            'Uniqlo', 'JCPenney', "Macy's", 'Nordstrom', 'TK Maxx'
        ]
        
        fabric_types = [
            'Single Jersey Cotton', 'Pique Polo', 'Terry Towel', 'Fleece', 'Denim',
            'Interlock', 'Rib Knit', 'Jacquard', 'French Terry', 'Slub Jersey',
            'Modal Jersey', 'Air Flow Jersey', 'Waffle Knit', 'Ottoman Rib',
            'Ponte Roma', 'Burnout Jersey', 'Velour', 'Mesh Athletic'
        ]
        
        compositions = [
            '100% Cotton', '95% Cotton, 5% Elastane', '80% Cotton, 20% Polyester',
            '98% Cotton, 2% Elastane', '50% Cotton, 50% Modal', '60% Cotton, 40% Polyester',
            '70% Cotton, 30% Polyester', '90% Cotton, 10% Elastane', '100% Polyester'
        ]
        
        finishes = [
            'Enzyme Wash', 'Silicon Wash', 'Stone Wash', 'Brushed', 'Reactive Dyed',
            'Bio Wash', 'Soft Finish', 'Moisture Wicking', 'Anti-Pilling', 'Mercerized'
        ]
        
        mills = [
            'Zaber & Zubair Fabrics', 'Square Textiles', 'Pasha Fabrics', 'Envoy Textiles',
            'Ananta Denim', 'Continental Mills', 'Delta Textiles', 'Modern Mills',
            'Prime Mills', 'Atlas Textiles', 'Heritage Fabrics', 'Evergreen Textiles',
            'Skyline Fabrics', 'Oceanic Mills', 'Apex Mills', 'DBL Group'
        ]
        
        # Generate 40 orders programmatically across 12 months
        base_date = date.today() - timedelta(days=365)
        created_count = 0
        
        for i in range(40):
            # Rotate through data pools
            customer = customers[i % len(customers)]
            buyer = buyers[i % len(buyers)]
            fabric = fabric_types[i % len(fabric_types)]
            composition = compositions[i % len(compositions)]
            finish = finishes[i % len(finishes)]
            mill = mills[i % len(mills)]
            merchandiser = merchandisers[i % len(merchandisers)]
            
            # Calculate dates - spread across 12 months
            days_offset = (i * 9) + random.randint(-5, 5)
            order_date = base_date + timedelta(days=days_offset)
            
            # Determine status based on order date
            days_since_order = (date.today() - order_date).days
            if days_since_order > 180:
                status = OrderStatus.COMPLETED
                category = OrderCategory.ARCHIVED
                stage = 'Delivered'
                etd = order_date + timedelta(days=random.randint(60, 90))
                eta = etd + timedelta(days=random.randint(15, 25))
                actual_delivery = eta + timedelta(days=random.randint(-3, 3))
            elif days_since_order > 90:
                status = OrderStatus.RUNNING
                category = OrderCategory.RUNNING
                stage = random.choice(['Production', 'Quality Check', 'In Development'])
                etd = date.today() + timedelta(days=random.randint(1, 10))
                eta = etd + timedelta(days=random.randint(15, 25))
                actual_delivery = None
            else:
                status = OrderStatus.UPCOMING
                category = OrderCategory.UPCOMING
                stage = random.choice(['Design', 'Development', 'Sampling'])
                etd = date.today() + timedelta(days=random.randint(10, 30))
                eta = etd + timedelta(days=random.randint(15, 25))
                actual_delivery = None
            
            expected_delivery = order_date + timedelta(days=random.randint(60, 120))
            
            # Generate approval status
            approval_status = {}
            if status == OrderStatus.COMPLETED:
                approval_status = {
                    'labDip': 'approved',
                    'strikeOff': 'approved',
                    'qualityTest': 'approved',
                    'bulkSwatch': 'approved'
                }
            elif status == OrderStatus.RUNNING:
                approval_status = {
                    'labDip': 'approved',
                    'strikeOff': 'approved' if random.random() > 0.3 else 'pending',
                    'qualityTest': 'pending' if random.random() > 0.5 else 'approved'
                }
            else:
                approval_status = {
                    'labDip': 'pending' if random.random() > 0.3 else 'submission'
                }
            
            # Generate prices and quantities
            gsm = Decimal(str(random.randint(150, 450)))
            mill_price = Decimal(str(round(random.uniform(3.5, 9.0), 2)))
            prova_price = mill_price + Decimal(str(round(random.uniform(0.5, 1.5), 2)))
            quantity = Decimal(str(random.randint(7000, 20000)))
            
            base_style_number = f'{buyer[:3].upper()}-{2024 + (i // 20)}-{str((i % 20) + 1).zfill(3)}'
            
            # Check if order already exists
            if not Order.objects.filter(
                customer_name=customer,
                base_style_number=base_style_number
            ).exists():
                order = Order.objects.create(
                    merchandiser=merchandiser,
                    customer_name=customer,
                    buyer_name=buyer,
                    base_style_number=base_style_number,
                    fabric_type=fabric,
                    fabric_composition=composition,
                    gsm=gsm,
                    finish_type=finish,
                    construction=random.choice(['30s Combed', '20s Combed', '24s Combed', '2x2 Rib', 'Jersey', '10s Ring Spun']),
                    mill_name=mill,
                    mill_price=mill_price,
                    prova_price=prova_price,
                    currency='USD',
                    quantity=quantity,
                    unit='meters',
                    order_date=order_date,
                    expected_delivery_date=expected_delivery,
                    etd=etd,
                    eta=eta,
                    actual_delivery_date=actual_delivery,
                    status=status,
                    category=category,
                    current_stage=stage,
                    approval_status=approval_status
                )
                created_count += 1
                self.stdout.write(self.style.SUCCESS(
                    f'  [OK] Created order: {order.order_number} - {order.customer_name}'
                ))
        
        # Mark some orders as stuck for alerts
        three_days_ago = timezone.now() - timedelta(days=4)
        pending_stuck_qs = Order.objects.filter(
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

    def create_order_lines(self):
        """Create OrderStyles, OrderColors, and OrderLines for each order"""
        self.stdout.write('\nCreating order styles, colors, and lines...')
        
        orders = Order.objects.all()
        if not orders.exists():
            self.stdout.write(self.style.WARNING('  [WARN] No orders found, skipping order lines'))
            return
        
        # Color pools
        colors_pool = [
            ('NV', 'Navy Blue'), ('BLK', 'Black'), ('WHT', 'White'), ('GRY', 'Grey'),
            ('RED', 'Red'), ('BLU', 'Blue'), ('GRN', 'Green'), ('YLW', 'Yellow'),
            ('ORG', 'Orange'), ('PNK', 'Pink'), ('BRN', 'Brown'), ('PRP', 'Purple'),
            ('HGR', 'Heather Grey'), ('CGR', 'Charcoal'), ('BEG', 'Beige'), ('MRN', 'Maroon')
        ]
        
        # CAD pools
        cad_pool = [
            ('CAD-001', 'Stripe Pattern'), ('CAD-002', 'Solid Color'), ('CAD-003', 'Floral Print'),
            ('CAD-004', 'Geometric'), ('CAD-005', 'Abstract'), ('CAD-006', 'Dots Pattern'),
            ('CAD-007', 'Check Pattern'), ('CAD-008', 'Paisley'), ('CAD-009', 'Camouflage'),
            ('CAD-010', 'Animal Print')
        ]
        
        style_count = 0
        color_count = 0
        line_count = 0
        
        for order in orders:
            # Each order gets 1-3 styles
            num_styles = random.randint(1, 3)
            
            for style_idx in range(num_styles):
                # Check if style already exists
                style_num = f'{order.base_style_number}-{str(style_idx + 1).zfill(2)}'
                if OrderStyle.objects.filter(order=order, style_number=style_num).exists():
                    continue
                
                style = OrderStyle.objects.create(
                    order=order,
                    style_number=style_num,
                    description=f'Style variant {style_idx + 1} for {order.buyer_name}',
                    fabric_type=order.fabric_type,
                    fabric_composition=order.fabric_composition,
                    gsm=order.gsm,
                    finish_type=order.finish_type,
                    construction=order.construction,
                    etd=order.etd,
                    eta=order.eta,
                    submission_date=order.order_date
                )
                style_count += 1
                
                # Each style gets 2-5 colors
                num_colors = random.randint(2, 5)
                style_colors = random.sample(colors_pool, min(num_colors, len(colors_pool)))
                
                for color_code, color_name in style_colors:
                    if OrderColor.objects.filter(style=style, color_code=color_code).exists():
                        continue
                    
                    color_qty = Decimal(str(random.randint(1000, 5000)))
                    color = OrderColor.objects.create(
                        style=style,
                        color_code=color_code,
                        color_name=color_name,
                        quantity=color_qty,
                        unit='meters',
                        etd=order.etd + timedelta(days=random.randint(-7, 14)) if order.etd else None,
                        eta=order.eta + timedelta(days=random.randint(-5, 10)) if order.eta else None,
                        submission_date=order.order_date,
                        mill_name=order.mill_name,
                        mill_price=order.mill_price,
                        prova_price=order.prova_price,
                        currency='USD',
                        approval_status={'labDip': 'pending' if random.random() > 0.5 else 'approved'}
                    )
                    color_count += 1
                    
                    # Create order line for this color (with or without CAD)
                    # 50% chance to add CAD
                    if random.random() > 0.5:
                        cad_code, cad_name = random.choice(cad_pool)
                        if not OrderLine.objects.filter(style=style, color_code=color_code, cad_code=cad_code).exists():
                            OrderLine.objects.create(
                                style=style,
                                color_code=color_code,
                                color_name=color_name,
                                cad_code=cad_code,
                                cad_name=cad_name,
                                quantity=color_qty,
                                unit='meters',
                                mill_name=order.mill_name,
                                mill_price=order.mill_price,
                                prova_price=order.prova_price,
                                commission=Decimal(str(round(random.uniform(0.1, 0.5), 2))),
                                currency='USD',
                                etd=order.etd + timedelta(days=random.randint(-5, 10)) if order.etd else None,
                                eta=order.eta + timedelta(days=random.randint(-3, 7)) if order.eta else None,
                                submission_date=order.order_date,
                                approval_status={'labDip': 'pending' if random.random() > 0.5 else 'approved'},
                                status=order.status
                            )
                            line_count += 1
                    else:
                        # Color-only line (no CAD)
                        if not OrderLine.objects.filter(style=style, color_code=color_code, cad_code=None).exists():
                            OrderLine.objects.create(
                                style=style,
                                color_code=color_code,
                                color_name=color_name,
                                quantity=color_qty,
                                unit='meters',
                                mill_name=order.mill_name,
                                mill_price=order.mill_price,
                                prova_price=order.prova_price,
                                commission=Decimal(str(round(random.uniform(0.1, 0.5), 2))),
                                currency='USD',
                                etd=order.etd + timedelta(days=random.randint(-5, 10)) if order.etd else None,
                                eta=order.eta + timedelta(days=random.randint(-3, 7)) if order.eta else None,
                                submission_date=order.order_date,
                                approval_status={'labDip': 'pending' if random.random() > 0.5 else 'approved'},
                                status=order.status
                            )
                            line_count += 1
        
        self.stdout.write(self.style.SUCCESS(
            f'\n  Created {style_count} styles, {color_count} colors, and {line_count} order lines'
        ))

    def create_approval_history(self):
        """Create comprehensive approval history for order lines with realistic timelines"""
        self.stdout.write('\nCreating approval history records...')
        
        # Get all order lines
        order_lines = OrderLine.objects.select_related('style__order').all()
        if not order_lines.exists():
            self.stdout.write(self.style.WARNING('  [WARN] No order lines found, skipping approval history'))
            return
        
        # Get merchandisers to assign as approvers
        merchandisers = list(User.objects.filter(role='merchandiser'))
        if not merchandisers:
            self.stdout.write(self.style.WARNING('  [WARN] No merchandisers found, skipping approval history'))
            return
        
        # Define approval gates and their typical progression
        approval_gates = [
            ('labDip', 'Lab Dip'),
            ('strikeOff', 'Strike-Off'),
            ('handloom', 'Handloom'),
            ('ppSample', 'PP Sample'),
            ('aop', 'AOP'),
            ('qualityTest', 'Quality Test'),
            ('bulkSwatch', 'Bulk Swatch'),
            ('price', 'Price'),
            ('quality', 'Quality'),
        ]
        
        history_count = 0
        
        for line in order_lines:
            order = line.style.order
            
            # Determine how many approval gates to create based on order status
            if order.status == OrderStatus.COMPLETED:
                # Completed orders: full approval history (5-7 gates)
                num_gates = random.randint(5, 7)
                gates_to_use = approval_gates[:num_gates]
            elif order.status == OrderStatus.RUNNING:
                # Running orders: partial approval history (3-5 gates)
                num_gates = random.randint(3, 5)
                gates_to_use = approval_gates[:num_gates]
            else:
                # Upcoming orders: minimal approval history (1-3 gates)
                num_gates = random.randint(1, 3)
                gates_to_use = approval_gates[:num_gates]
            
            # Start date: order submission date
            base_date = order.order_date or date.today()
            current_date = base_date
            
            for gate_idx, (gate_type, gate_name) in enumerate(gates_to_use):
                # Determine the approval flow for this gate
                # 70% chance of direct approval, 20% chance of resubmission, 10% chance still pending
                flow_type = random.choices(
                    ['direct_approval', 'resubmission', 'pending'],
                    weights=[0.7, 0.2, 0.1]
                )[0]
                
                approver = random.choice(merchandisers)
                
                # For the last gate on non-completed orders, more likely to be pending
                if gate_idx == len(gates_to_use) - 1 and order.status != OrderStatus.COMPLETED:
                    flow_type = random.choices(
                        ['direct_approval', 'pending'],
                        weights=[0.3, 0.7]
                    )[0]
                
                if flow_type == 'direct_approval':
                    # Initial submission
                    submission_date = current_date + timedelta(days=random.randint(1, 3))
                    if not ApprovalHistory.objects.filter(
                        order=order,
                        order_line=line,
                        approval_type=gate_type,
                        status='submission'
                    ).exists():
                        approval_record = ApprovalHistory.objects.create(
                            order=order,
                            order_line=line,
                            approval_type=gate_type,
                            status='submission',
                            changed_by=approver,
                            notes=f'Initial {gate_name} submission for {line.line_label}'
                        )
                        # Manually set created_at to match timeline
                        ApprovalHistory.objects.filter(pk=approval_record.pk).update(
                            created_at=timezone.make_aware(
                                timezone.datetime.combine(submission_date, timezone.datetime.min.time())
                            )
                        )
                        history_count += 1
                    
                    # Approval after 3-7 days
                    approval_date = submission_date + timedelta(days=random.randint(3, 7))
                    if not ApprovalHistory.objects.filter(
                        order=order,
                        order_line=line,
                        approval_type=gate_type,
                        status='approved'
                    ).exists():
                        approval_record = ApprovalHistory.objects.create(
                            order=order,
                            order_line=line,
                            approval_type=gate_type,
                            status='approved',
                            changed_by=approver,
                            notes=f'{gate_name} approved for {line.line_label}'
                        )
                        ApprovalHistory.objects.filter(pk=approval_record.pk).update(
                            created_at=timezone.make_aware(
                                timezone.datetime.combine(approval_date, timezone.datetime.min.time())
                            )
                        )
                        history_count += 1
                    
                    current_date = approval_date
                
                elif flow_type == 'resubmission':
                    # Initial submission
                    submission_date = current_date + timedelta(days=random.randint(1, 3))
                    if not ApprovalHistory.objects.filter(
                        order=order,
                        order_line=line,
                        approval_type=gate_type,
                        status='submission'
                    ).exists():
                        approval_record = ApprovalHistory.objects.create(
                            order=order,
                            order_line=line,
                            approval_type=gate_type,
                            status='submission',
                            changed_by=approver,
                            notes=f'Initial {gate_name} submission for {line.line_label}'
                        )
                        ApprovalHistory.objects.filter(pk=approval_record.pk).update(
                            created_at=timezone.make_aware(
                                timezone.datetime.combine(submission_date, timezone.datetime.min.time())
                            )
                        )
                        history_count += 1
                    
                    # Rejection after 2-4 days
                    rejection_date = submission_date + timedelta(days=random.randint(2, 4))
                    if not ApprovalHistory.objects.filter(
                        order=order,
                        order_line=line,
                        approval_type=gate_type,
                        status='rejected'
                    ).exists():
                        approval_record = ApprovalHistory.objects.create(
                            order=order,
                            order_line=line,
                            approval_type=gate_type,
                            status='rejected',
                            changed_by=approver,
                            notes=f'{gate_name} rejected - color shade mismatch. Resubmission required.'
                        )
                        ApprovalHistory.objects.filter(pk=approval_record.pk).update(
                            created_at=timezone.make_aware(
                                timezone.datetime.combine(rejection_date, timezone.datetime.min.time())
                            )
                        )
                        history_count += 1
                    
                    # Resubmission after 5-8 days
                    resubmission_date = rejection_date + timedelta(days=random.randint(5, 8))
                    if not ApprovalHistory.objects.filter(
                        order=order,
                        order_line=line,
                        approval_type=gate_type,
                        status='resubmission'
                    ).exists():
                        approval_record = ApprovalHistory.objects.create(
                            order=order,
                            order_line=line,
                            approval_type=gate_type,
                            status='resubmission',
                            changed_by=approver,
                            notes=f'{gate_name} resubmitted with corrections for {line.line_label}'
                        )
                        ApprovalHistory.objects.filter(pk=approval_record.pk).update(
                            created_at=timezone.make_aware(
                                timezone.datetime.combine(resubmission_date, timezone.datetime.min.time())
                            )
                        )
                        history_count += 1
                    
                    # Final approval after 3-5 days
                    final_approval_date = resubmission_date + timedelta(days=random.randint(3, 5))
                    if not ApprovalHistory.objects.filter(
                        order=order,
                        order_line=line,
                        approval_type=gate_type,
                        status='approved'
                    ).exists():
                        approval_record = ApprovalHistory.objects.create(
                            order=order,
                            order_line=line,
                            approval_type=gate_type,
                            status='approved',
                            changed_by=approver,
                            notes=f'{gate_name} approved after resubmission for {line.line_label}'
                        )
                        ApprovalHistory.objects.filter(pk=approval_record.pk).update(
                            created_at=timezone.make_aware(
                                timezone.datetime.combine(final_approval_date, timezone.datetime.min.time())
                            )
                        )
                        history_count += 1
                    
                    current_date = final_approval_date
                
                else:  # pending
                    # Initial submission only
                    submission_date = current_date + timedelta(days=random.randint(1, 3))
                    if not ApprovalHistory.objects.filter(
                        order=order,
                        order_line=line,
                        approval_type=gate_type,
                        status='submission'
                    ).exists():
                        approval_record = ApprovalHistory.objects.create(
                            order=order,
                            order_line=line,
                            approval_type=gate_type,
                            status='submission',
                            changed_by=approver,
                            notes=f'{gate_name} submitted - awaiting buyer feedback for {line.line_label}'
                        )
                        ApprovalHistory.objects.filter(pk=approval_record.pk).update(
                            created_at=timezone.make_aware(
                                timezone.datetime.combine(submission_date, timezone.datetime.min.time())
                            )
                        )
                        history_count += 1
                    
                    current_date = submission_date
        
        self.stdout.write(self.style.SUCCESS(
            f'\n  Created {history_count} approval history records for order lines'
        ))

    def create_supplier_deliveries(self):
        """Create supplier delivery records for order lines with realistic dates and quantities"""
        self.stdout.write('\nCreating supplier delivery records...')
        
        # Get all order lines
        order_lines = OrderLine.objects.select_related('style__order').all()
        if not order_lines.exists():
            self.stdout.write(self.style.WARNING('  [WARN] No order lines found, skipping supplier deliveries'))
            return
        
        # Get merchandisers for tracking
        merchandisers = list(User.objects.filter(role='merchandiser'))
        if not merchandisers:
            merchandisers = [None]
        
        delivery_count = 0
        
        for line in order_lines:
            order = line.style.order
            
            # Determine if this line should have deliveries based on order status
            if order.status == OrderStatus.UPCOMING:
                # Upcoming orders: no deliveries yet
                continue
            elif order.status == OrderStatus.RUNNING:
                # Running orders: 1-3 partial deliveries (40% chance to have deliveries)
                if random.random() > 0.4:
                    continue
                num_deliveries = random.randint(1, 3)
                delivery_percentage = 0.3  # Each delivery is ~30-60% of line quantity
            else:  # COMPLETED
                # Completed orders: 2-5 deliveries totaling the full quantity
                num_deliveries = random.randint(2, 5)
                delivery_percentage = 1.0 / num_deliveries  # Split evenly
            
            # Start from ETD or order date
            base_delivery_date = line.etd or order.etd or order.order_date or date.today()
            
            # For completed orders, adjust base date to be in the past
            if order.status == OrderStatus.COMPLETED:
                days_ago = random.randint(30, 120)
                base_delivery_date = base_delivery_date - timedelta(days=days_ago)
            
            total_quantity = line.quantity
            remaining_quantity = total_quantity
            
            for i in range(num_deliveries):
                # Calculate delivery date (spread over time)
                if i == 0:
                    delivery_date = base_delivery_date
                else:
                    # Subsequent deliveries are 7-21 days apart
                    days_offset = random.randint(7, 21) * i
                    delivery_date = base_delivery_date + timedelta(days=days_offset)
                
                # Calculate delivery quantity
                if i == num_deliveries - 1:
                    # Last delivery: deliver remaining quantity
                    delivered_qty = remaining_quantity
                else:
                    # Intermediate delivery: 20-50% of total, or what remains
                    percentage = random.uniform(0.2, 0.5)
                    delivered_qty = min(
                        Decimal(str(round(float(total_quantity) * percentage, 2))),
                        remaining_quantity
                    )
                
                # Ensure minimum delivery quantity
                if delivered_qty < Decimal('100'):
                    delivered_qty = min(Decimal('100'), remaining_quantity)
                
                # Create delivery record
                if delivered_qty > 0 and not SupplierDelivery.objects.filter(
                    order_line=line,
                    delivery_date=delivery_date
                ).exists():
                    delivery_record = SupplierDelivery.objects.create(
                        order=order,
                        order_line=line,
                        style=line.style,
                        delivery_date=delivery_date,
                        delivered_quantity=delivered_qty,
                        unit=line.unit,
                        notes=f'Delivery {i+1}/{num_deliveries} for {line.line_label}',
                        created_by=random.choice(merchandisers) if merchandisers[0] else None
                    )
                    
                    # Manually set created_at to match delivery timeline
                    SupplierDelivery.objects.filter(pk=delivery_record.pk).update(
                        created_at=timezone.make_aware(
                            timezone.datetime.combine(delivery_date, timezone.datetime.min.time())
                        )
                    )
                    
                    delivery_count += 1
                    remaining_quantity -= delivered_qty
                    
                    # If nothing remains, stop creating more deliveries
                    if remaining_quantity <= 0:
                        break
        
        self.stdout.write(self.style.SUCCESS(
            f'\n  Created {delivery_count} supplier delivery records'
        ))

    def create_samples(self):
        """Create sample records for orders"""
        self.stdout.write('\nCreating sample records...')
        
        orders = Order.objects.all()
        if not orders.exists():
            self.stdout.write(self.style.WARNING('  [WARN] No orders found, skipping samples'))
            return
        
        sample_configs = [
            ('lab_dip', 'submitted', True),
            ('strike_off', 'approved', True),
            ('bulk_swatch', 'pending', False),
            ('pp_sample', 'pending', True),
        ]
        
        # Create dummy PDF content
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
                        notes=f"{sample_type.replace('_', ' ').title()} for {order.order_number}",
                    )
                    
                    if has_attachment:
                        filename = f"{sample_type}_{order.order_number}_v{version}.pdf"
                        sample.attachment.save(filename, ContentFile(dummy_pdf_content), save=True)
                        
                    created_count += 1
        
        self.stdout.write(self.style.SUCCESS(f'\n  Created {created_count} sample records (some with attachments)'))

    def create_financials(self):
        """Create financial documents (PIs and LCs) for orders"""
        self.stdout.write('\nCreating financial documents...')
        
        merchandisers = list(User.objects.filter(role='merchandiser'))
        if not merchandisers:
            self.stdout.write(self.style.WARNING('  [WARN] No merchandisers found, skipping financials'))
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
            merchandiser = merchandisers[0]
            
            pi_number = f"PI-{order.order_number}"
            if not ProformaInvoice.objects.filter(pi_number=pi_number).exists():
                ProformaInvoice.objects.create(
                    order=order,
                    pi_number=pi_number,
                    version=1,
                    status='confirmed' if order.status == OrderStatus.RUNNING else 'draft',
                    amount=amount,
                    currency=order.currency,
                    issue_date=order.order_date or date.today(),
                    created_by=merchandiser,
                )
                pi_created += 1

            lc_number = f"LC-{order.order_number}"
            if not LetterOfCredit.objects.filter(lc_number=lc_number).exists():
                issue_date = order.etd or date.today()
                LetterOfCredit.objects.create(
                    order=order,
                    lc_number=lc_number,
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

    def create_shipments(self):
        """Create shipment records for orders"""
        self.stdout.write('\nCreating shipments...')
        
        orders = Order.objects.all()
        if not orders.exists():
            self.stdout.write(self.style.WARNING('  [WARN] No orders found, skipping shipments'))
            return
        
        # Create dummy PDF content for packing lists
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
(Packing List Document) Tj
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
        
        shipment_configs = [
            ('DHL Express', 'delivered', True, -10),
            ('FedEx International', 'delivered', True, -5),
            ('Maersk Shipping', 'in_transit', True, 2),
            ('UPS Worldwide', 'in_transit', True, 3),
            ('Aramex', 'pending', True, 5),
            ('SF Express', 'pending', False, 7),
            ('TNT Express', 'pending', False, 10),
        ]
        
        created_count = 0
        
        for idx, order in enumerate(orders[:15]):  # Create shipments for first 15 orders
            if idx > 2 and order.status == OrderStatus.COMPLETED:
                continue
            
            config_idx = idx % len(shipment_configs)
            carrier, status, has_document, days_offset = shipment_configs[config_idx]
            
            awb_number = f"{carrier.split()[0].upper()}-{order.order_number}-{1000 + idx}"
            
            if not Shipment.objects.filter(order=order, awb_number=awb_number).exists():
                order_date = order.order_date or date.today()
                shipping_date = order_date + timedelta(days=abs(days_offset))
                if days_offset < 0:
                    shipping_date = order_date - timedelta(days=abs(days_offset))
                
                shipment = Shipment.objects.create(
                    order=order,
                    carrier_name=carrier,
                    awb_number=awb_number,
                    shipping_date=shipping_date,
                    status=status,
                    notes=f"Shipment for {order.order_number} via {carrier}",
                )
                
                if has_document:
                    filename = f"packing_list_{order.order_number}_{awb_number}.pdf"
                    shipment.documents.save(filename, ContentFile(dummy_pdf_content), save=True)
                
                created_count += 1
        
        self.stdout.write(self.style.SUCCESS(
            f'\n  Created {created_count} shipments (some with documents)'
        ))
