from django.contrib import admin
from .models import ProformaInvoice, LetterOfCredit


@admin.register(ProformaInvoice)
class ProformaInvoiceAdmin(admin.ModelAdmin):
    list_display = ['pi_number', 'version', 'order', 'amount', 'currency', 'status', 'issue_date', 'created_at']
    list_filter = ['status', 'currency', 'created_at']
    search_fields = ['pi_number', 'order__order_number', 'order__customer_name']
    readonly_fields = ['pi_number', 'created_by', 'created_at', 'updated_at']


@admin.register(LetterOfCredit)
class LetterOfCreditAdmin(admin.ModelAdmin):
    list_display = ['lc_number', 'order', 'amount', 'currency', 'status', 'issue_date', 'expiry_date', 'created_at']
    list_filter = ['status', 'currency', 'created_at']
    search_fields = ['lc_number', 'order__order_number', 'order__customer_name', 'issuing_bank']
    readonly_fields = ['lc_number', 'created_by', 'created_at', 'updated_at']
