// The API rejects a new password shorter than this (`min=7` in zedu-be), so
// every form that sets a password checks it before sending the request.
export const PASSWORD_MIN_LENGTH = 7;

export const PASSWORD_HINT = `At least ${PASSWORD_MIN_LENGTH} characters`;

export const PASSWORD_TOO_SHORT_MESSAGE = `Password must be at least ${PASSWORD_MIN_LENGTH} characters`;

// Counts by code point, like the API, so an emoji counts as one character.
export const isPasswordTooShort = (password: string) =>
  Array.from(password).length < PASSWORD_MIN_LENGTH;
