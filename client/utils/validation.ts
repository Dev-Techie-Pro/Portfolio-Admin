export function required(value, label = 'This field') {
  const v = typeof value === 'string' ? value.trim() : value;
  if (v === '' || v == null || (Array.isArray(v) && v.length === 0)) {
    return `${label} is required`;
  }
  return true;
}

export function maxLength(value, max, label = 'This field') {
  if ((value || '').length > max) return `${label} must be ${max} characters or fewer`;
  return true;
}

export function pattern(value, regex, message) {
  if (!regex.test(value)) return message;
  return true;
}

export function urlField(value, label = 'URL') {
  if (!value) return true;
  try {
    const u = new URL(value);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') {
      return `${label} is not valid — include https://`;
    }
    return true;
  } catch {
    return `${label} is not valid — include https://`;
  }
}

export function runValidators(values, schema) {
  const errors = {};
  let valid = true;
  for (const [field, validators] of Object.entries(schema)) {
    for (const validate of validators) {
      const result = validate(values[field]);
      if (result !== true) {
        errors[field] = result;
        valid = false;
        break;
      }
    }
  }
  return { valid, errors };
}
