import { toast } from 'sonner'

/**
 * Error types for categorizing errors
 */
export const ErrorType = {
    VALIDATION: 'validation',
    AUTHENTICATION: 'authentication',
    NETWORK: 'network',
    NOT_FOUND: 'not_found',
    FORBIDDEN: 'forbidden',
    SERVER: 'server',
    UNKNOWN: 'unknown',
}

/**
 * Error codes from backend
 */
export const BackendErrorCode = {
    INTERNAL_ERROR: 10001,
    INVALID_PARAMS: 10002,
    UNAUTHORIZED: 10003,
    NOT_FOUND: 10004,
    ALREADY_EXISTS: 10005,
}

const backendErrorMessages = {
    [BackendErrorCode.INTERNAL_ERROR]: '服务器内部错误，请稍后再试',
    [BackendErrorCode.INVALID_PARAMS]: '参数请求错误',
    [BackendErrorCode.UNAUTHORIZED]: '用户名或密码错误',
    [BackendErrorCode.NOT_FOUND]: '请求的资源未找到',
    [BackendErrorCode.ALREADY_EXISTS]: '资源已存在',
}

/**
 * Extract error message from various error formats
 */
const extractErrorMessage = (error) => {
    // Check if it's an axios error
    if (error.response) {
        const { data, status } = error.response

        // Check for backend specific error codes first
        if (data?.code && backendErrorMessages[data.code]) {
            return backendErrorMessages[data.code]
        }

        // Check for custom error message in response
        if (data?.message) {
            return data.message
        }

        // Handle validation errors
        if (data?.details && Array.isArray(data.details)) {
            return data.details.map(err => err.message).join(', ')
        }

        // Default messages based on status code
        switch (status) {
            case 400:
                return 'Invalid request. Please check your input.'
            case 401:
                return 'Please log in to continue.'
            case 403:
                return 'You don\'t have permission to perform this action.'
            case 404:
                return 'The requested resource was not found.'
            case 409:
                return 'This action conflicts with existing data.'
            case 413:
                return 'The file is too large.'
            case 422:
                return 'Invalid data provided.'
            case 500:
                return 'Server error. Please try again later.'
            case 503:
                return 'Service temporarily unavailable.'
            default:
                return 'An error occurred. Please try again.'
        }
    }

    // Check for network errors
    if (error.request) {
        return 'Network error. Please check your connection.'
    }

    // Check for error message property
    if (error.message) {
        return error.message
    }

    // Fallback
    return 'An unexpected error occurred.'
}

/**
 * Determine error type from error object
 */
const getErrorType = (error) => {
    if (!error.response) {
        return ErrorType.NETWORK
    }

    const status = error.response.status

    if (status === 401) return ErrorType.AUTHENTICATION
    if (status === 403) return ErrorType.FORBIDDEN
    if (status === 404) return ErrorType.NOT_FOUND
    if (status === 400 || status === 422) return ErrorType.VALIDATION
    if (status >= 500) return ErrorType.SERVER

    return ErrorType.UNKNOWN
}

/**
 * Show error toast notification
 */
export const showError = (error, customMessage = null) => {
    const message = customMessage || extractErrorMessage(error)
    const errorType = getErrorType(error)

    toast.error(message, {
        duration: 5000,
        dismissible: true,
        className: 'error-toast',
    })

    // Log error for debugging
    console.error(`[${errorType}]:`, error)

    return { message, type: errorType }
}

/**
 * Show success toast notification
 */
export const showSuccess = (message, options = {}) => {
    toast.success(message, {
        duration: 3000,
        dismissible: true,
        ...options,
    })
}

/**
 * Show info toast notification
 */
export const showInfo = (message, options = {}) => {
    toast.info(message, {
        duration: 4000,
        dismissible: true,
        ...options,
    })
}

/**
 * Show warning toast notification
 */
export const showWarning = (message, options = {}) => {
    toast.warning(message, {
        duration: 4000,
        dismissible: true,
        ...options,
    })
}

/**
 * Show loading toast
 */
export const showLoading = (message = 'Loading...') => {
    return toast.loading(message)
}

/**
 * Dismiss a specific toast
 */
export const dismissToast = (toastId) => {
    toast.dismiss(toastId)
}

/**
 * Handle API error with retry option
 */
export const showErrorWithRetry = (error, onRetry, customMessage = null) => {
    const message = customMessage || extractErrorMessage(error)

    toast.error(message, {
        duration: 6000,
        action: {
            label: 'Retry',
            onClick: () => {
                onRetry()
            },
        },
    })
}

/**
 * Show validation errors (field-specific)
 */
export const showValidationErrors = (errors) => {
    if (Array.isArray(errors)) {
        errors.forEach(err => {
            toast.error(`${err.field}: ${err.message}`, {
                duration: 5000,
            })
        })
    } else if (typeof errors === 'object') {
        Object.entries(errors).forEach(([field, message]) => {
            toast.error(`${field}: ${message}`, {
                duration: 5000,
            })
        })
    } else {
        toast.error(errors)
    }
}

export default {
    error: showError,
    success: showSuccess,
    info: showInfo,
    warning: showWarning,
    loading: showLoading,
    dismiss: dismissToast,
    errorWithRetry: showErrorWithRetry,
    validationErrors: showValidationErrors,
}
