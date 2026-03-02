"""
ERR-2: Structured Error Responses

Custom exception handler that provides consistent, structured error responses
across all API endpoints.
"""

import logging
from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework import status

logger = logging.getLogger(__name__)


def custom_exception_handler(exc, context):
    """
    Custom exception handler that wraps DRF's default handler with structured responses.
    
    All error responses follow this format:
    {
        "error": true,
        "code": <http_status_code>,
        "message": <human_readable_message>,
        "details": <additional_error_details>
    }
    """
    # Call REST framework's default exception handler first
    response = exception_handler(exc, context)
    
    if response is not None:
        # Get view name for logging
        view = context.get('view', None)
        view_name = view.__class__.__name__ if view else 'Unknown'
        
        # Build structured error payload
        error_payload = {
            'error': True,
            'code': response.status_code,
            'message': _get_error_message(exc, response),
            'details': _get_error_details(response.data),
        }
        
        # Log the error with context
        logger.error(
            f"API Error in {view_name}: {error_payload['message']}",
            exc_info=True,
            extra={
                'status_code': response.status_code,
                'view': view_name,
                'error_details': error_payload['details'],
            }
        )
        
        response.data = error_payload
    else:
        # Handle unexpected exceptions that DRF didn't catch
        logger.exception(
            f"Unhandled exception: {exc}",
            extra={'exception_type': type(exc).__name__}
        )
    
    return response


def _get_error_message(exc, response):
    """Extract a human-readable error message."""
    # Try to get message from exception first
    if hasattr(exc, 'detail'):
        if isinstance(exc.detail, str):
            return exc.detail
        elif isinstance(exc.detail, dict) and 'detail' in exc.detail:
            return str(exc.detail['detail'])
    
    # Fall back to status code description
    status_messages = {
        400: "Bad request",
        401: "Authentication required",
        403: "Permission denied",
        404: "Resource not found",
        405: "Method not allowed",
        409: "Conflict",
        429: "Too many requests",
        500: "Internal server error",
    }
    return status_messages.get(response.status_code, str(exc))


def _get_error_details(data):
    """
    Format error details consistently.
    Handles both dict and list error formats from DRF.
    """
    if isinstance(data, dict):
        # Remove 'detail' if it's the only key to avoid duplication
        if list(data.keys()) == ['detail']:
            detail = data['detail']
            if isinstance(detail, list):
                return {'errors': detail}
            return {'detail': str(detail)}
        return data
    elif isinstance(data, list):
        return {'errors': data}
    else:
        return {'detail': str(data)}
