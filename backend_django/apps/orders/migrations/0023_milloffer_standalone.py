# Generated manually - standalone migration for MillOffer model
import django.db.models.deletion
import uuid
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('orders', '0022_alter_orderline_options_and_more'),
    ]

    operations = [
        migrations.CreateModel(
            name='MillOffer',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('mill_name', models.CharField(help_text='Name of the mill offering the price', max_length=255)),
                ('price', models.DecimalField(decimal_places=2, help_text='Price per unit offered by the mill', max_digits=10)),
                ('currency', models.CharField(default='USD', help_text='Currency of the price', max_length=10)),
                ('notes', models.TextField(blank=True, help_text='Additional notes about this offer', null=True)),
                ('order_line', models.ForeignKey(help_text='Order line this mill offer belongs to', on_delete=django.db.models.deletion.CASCADE, related_name='mill_offers', to='orders.orderline')),
            ],
            options={
                'verbose_name': 'Mill Offer',
                'verbose_name_plural': 'Mill Offers',
                'db_table': 'mill_offers',
                'ordering': ['mill_name'],
            },
        ),
    ]
