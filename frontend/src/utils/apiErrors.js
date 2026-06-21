export function getApiErrorMessage(error, fallbackMessage = 'Something went wrong. Please try again.') {
  if (!error) return fallbackMessage;
  if (error.code === 'ECONNABORTED') return 'Request timed out. Please try again.';
  if (!error.response) return 'Server is not reachable. Please make sure the backend is running.';

  const status = error.response.status;
  const data = normalizeErrorData(error.response.data);
  const violationMessage = formatViolations(data.violations);

  if (data.message === 'Please verify your email before logging in.') {
    return "We've sent a verification email. Please verify your email to continue.";
  }
  if ((status === 400 || status === 422) && violationMessage) return violationMessage;
  if (status === 401 && data.message === 'Invalid email or password') {
    return 'Invalid credentials. Please check your email and password.';
  }
  if (status === 401) return 'Your session has expired. Please login again.';
  if (status === 403) return 'You do not have permission to perform this action.';
  if (status === 404) return toFriendlyMessage(data.message) || 'Requested data was not found.';
  if (status === 409) return toFriendlyMessage(data.message || data.error) || 'This action conflicts with existing data.';
  if (status >= 500) return 'Something went wrong on the server. Please try again later.';

  return toFriendlyMessage(data.message || data.error) || fallbackMessage;
}

export function isAuthError(error) {
  return error?.response?.status === 401 || error?.response?.status === 403;
}

function normalizeErrorData(data) {
  if (!data) return {};
  if (typeof data === 'string') return { message: data };
  if (typeof data === 'object') return data;
  return { message: String(data) };
}

function formatViolations(violations) {
  if (!Array.isArray(violations) || violations.length === 0) return '';
  return violations
    .map((item) => (typeof item === 'string' ? item : toFriendlyMessage(item?.message || item?.field || '')))
    .filter(Boolean)
    .join('\n');
}

function looksTechnical(value) {
  return /exception|stack|trace|java\.|org\.springframework|\[object Object\]/i.test(String(value));
}

function toFriendlyMessage(value) {
  const message = String(value || '').trim();
  if (!message || looksTechnical(message)) return '';
  if (/must be a date in the present or in the future/i.test(message)) return 'Please select today or a future journey date.';
  if (/must not be blank|must not be empty|required/i.test(message)) return 'Please fill all required fields.';
  return message;
}
