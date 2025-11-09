"""
Utility functions
"""
import os
from google.cloud import storage
from django.conf import settings


def upload_file_to_gcs(file, folder='documents'):
    """
    Upload a file to Google Cloud Storage
    
    Args:
        file: The file object to upload
        folder: The folder path in the bucket
        
    Returns:
        str: Public URL of the uploaded file
    """
    if not settings.GCS_CREDENTIALS_PATH or not os.path.exists(settings.GCS_CREDENTIALS_PATH):
        raise ValueError("Google Cloud Storage credentials not configured")
    
    # Initialize GCS client
    storage_client = storage.Client.from_service_account_json(settings.GCS_CREDENTIALS_PATH)
    bucket = storage_client.bucket(settings.GCS_BUCKET_NAME)
    
    # Generate unique filename
    filename = f"{folder}/{file.name}"
    blob = bucket.blob(filename)
    
    # Upload file
    blob.upload_from_file(file, content_type=file.content_type)
    
    # Make the file publicly accessible (optional)
    # blob.make_public()
    
    # Return the public URL
    return blob.public_url


def delete_file_from_gcs(file_path):
    """
    Delete a file from Google Cloud Storage
    
    Args:
        file_path: The path to the file in the bucket
    """
    if not settings.GCS_CREDENTIALS_PATH or not os.path.exists(settings.GCS_CREDENTIALS_PATH):
        raise ValueError("Google Cloud Storage credentials not configured")
    
    storage_client = storage.Client.from_service_account_json(settings.GCS_CREDENTIALS_PATH)
    bucket = storage_client.bucket(settings.GCS_BUCKET_NAME)
    blob = bucket.blob(file_path)
    blob.delete()


def validate_file(file):
    """
    Validate uploaded file
    
    Args:
        file: The file object to validate
        
    Returns:
        tuple: (is_valid, error_message)
    """
    # Check file size
    if file.size > settings.MAX_UPLOAD_SIZE:
        return False, f"File size exceeds maximum allowed size of {settings.MAX_UPLOAD_SIZE} bytes"
    
    # Check file extension
    file_ext = os.path.splitext(file.name)[1].lower()
    if file_ext not in settings.ALLOWED_FILE_EXTENSIONS:
        return False, f"File type not allowed. Allowed types: {', '.join(settings.ALLOWED_FILE_EXTENSIONS)}"
    
    return True, None


def generate_order_number(prefix='PB'):
    """
    Generate unique order number
    Format: PB-YYYYMMDD-XXXX
    """
    from datetime import datetime
    from apps.orders.models import Order
    
    today = datetime.now()
    date_str = today.strftime('%Y%m%d')
    
    # Get last order number for today
    last_order = Order.objects.filter(
        order_number__startswith=f'{prefix}-{date_str}'
    ).order_by('-order_number').first()
    
    if last_order:
        # Extract sequence number and increment
        last_sequence = int(last_order.order_number.split('-')[-1])
        sequence = last_sequence + 1
    else:
        sequence = 1
    
    return f'{prefix}-{date_str}-{sequence:04d}'
