# Common utility functions

def format_response(data, success=True, message=None):
    """Format API response"""
    response = {
        "success": success,
        "data": data
    }
    if message:
        response["message"] = message
    return response

