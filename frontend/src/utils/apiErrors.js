export function getApiErrorMessage(error, fallbackMessage = 'Something went wrong. Please try again.') {
  if (!error) {
    return fallbackMessage;
  }

  if (error.code === 'ECONNABORTED') {
    return 'Request timed out. Please try again.';
  }

  if (!error.response) {
    return 'Server is not reachable. Please make sure the backend is running.';
  }

  const status = error.response.status;
  const data = error.response.data || {};
  const violationMessage = formatViolations(data.violations);
  if((status === 403 || data.message==="Please verify your email before logging in.")){
    return "We've sent a verification email. Please verify your email to continue."
  }
  if ((status === 400 || status === 422) && violationMessage) {
    return violationMessage;
  }
  if (status === 401 || data.message==="Invalid email or password"){
    return "Invalid Credentials - Invalid email or password"
  }
  if (status === 401 || status === 403) {
    return 'Your session has expired. Please login again.';
  }
  if (status === 404) {
    return data.message || 'Requested data was not found.';
  }
  if (status === 409) {
    return data.message || data.error || 'This action conflicts with existing data.';
  }
  if (status >= 500) {
    return 'Something went wrong. Please try again later.';
  }
  if (data.message) {
    return toFriendlyMessage(data.message);
  }
  if (data.error && !looksTechnical(data.error)) {
    return toFriendlyMessage(data.error);
  }
  return fallbackMessage;
}

export function isAuthError(error) {
  return error?.response?.status === 401 || error?.response?.status === 403;
}

function formatViolations(violations) {
  if (!Array.isArray(violations) || violations.length === 0) {
    return '';
  }
  return violations
    .map((item) => {
      if (typeof item === 'string') {
        return item;
      }
      return toFriendlyMessage(item.message || item.field || '');
    })
    .filter(Boolean)
    .join('\n');
}

function looksTechnical(value) {
  return /exception|stack|trace|java\.|org\.springframework/i.test(String(value));
}

function toFriendlyMessage(value) {
  const message = String(value || '').trim();
  if (!message) {
    return '';
  }
  if (/must be a date in the present or in the future/i.test(message)) {
    return 'Please select today or a future journey date.';
  }
  if (/must not be blank|must not be empty|required/i.test(message)) {
    return 'Please fill all required fields.';
  }
  if (looksTechnical(message)) {
    return '';
  }
  return message;
}
