"""
Utility functions
"""
import os
import uuid
import boto3
from botocore.exceptions import ClientError
from django.conf import settings


def get_r2_client():
    """
    Get a boto3 S3 client configured for Cloudflare R2
    
    Returns:
        boto3.client: S3 client for R2
    """
    if not settings.R2_ACCESS_KEY_ID or not settings.R2_SECRET_ACCESS_KEY or not settings.R2_ENDPOINT_URL:
        raise ValueError("Cloudflare R2 credentials not configured")
    
    return boto3.client(
        's3',
        endpoint_url=settings.R2_ENDPOINT_URL,
        aws_access_key_id=settings.R2_ACCESS_KEY_ID,
        aws_secret_access_key=settings.R2_SECRET_ACCESS_KEY,
        region_name='auto',
    )


def upload_file_to_r2(file, folder='documents'):
    """
    Upload a file to Cloudflare R2
    
    Args:
        file: The file object to upload
        folder: The folder path in the bucket
        
    Returns:
        str: The key (path) of the uploaded file in the bucket
    """
    client = get_r2_client()
    
    # Generate unique filename
    ext = os.path.splitext(file.name)[1]
    unique_filename = f"{uuid.uuid4()}{ext}"
    key = f"{folder}/{unique_filename}"
    
    # Upload file
    client.upload_fileobj(
        file,
        settings.R2_BUCKET_NAME,
        key,
        ExtraArgs={'ContentType': getattr(file, 'content_type', 'application/octet-stream')}
    )
    
    return key


def delete_file_from_r2(file_path):
    """
    Delete a file from Cloudflare R2
    
    Args:
        file_path: The key (path) to the file in the bucket
    """
    client = get_r2_client()
    
    try:
        client.delete_object(
            Bucket=settings.R2_BUCKET_NAME,
            Key=file_path
        )
    except ClientError as e:
        # Log error but don't raise - file might already be deleted
        print(f"Warning: Could not delete file from R2: {e}")


def get_r2_file_url(file_path, expiration=3600):
    """
    Generate a presigned URL for accessing a file in R2
    
    Args:
        file_path: The key (path) to the file in the bucket
        expiration: URL expiration time in seconds (default 1 hour)
        
    Returns:
        str: Presigned URL for the file
    """
    client = get_r2_client()
    
    try:
        url = client.generate_presigned_url(
            'get_object',
            Params={
                'Bucket': settings.R2_BUCKET_NAME,
                'Key': file_path
            },
            ExpiresIn=expiration
        )
        return url
    except ClientError as e:
        print(f"Error generating presigned URL: {e}")
        return None


def is_r2_storage_enabled():
    """
    Check if Cloudflare R2 storage is configured and enabled.
    
    Returns:
        bool: True if R2 is configured, False otherwise
    """
    return bool(
        getattr(settings, 'R2_ACCESS_KEY_ID', '') and 
        getattr(settings, 'R2_SECRET_ACCESS_KEY', '') and 
        getattr(settings, 'R2_ENDPOINT_URL', '')
    )


def get_file_presigned_url(file_field, expiration=3600):
    """
    Get a presigned URL for a file stored in R2, or return the direct URL for local storage.
    
    For R2 storage (production), generates a presigned URL that provides temporary
    authenticated access to private bucket files.
    For local storage (development), returns the file's direct URL.
    
    Args:
        file_field: Django FileField or ImageField instance
        expiration: URL expiration time in seconds (default 1 hour)
        
    Returns:
        str: Presigned URL for R2, or direct URL for local storage
        None: If file_field is empty
    """
    if not file_field:
        return None
    
    # Check if R2 storage is enabled
    if is_r2_storage_enabled():
        # Get the file path (key) from the file field
        file_path = file_field.name
        return get_r2_file_url(file_path, expiration)
    
    # For local storage, return the direct URL
    return file_field.url


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
