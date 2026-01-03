# Test script to diagnose Cloudflare R2 connection issues
# Run from backend_django folder: venv/Scripts/python.exe scripts/test_r2_connection.py

import os
import sys

# Add the parent directory to path so we can import Django settings
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

import django
django.setup()

import boto3
from botocore.exceptions import ClientError, NoCredentialsError
from django.conf import settings


def test_r2_connection():
    print("=" * 60)
    print("CLOUDFLARE R2 DIAGNOSTIC TEST")
    print("=" * 60)
    
    # 1. Check if credentials are configured
    print("\n1. Checking R2 credentials configuration...")
    r2_access_key = getattr(settings, 'R2_ACCESS_KEY_ID', '')
    r2_secret_key = getattr(settings, 'R2_SECRET_ACCESS_KEY', '')
    r2_endpoint = getattr(settings, 'R2_ENDPOINT_URL', '')
    r2_bucket = getattr(settings, 'R2_BUCKET_NAME', '')
    
    print(f"   R2_ACCESS_KEY_ID: {'[OK] Set' if r2_access_key else '[X] NOT SET'}")
    print(f"   R2_SECRET_ACCESS_KEY: {'[OK] Set' if r2_secret_key else '[X] NOT SET'}")
    print(f"   R2_ENDPOINT_URL: {r2_endpoint if r2_endpoint else '[X] NOT SET'}")
    print(f"   R2_BUCKET_NAME: {r2_bucket if r2_bucket else '[X] NOT SET'}")
    
    if not all([r2_access_key, r2_secret_key, r2_endpoint, r2_bucket]):
        print("\n[ERROR] R2 credentials not fully configured!")
        return False
    
    # 2. Create S3 client
    print("\n2. Creating boto3 S3 client for R2...")
    try:
        client = boto3.client(
            's3',
            endpoint_url=r2_endpoint,
            aws_access_key_id=r2_access_key,
            aws_secret_access_key=r2_secret_key,
            region_name='auto',
        )
        print("   [OK] Client created successfully")
    except Exception as e:
        print(f"   [FAIL] Failed to create client: {e}")
        return False
    
    # 3. Test bucket access - list objects
    print(f"\n3. Testing bucket access (listing objects in '{r2_bucket}')...")
    try:
        response = client.list_objects_v2(Bucket=r2_bucket, MaxKeys=5)
        obj_count = response.get('KeyCount', 0)
        print(f"   [OK] Bucket accessible! Found {obj_count} objects")
        
        if obj_count > 0:
            print("   Sample objects:")
            for obj in response.get('Contents', [])[:3]:
                print(f"      - {obj['Key']}")
    except ClientError as e:
        error_code = e.response['Error']['Code']
        error_msg = e.response['Error']['Message']
        print(f"   [FAIL] Bucket access failed!")
        print(f"   Error Code: {error_code}")
        print(f"   Error Message: {error_msg}")
        
        if error_code == 'AccessDenied':
            print("\n   [!] DIAGNOSIS: Access Denied - Check if:")
            print("      - API token has correct permissions (Object Read/Write)")
            print("      - API token is scoped to this bucket")
            print("      - API token hasn't expired")
        elif error_code == 'NoSuchBucket':
            print(f"\n   [!] DIAGNOSIS: Bucket '{r2_bucket}' doesn't exist!")
        return False
    except NoCredentialsError:
        print("   [FAIL] No credentials found!")
        return False
    
    # 4. Test presigned URL generation
    print("\n4. Testing presigned URL generation...")
    try:
        # Try to get a presigned URL for the first object
        if response.get('Contents'):
            test_key = response['Contents'][0]['Key']
            presigned_url = client.generate_presigned_url(
                'get_object',
                Params={'Bucket': r2_bucket, 'Key': test_key},
                ExpiresIn=3600
            )
            print(f"   [OK] Presigned URL generated successfully!")
            print(f"   URL preview: {presigned_url[:100]}...")
        else:
            print("   [!] No objects in bucket to test presigned URL")
    except ClientError as e:
        print(f"   [FAIL] Presigned URL generation failed: {e}")
        return False
    
    # 5. Test downloading an object
    print("\n5. Testing object download (HeadObject)...")
    try:
        if response.get('Contents'):
            test_key = response['Contents'][0]['Key']
            head = client.head_object(Bucket=r2_bucket, Key=test_key)
            print(f"   [OK] Object accessible!")
            print(f"   Content-Type: {head.get('ContentType', 'unknown')}")
            print(f"   Size: {head.get('ContentLength', 0)} bytes")
    except ClientError as e:
        error_code = e.response['Error']['Code']
        print(f"   [FAIL] Object access failed: {error_code}")
        return False
    
    print("\n" + "=" * 60)
    print("[SUCCESS] ALL TESTS PASSED - R2 connection is working!")
    print("=" * 60)
    
    print("\n[INFO] If files still don't load in browser, check:")
    print("   1. CORS settings on the R2 bucket (must allow your frontend domain)")
    print("   2. Browser console for specific errors")
    print("   3. Network tab to see the actual URL being requested")
    
    return True


if __name__ == '__main__':
    test_r2_connection()
