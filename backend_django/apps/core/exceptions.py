"""
Custom exception handlers
"""
from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework import status


def custom_exception_handler(exc, context):
    """
    Custom exception handler that provides consistent error responses
    """
    # Call REST framework's default exception handler first
    response = exception_handler(exc, context)

    if response is not None:
        # Customize the response format
        custom_response_data = {
            'success': False,
            'message': None,
            'errors': {}
        }

        # Handle different types of errors
        if isinstance(response.data, dict):
            if 'detail' in response.data:
                custom_response_data['message'] = response.data['detail']
            else:
                custom_response_data['errors'] = response.data
                # Try to extract a general message
                if len(response.data) > 0:
                    first_key = list(response.data.keys())[0]
                    if isinstance(response.data[first_key], list):
                        custom_response_data['message'] = response.data[first_key][0]
                    else:
                        custom_response_data['message'] = str(response.data[first_key])
        elif isinstance(response.data, list):
            custom_response_data['message'] = response.data[0] if response.data else 'An error occurred'
        else:
            custom_response_data['message'] = str(response.data)

        response.data = custom_response_data

    return response
