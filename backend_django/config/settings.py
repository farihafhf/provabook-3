"""
Django settings for Provabook project.
"""

import os
from pathlib import Path
from datetime import timedelta
import environ

# Build paths inside the project
BASE_DIR = Path(__file__).resolve().parent.parent

# Initialize environment variables
env = environ.Env(
    DEBUG=(bool, False)
)

# Read .env file
environ.Env.read_env(os.path.join(BASE_DIR, '.env'))

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = env('SECRET_KEY', default='django-insecure-temporary-key')

# SECURITY WARNING: don't run with debug turned on in production!
# Default to False for production safety - set DEBUG=True explicitly in development
DEBUG = env.bool('DEBUG', default=False)

ALLOWED_HOSTS = env.list('ALLOWED_HOSTS', default=['localhost', '127.0.0.1', '0.0.0.0'])

# URL Configuration
# Automatically redirect URLs without trailing slashes to ones with trailing slashes
# This ensures consistent API behavior regardless of whether frontend includes the slash
APPEND_SLASH = True

# Application definition
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    
    # Third-party apps
    'rest_framework',
    'rest_framework_simplejwt',
    'corsheaders',
    'django_filters',
    'drf_yasg',
    'storages',
    
    # Local apps
    'apps.authentication',
    'apps.orders',
    'apps.core',
    'apps.samples',
    'apps.financials',
    # TODO: Uncomment as you create these apps
    'apps.production',
    # 'apps.incidents',
    'apps.shipments',
    # 'apps.notifications',
    # 'apps.documents',
    # 'apps.dashboard',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',  # Serve static files
    'corsheaders.middleware.CorsMiddleware',  # CORS - must be before CommonMiddleware
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'config.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [os.path.join(BASE_DIR, 'templates')],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'config.wsgi.application'

# Database
# https://docs.djangoproject.com/en/5.0/ref/settings/#databases

DATABASES = {
    'default': env.db('DATABASE_URL', default='postgresql://postgres:password@localhost:5432/provabook_django')
}

# CRITICAL: Required for DigitalOcean Managed PostgreSQL connection pooler (pgBouncer)
# When using connection pooling in transaction mode, server-side cursors must be disabled
# Without this, you will get 504 timeouts and cursor errors
DATABASES['default']['DISABLE_SERVER_SIDE_CURSORS'] = True

# Set connection timeout and options for production reliability
DATABASES['default']['CONN_MAX_AGE'] = 60  # Keep connections alive for 60 seconds
DATABASES['default']['CONN_HEALTH_CHECKS'] = True  # Check connection health before use

# Custom User Model
AUTH_USER_MODEL = 'authentication.User'

# Password validation
# https://docs.djangoproject.com/en/5.0/ref/settings/#auth-password-validators

AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
        'OPTIONS': {
            'min_length': 8,
        }
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]

# Internationalization
# https://docs.djangoproject.com/en/5.0/topics/i18n/

LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'Asia/Dhaka'  # Bangladesh timezone
USE_I18N = True
USE_TZ = True

# Disable trailing slash requirement for REST API
APPEND_SLASH = False

# Static files (CSS, JavaScript, Images)
# https://docs.djangoproject.com/en/5.0/howto/static-files/

STATIC_URL = 'static/'
STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')

# Media files
MEDIA_URL = 'media/'
MEDIA_ROOT = os.path.join(BASE_DIR, 'media')

# Default storages configuration (used when R2 is not configured)
# This will be overwritten below if R2 credentials are provided
STORAGES = {
    "default": {
        "BACKEND": "django.core.files.storage.FileSystemStorage",
    },
    "staticfiles": {
        "BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage",
    },
}

# Default primary key field type
# https://docs.djangoproject.com/en/5.0/ref/settings/#default-auto-field

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# REST Framework Configuration
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
    # Don't set default permission - let views define their own
    # This allows login/register to be public while other endpoints require auth
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 100,
    'DEFAULT_FILTER_BACKENDS': (
        'django_filters.rest_framework.DjangoFilterBackend',
        'rest_framework.filters.SearchFilter',
        'rest_framework.filters.OrderingFilter',
    ),
    'DEFAULT_RENDERER_CLASSES': (
        'rest_framework.renderers.JSONRenderer',
        'rest_framework.renderers.BrowsableAPIRenderer',
    ),
    'EXCEPTION_HANDLER': 'apps.core.exceptions.custom_exception_handler',
    'DATETIME_FORMAT': '%Y-%m-%dT%H:%M:%S.%f%z',  # Use actual timezone offset instead of hardcoded 'Z'
    'DATE_FORMAT': '%Y-%m-%d',
    'DEFAULT_ROUTER_CLASS': 'rest_framework.routers.DefaultRouter',
    'DEFAULT_SCHEMA_CLASS': 'rest_framework.schemas.AutoSchema',
}

