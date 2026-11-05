class ApiError(Exception):
    """Raised anywhere in the backend to return a clean JSON error."""

    def __init__(self, message, status=400, code="bad_request"):
        super().__init__(message)
        self.message = message
        self.status = status
        self.code = code
