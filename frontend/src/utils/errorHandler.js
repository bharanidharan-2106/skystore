export const handleApiError = (error) => {
    console.error('API Error:', error);
    
    if (error.response) {
        // Server responded with error status
        const status = error.response.status;
        const message = error.response.data?.error || error.response.data?.message;
        
        switch (status) {
            case 400:
                return message || 'Bad request. Please check your input.';
            case 401:
                return 'Session expired. Please login again.';
            case 403:
                return 'Access denied. You do not have permission.';
            case 404:
                return message || 'Resource not found.';
            case 409:
                return message || 'Conflict occurred.';
            case 500:
                return 'Server error. Please try again later.';
            default:
                return message || `Error ${status}: Something went wrong.`;
        }
    } else if (error.request) {
        // Network error
        return 'Network error. Please check your internet connection.';
    } else {
        // Other errors
        return error.message || 'An unexpected error occurred.';
    }
};

export const showError = (error, customMessage = null) => {
    const message = customMessage || handleApiError(error);
    alert(`❌ ${message}`);
};

export const showSuccess = (message) => {
    alert(`✅ ${message}`);
};