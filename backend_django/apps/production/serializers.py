"""Production app serializers"""
from rest_framework import serializers

from .models import ProductionMetric


class ProductionMetricSerializer(serializers.ModelSerializer):
    """Serializer for ProductionMetric covering all fields"""

    class Meta:
        model = ProductionMetric
        fields = '__all__'