# JWT Configuration
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=env.int('ACCESS_TOKEN_LIFETIME_MINUTES', default=60)),
    'REFRESH_TOKEN_LIFETIME': timedelta(minutes=env.int('REFRESH_TOKEN_LIFETIME_MINUTES', default=1440)),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
    'UPDATE_LAST_LOGIN': True,
    'ALGORITHM': 'HS256',
    'SIGNING_KEY': SECRET_KEY,
    'AUTH_HEADER_TYPES': ('Bearer',),
    'AUTH_HEADER_NAME': 'HTTP_AUTHORIZATION',
    'USER_ID_FIELD': 'id',
    'USER_ID_CLAIM': 'user_id',
    'AUTH_TOKEN_CLASSES': ('rest_framework_simplejwt.tokens.AccessToken',),
    'TOKEN_TYPE_CLAIM': 'token_type',
}

# CORS Configuration
CORS_ALLOWED_ORIGINS = env.list(
    'CORS_ALLOWED_ORIGINS',
    default=['http://localhost:3001', 'http://127.0.0.1:3001']
)
CORS_ALLOW_CREDENTIALS = True
CORS_ALLOW_HEADERS = [
    'accept',
    'accept-encoding',
    'authorization',
    'content-type',
    'dnt',
    'origin',
    'user-agent',
    'x-csrftoken',
    'x-requested-with',
]

# Cloudflare R2 Storage Configuration (S3-compatible)
R2_ACCESS_KEY_ID = env('R2_ACCESS_KEY_ID', default='')
R2_SECRET_ACCESS_KEY = env('R2_SECRET_ACCESS_KEY', default='')
R2_ENDPOINT_URL = env('R2_ENDPOINT_URL', default='')
R2_BUCKET_NAME = env('R2_BUCKET_NAME', default='provabook-documents')

# Django Storages - S3 Backend for Cloudflare R2
if R2_ACCESS_KEY_ID and R2_SECRET_ACCESS_KEY and R2_ENDPOINT_URL:
    # Use R2 for media file storage
    # IMPORTANT: Cloudflare R2 does NOT support ACLs, so default_acl must be None
    STORAGES = {
        "default": {
            "BACKEND": "storages.backends.s3.S3Storage",
            "OPTIONS": {
                "access_key": R2_ACCESS_KEY_ID,
                "secret_key": R2_SECRET_ACCESS_KEY,
                "bucket_name": R2_BUCKET_NAME,
                "endpoint_url": R2_ENDPOINT_URL,
                "default_acl": None,  # R2 doesn't support ACLs
                "file_overwrite": False,
                "region_name": "auto",
                "signature_version": "s3v4",
                "object_parameters": {
                    "CacheControl": "max-age=86400",  # 1 day cache
                },
            },
        },
        "staticfiles": {
            "BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage",
        },
    }
    # Custom domain for R2 public access (optional - set if you have a custom domain)
    R2_CUSTOM_DOMAIN = env('R2_CUSTOM_DOMAIN', default='')
    if R2_CUSTOM_DOMAIN:
        MEDIA_URL = f'https://{R2_CUSTOM_DOMAIN}/'
    else:
        # For private R2 buckets, use signed URLs (handled by django-storages)
        MEDIA_URL = f'{R2_ENDPOINT_URL}/{R2_BUCKET_NAME}/'

# File Upload Settings
MAX_UPLOAD_SIZE = env.int('MAX_UPLOAD_SIZE', default=10485760)  # 10MB
ALLOWED_FILE_EXTENSIONS = env.list(
    'ALLOWED_FILE_EXTENSIONS',
    default=['.pdf', '.jpg', '.jpeg', '.png', '.doc', '.docx', '.xls', '.xlsx']
)

# Logging Configuration
# For production (DigitalOcean App Platform), only use console logging
# File logging doesn't work reliably on ephemeral container filesystems
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '{levelname} {asctime} {module} {message}',
            'style': '{',
        },
    },
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
            'formatter': 'verbose',
        },
    },
    'root': {
        'handlers': ['console'],
        'level': 'INFO',
    },
    'loggers': {
        'django': {
            'handlers': ['console'],
            'level': 'INFO',
            'propagate': False,
        },
        'django.db.backends': {
            'handlers': ['console'],
            'level': 'WARNING',  # Reduce DB query noise in production
            'propagate': False,
        },
    },
}

# Swagger/OpenAPI Configuration
SWAGGER_SETTINGS = {
    'SECURITY_DEFINITIONS': {
        'Bearer': {
            'type': 'apiKey',
            'name': 'Authorization',
            'in': 'header'
        }
    },
    'USE_SESSION_AUTH': False,
    'JSON_EDITOR': True,
}
