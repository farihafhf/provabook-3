"""Production app views"""
from django.db.models import Sum
from django.shortcuts import get_object_or_404
from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import ProductionMetric
from .serializers import ProductionMetricSerializer
from apps.core.permissions import IsMerchandiser
from apps.orders.models import Order


class ProductionMetricViewSet(viewsets.ModelViewSet):
    """CRUD viewset for ProductionMetric"""

    queryset = ProductionMetric.objects.select_related('order').all()
    serializer_class = ProductionMetricSerializer
    permission_classes = [permissions.IsAuthenticated, IsMerchandiser]
    pagination_class = None

    def get_queryset(self):
        """Limit data to the logged-in merchandiser and optionally filter by order"""
        user = self.request.user
        queryset = self.queryset
        if user.role == 'merchandiser':
            queryset = queryset.filter(order__merchandiser=user)

        order_id = self.request.query_params.get('order')
        if order_id:
            queryset = queryset.filter(order_id=order_id)

        return queryset


class ProductionSummaryView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsMerchandiser]

    def get(self, request, order_id):
        user = request.user
        order_qs = Order.objects.all()
        if getattr(user, 'role', None) == 'merchandiser':
            order_qs = order_qs.filter(merchandiser=user)
        order = get_object_or_404(order_qs, pk=order_id)

        metrics_qs = ProductionMetric.objects.filter(order=order)
        aggregates = metrics_qs.aggregate(
            total_knitted=Sum('knitted_quantity'),
            total_dyed=Sum('dyed_quantity'),
            total_finished=Sum('finished_quantity'),
        )

        target = order.quantity or 0
        total_knitted = aggregates['total_knitted'] or 0
        total_dyed = aggregates['total_dyed'] or 0
        total_finished = aggregates['total_finished'] or 0

        def calc_percent(total):
            if not target:
                return 0
            return (total / target) * 100

        data = {
            "order_id": str(order.id),
            "target": target,
            "metrics": {
                "knitting": {
                    "total": total_knitted,
                    "percent": calc_percent(total_knitted),
                },
                "dyeing": {
                    "total": total_dyed,
                    "percent": calc_percent(total_dyed),
                },
                "finishing": {
                    "total": total_finished,
                    "percent": calc_percent(total_finished),
                },
            },
        }
        return Response(data, status=status.HTTP_200_OK)
