export function sanitizeString(value, maxLength = null) {
  if (typeof value !== 'string') return '';
  let str = value.trim();
  if (maxLength) str = str.substring(0, maxLength);
  return str;
}
