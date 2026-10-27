// Form validation helpers. Each validator returns an object of { field: message }.
// An empty object means the form is valid.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function validateEmail(email) {
  if (!email || !email.trim()) return 'Email is required.';
  if (!EMAIL_RE.test(email.trim())) return 'Enter a valid email address.';
  return '';
}

export function validatePassword(password) {
  if (!password) return 'Password is required.';
  if (password.length < 8) return 'Password must be at least 8 characters.';
  if (new TextEncoder().encode(password).length > 72) return 'Password must be at most 72 bytes long.';
  return '';
}

export function validateName(name) {
  const value = (name || '').trim();
  if (!value) return 'Name is required.';
  if (value.length < 2) return 'Name must be at least 2 characters.';
  if (value.length > 100) return 'Name must be 100 characters or fewer.';
  return '';
}

function compact(errors) {
  return Object.fromEntries(Object.entries(errors).filter(([, msg]) => msg));
}

export function validateLogin({ email, password }) {
  return compact({
    email: validateEmail(email),
    password: password ? '' : 'Password is required.',
  });
}

export function validateRegister({ name, email, password, confirmPassword }) {
  return compact({
    name: validateName(name),
    email: validateEmail(email),
    password: validatePassword(password),
    confirmPassword: password !== confirmPassword ? 'Passwords do not match.' : '',
  });
}

export function validateProfile({ name, weeklyStudyHours, educationLevel }) {
  const hours = Number(weeklyStudyHours);
  return compact({
    name: validateName(name),
    weeklyStudyHours:
      !Number.isInteger(hours) || hours < 1 || hours > 60
        ? 'Weekly study hours must be a whole number from 1 to 60.'
        : '',
    educationLevel: (educationLevel || '').length > 100 ? 'Education level is too long.' : '',
  });
}
