from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from decimal import Decimal
from datetime import date, timedelta
import random

from apps.orders.models import Order, OrderStatus, OrderCategory, OrderType
from apps.orders.models_style_color import OrderStyle, OrderColor
from apps.orders.models_order_line import OrderLine


User = get_user_model()


class Command(BaseCommand):
    help = 'Seed representative LOCAL orders with rich line-level production data for the Local Orders module'

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('=== Seeding LOCAL orders with production data ==='))

        merchandisers = list(User.objects.filter(role='merchandiser'))
        if not merchandisers:
            self.stdout.write(self.style.ERROR('No merchandisers with role="merchandiser" found. Run seed_data first.'))
            return

        # Clean up any previous demo local orders from this command
        deleted_count, _ = Order.objects.filter(
            order_type=OrderType.LOCAL,
            customer_name__startswith='Demo Local'
        ).delete()
        if deleted_count:
            self.stdout.write(self.style.WARNING(f'Removed {deleted_count} previously seeded local orders'))

        today = date.today()

        scenarios = [
            # Fully completed local order - Ex-Factory in the past
            {
                'label': 'Completed - Ex-Factory',
                'customer_name': 'Demo Local Knitwear Ltd',
                'buyer_name': 'Local Buyer A',
                'months_ago': 3,
                'status': OrderStatus.COMPLETED,
                'category': OrderCategory.ARCHIVED,
                'stage': 'Delivered',
                'progress': 'ex_factory',
            },
            # Running order - Sewing in progress
            {
                'label': 'Running - Sewing',
                'customer_name': 'Demo Local Apparel Co',
                'buyer_name': 'Local Buyer B',
                'months_ago': 1,
                'status': OrderStatus.RUNNING,
                'category': OrderCategory.RUNNING,
                'stage': 'Sewing',
                'progress': 'sewing',
            },
            # Running order - Dyeing in progress
            {
                'label': 'Running - Dyeing',
                'customer_name': 'Demo Local Dyehouse',
                'buyer_name': 'Local Buyer C',
                'months_ago': 0,
                'status': OrderStatus.RUNNING,
                'category': OrderCategory.RUNNING,
                'stage': 'Dyeing',
                'progress': 'dyeing',
            },
            # Upcoming order - Knitting planned
            {
                'label': 'Upcoming - Knitting',
                'customer_name': 'Demo Local Knits',
                'buyer_name': 'Local Buyer D',
                'months_ago': 0,
                'status': OrderStatus.UPCOMING,
                'category': OrderCategory.UPCOMING,
                'stage': 'Knitting',
                'progress': 'knitting',
            },
            # Upcoming order - Yarn booked only
            {
                'label': 'Upcoming - Yarn Booked',
                'customer_name': 'Demo Local Yarn Traders',
                'buyer_name': 'Local Buyer E',
                'months_ago': 0,
                'status': OrderStatus.UPCOMING,
                'category': OrderCategory.UPCOMING,
                'stage': 'Yarn Booking',
                'progress': 'yarn_only',
            },
        ]

        created_orders = 0

        for idx, scenario in enumerate(scenarios, start=1):
            merch = merchandisers[(idx - 1) % len(merchandisers)]

            # Spread order dates around the past months
            order_date = today - timedelta(days=scenario['months_ago'] * 30 + random.randint(0, 10))

            # ETD / ETA spread: some past, some near future
            if scenario['status'] == OrderStatus.COMPLETED:
                etd = order_date + timedelta(days=45 + random.randint(-5, 5))
                eta = etd + timedelta(days=20 + random.randint(-3, 3))
                expected_delivery = eta
                actual_delivery = expected_delivery + timedelta(days=random.randint(-2, 2))
            elif scenario['status'] == OrderStatus.RUNNING:
                etd = today + timedelta(days=random.randint(5, 25))
                eta = etd + timedelta(days=15 + random.randint(-3, 5))
                expected_delivery = eta
                actual_delivery = None
            else:  # UPCOMING
                etd = today + timedelta(days=random.randint(20, 45))
                eta = etd + timedelta(days=20 + random.randint(0, 7))
                expected_delivery = eta
                actual_delivery = None

            quantity = Decimal('15000') + Decimal(str(idx * 1000))

            order = Order.objects.create(
                merchandiser=merch,
                customer_name=scenario['customer_name'],
                buyer_name=scenario['buyer_name'],
                base_style_number=f'LOCAL-{today.year}-{idx:03d}',
                fabric_type='Local Single Jersey Cotton',
                fabric_composition='100% Cotton',
                gsm=Decimal('180.0') + Decimal(str(idx * 5)),
                finish_type='Soft Local Finish',
                construction='Single Jersey',
                mill_name='Demo Local Mill',
                mill_price=Decimal('3.80') + Decimal(str(idx)) / Decimal('10'),
                prova_price=Decimal('4.50') + Decimal(str(idx)) / Decimal('10'),
                currency='BDT',
                quantity=quantity,
                unit='yards',
                order_date=order_date,
                expected_delivery_date=expected_delivery,
                etd=etd,
                eta=eta,
                actual_delivery_date=actual_delivery,
                status=scenario['status'],
                category=scenario['category'],
                current_stage=scenario['stage'],
                order_type=OrderType.LOCAL,
                notes=f"Seeded local order scenario: {scenario['label']}",
            )

            # Single style per order for clarity
            style = OrderStyle.objects.create(
                order=order,
                style_number=f"{order.base_style_number}-01",
                description=f"Local style for {scenario['label']}",
                fabric_type=order.fabric_type,
                fabric_composition=order.fabric_composition,
                gsm=order.gsm,
                finish_type=order.finish_type,
                construction=order.construction,
                etd=order.etd,
                eta=order.eta,
                submission_date=order.order_date,
            )

            # 2 colors per order to get multiple lines
            colors = [
                ('LNV', 'Local Navy'),
                ('LGRY', 'Local Grey'),
            ]

            for color_code, color_name in colors:
                color_qty = quantity / Decimal('2')
                color = OrderColor.objects.create(
                    style=style,
                    color_code=color_code,
                    color_name=color_name,
                    quantity=color_qty,
                    unit='yards',
                    etd=order.etd,
                    eta=order.eta,
                    submission_date=order.order_date,
                    mill_name=order.mill_name,
                    mill_price=order.mill_price,
                    prova_price=order.prova_price,
                    currency=order.currency,
                    approval_status={'labDip': 'approved'},
                )

                # For each color, create 2 lines with different production progress
                for line_idx in range(2):
                    line_qty = color_qty / Decimal('2')

                    # Base yarn dates around order_date
                    yarn_booked = order_date + timedelta(days=7 + line_idx)
                    yarn_received = yarn_booked + timedelta(days=5 + line_idx)

                    # Derive production dates from yarn_received
                    knit_start = yarn_received + timedelta(days=11)
                    knit_done = knit_start + timedelta(days=18)
                    dye_start = knit_start + timedelta(days=5)
                    dye_done = dye_start + timedelta(days=7)
                    cut_start = dye_done + timedelta(days=3)
                    cut_done = cut_start + timedelta(days=4)
                    sew_start = cut_done + timedelta(days=2)
                    sew_done = sew_start + timedelta(days=6)
                    ex_factory = sew_done + timedelta(days=3)

                    # Now selectively null-out later stages based on scenario progress
                    progress = scenario['progress']

                    yarn_booked_date = yarn_booked
                    yarn_received_date = yarn_received if progress in ['knitting', 'dyeing', 'sewing', 'ex_factory'] else (yarn_received if progress == 'yarn_only' else None)

                    knitting_start_date = knit_start if progress in ['knitting', 'dyeing', 'sewing', 'ex_factory'] else None
                    knitting_complete_date = knit_done if progress in ['dyeing', 'sewing', 'ex_factory'] else None

                    dyeing_start_date = dye_start if progress in ['dyeing', 'sewing', 'ex_factory'] else None
                    dyeing_complete_date = dye_done if progress in ['sewing', 'ex_factory'] else None

                    cutting_start_date = cut_start if progress in ['sewing', 'ex_factory'] else None
                    cutting_complete_date = cut_done if progress in ['sewing', 'ex_factory'] else None

                    sewing_input_date = sew_start if progress in ['sewing', 'ex_factory'] else None
                    sewing_finish_date = sew_done if progress == 'ex_factory' else None

                    packing_complete_date = ex_factory if progress == 'ex_factory' else None
                    final_inspection_date = ex_factory if progress == 'ex_factory' else None
                    ex_factory_date = ex_factory if progress == 'ex_factory' else None

                    # Determine line status roughly from overall order status
                    if scenario['status'] == OrderStatus.COMPLETED:
                        line_status = OrderStatus.COMPLETED
                    elif scenario['status'] == OrderStatus.RUNNING:
                        line_status = OrderStatus.RUNNING
                    else:
                        line_status = OrderStatus.UPCOMING

                    OrderLine.objects.create(
                        style=style,
                        color_code=color.color_code,
                        color_name=color.color_name,
                        quantity=line_qty,
                        unit='yards',
                        mill_name=order.mill_name,
                        mill_price=order.mill_price,
                        prova_price=order.prova_price,
                        commission=Decimal('0.30'),
                        currency=order.currency,
                        etd=order.etd,
                        eta=order.eta,
                        submission_date=order.order_date,
                        status=line_status,
                        # Local production fields (line-level)
                        yarn_required=line_qty,
                        yarn_booked_date=yarn_booked_date,
                        yarn_received_date=yarn_received_date,
                        pp_yards=line_qty / Decimal('10'),
                        fit_cum_pp_submit_date=yarn_booked_date + timedelta(days=2),
                        fit_cum_pp_comments_date=yarn_booked_date + timedelta(days=5),
                        knitting_start_date=knitting_start_date,
                        knitting_complete_date=knitting_complete_date,
                        dyeing_start_date=dyeing_start_date,
                        dyeing_complete_date=dyeing_complete_date,
                        bulk_size_set_date=cut_start if cutting_start_date else None,
                        cutting_start_date=cutting_start_date,
                        cutting_complete_date=cutting_complete_date,
                        print_send_date=None,
                        print_received_date=None,
                        sewing_input_date=sewing_input_date,
                        sewing_finish_date=sewing_finish_date,
                        packing_complete_date=packing_complete_date,
                        final_inspection_date=final_inspection_date,
                        ex_factory_date=ex_factory_date,
                    )

            created_orders += 1
            self.stdout.write(self.style.SUCCESS(f"  [OK] Created local order: {order.order_number} ({scenario['label']})"))

        self.stdout.write(self.style.SUCCESS(f"\n=== Created {created_orders} LOCAL orders with production data ==="))
