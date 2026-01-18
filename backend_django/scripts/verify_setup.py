#!/usr/bin/env python
"""
Setup verification script for Django backend
Checks if all dependencies and configurations are correct

Usage: python verify_setup.py
"""

import os
import sys
import subprocess

# Color codes for terminal output
GREEN = '\033[92m'
RED = '\033[91m'
YELLOW = '\033[93m'
BLUE = '\033[94m'
RESET = '\033[0m'


def print_header(text):
    print(f"\n{BLUE}{'='*60}{RESET}")
    print(f"{BLUE}{text}{RESET}")
    print(f"{BLUE}{'='*60}{RESET}\n")


def print_success(text):
    print(f"{GREEN}✓{RESET} {text}")


def print_error(text):
    print(f"{RED}✗{RESET} {text}")


def print_warning(text):
    print(f"{YELLOW}⚠{RESET} {text}")


def check_python_version():
    """Check Python version"""
    version = sys.version_info
    if version.major == 3 and version.minor >= 11:
        print_success(f"Python version: {version.major}.{version.minor}.{version.micro}")
        return True
    else:
        print_error(f"Python version: {version.major}.{version.minor}.{version.micro} (3.11+ required)")
        return False


def check_virtual_environment():
    """Check if running in virtual environment"""
    if hasattr(sys, 'real_prefix') or (hasattr(sys, 'base_prefix') and sys.base_prefix != sys.prefix):
        print_success("Virtual environment: Active")
        return True
    else:
        print_warning("Virtual environment: Not detected (recommended)")
        return True  # Not critical


def check_django_installed():
    """Check if Django is installed"""
    try:
        import django
        print_success(f"Django: {django.get_version()} installed")
        return True
    except ImportError:
        print_error("Django: Not installed")
        return False


def check_required_packages():
    """Check if all required packages are installed"""
    required_packages = [
        'django',
        'djangorestframework',
        'djangorestframework_simplejwt',
        'psycopg2',
        'corsheaders',
        'google.cloud.storage',
        'environ',
        'django_filters',
        'drf_yasg',
    ]
    
    all_installed = True
    for package in required_packages:
        try:
            __import__(package.replace('.', '_').replace('-', '_'))
            print_success(f"Package '{package}': Installed")
        except ImportError:
            print_error(f"Package '{package}': Not installed")
            all_installed = False
    
    return all_installed


def check_env_file():
    """Check if .env file exists"""
    if os.path.exists('.env'):
        print_success(".env file: Exists")
        return True
    else:
        print_error(".env file: Not found")
        print_warning("  → Copy .env.example to .env and configure it")
        return False


def check_env_variables():
    """Check critical environment variables"""
    try:
        import environ
        env = environ.Env()
        
        critical_vars = ['SECRET_KEY', 'DATABASE_URL']
        optional_vars = ['GOOGLE_APPLICATION_CREDENTIALS', 'GCS_BUCKET_NAME']
        
        all_good = True
        for var in critical_vars:
            try:
                value = env(var)
                if value:
                    print_success(f"Environment variable '{var}': Set")
                else:
                    print_error(f"Environment variable '{var}': Empty")
                    all_good = False
            except:
                print_error(f"Environment variable '{var}': Not set")
                all_good = False
        
        for var in optional_vars:
            try:
                value = env(var)
                if value:
                    print_success(f"Environment variable '{var}': Set")
                else:
                    print_warning(f"Environment variable '{var}': Not set (optional)")
            except:
                print_warning(f"Environment variable '{var}': Not set (optional)")
        
        return all_good
    except:
        print_warning("Could not check environment variables")
        return True


def check_database_connection():
    """Check if can connect to database"""
    try:
        # Add Django project to path
        sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
        
        import django
        django.setup()
        
        from django.db import connection
        connection.ensure_connection()
        
        print_success("Database connection: Success")
        return True
    except Exception as e:
        print_error(f"Database connection: Failed")
        print(f"  {RED}Error: {str(e)}{RESET}")
        return False


def check_migrations():
    """Check if migrations are up to date"""
    try:
        from django.core.management import call_command
        from io import StringIO
        
        out = StringIO()
        call_command('showmigrations', '--list', stdout=out, no_color=True)
        output = out.getvalue()
        
        if '[ ]' in output:
            print_warning("Migrations: Not all applied")
            print_warning("  → Run: python manage.py migrate")
            return False
        else:
            print_success("Migrations: All applied")
            return True
    except:
        print_warning("Migrations: Could not check")
        return True


def check_staticfiles():
    """Check if static files directory exists"""
    if os.path.exists('staticfiles'):
        print_success("Static files directory: Exists")
        return True
    else:
        print_warning("Static files directory: Not found")
        print_warning("  → Run: python manage.py collectstatic")
        return True  # Not critical for development


def main():
    """Run all checks"""
    print_header("Django Backend Setup Verification")
    
    checks = [
        ("Python Version", check_python_version),
        ("Virtual Environment", check_virtual_environment),
        ("Django Installation", check_django_installed),
        ("Required Packages", check_required_packages),
        (".env File", check_env_file),
        ("Environment Variables", check_env_variables),
        ("Database Connection", check_database_connection),
        ("Migrations", check_migrations),
        ("Static Files", check_staticfiles),
    ]
    
    results = []
    for name, check_func in checks:
        try:
            result = check_func()
            results.append((name, result))
        except Exception as e:
            print_error(f"{name}: Check failed with error")
            print(f"  {RED}{str(e)}{RESET}")
            results.append((name, False))
    
    # Summary
    print_header("Verification Summary")
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    print(f"Checks passed: {passed}/{total}")
    
    if passed == total:
        print(f"\n{GREEN}✓ All checks passed! Your setup is ready.{RESET}")
        print(f"\n{BLUE}Next steps:{RESET}")
        print("  1. Run: python manage.py runserver")
        print("  2. Visit: http://localhost:8000/api/docs/")
        print("  3. Test authentication endpoints")
        return 0
    else:
        print(f"\n{YELLOW}⚠ Some checks failed. Review the errors above.{RESET}")
        print(f"\n{BLUE}Common fixes:{RESET}")
        print("  1. Activate virtual environment: venv\\Scripts\\activate")
        print("  2. Install dependencies: pip install -r requirements.txt")
        print("  3. Copy .env.example to .env and configure")
        print("  4. Create database: createdb provabook_django")
        print("  5. Run migrations: python manage.py migrate")
        return 1


if __name__ == '__main__':
    sys.exit(main())
