// src/utils/usernameUtils.js
export class UsernameValidationError extends Error {
  constructor(message, code = "INVALID_USERNAME") {
    super(message);
    this.name = "UsernameValidationError";
    this.code = code;
  }
}

export const USERNAME_MIN_LENGTH = 2;
export const USERNAME_MAX_LENGTH = 30;
const USERNAME_ALLOWED_PATTERN = /^[A-Za-z0-9._-]+$/;

export function normalizeUsername(rawInput, options = {}) {
  const { requireAt = true, allowEmpty = false } = options;

  if (rawInput === undefined || rawInput === null) {
    if (allowEmpty) return "";
    throw new UsernameValidationError("Username wajib diisi");
  }

  if (typeof rawInput !== "string") {
    throw new UsernameValidationError("Username harus berupa string");
  }

  let value = rawInput.trim();

  if (!value && allowEmpty) {
    return "";
  }

  if (requireAt) {
    if (!value.startsWith("@")) {
      throw new UsernameValidationError("Username harus diawali @");
    }
    value = value.slice(1);
  } else if (value.startsWith("@")) {
    value = value.slice(1);
  }

  value = value.trim();
  if (!value) {
    if (allowEmpty) return "";
    throw new UsernameValidationError("Username wajib diisi");
  }

  const normalized = value.toLowerCase();

  if (normalized.length < USERNAME_MIN_LENGTH) {
    throw new UsernameValidationError(
      `Username minimal ${USERNAME_MIN_LENGTH} karakter`
    );
  }

  if (normalized.length > USERNAME_MAX_LENGTH) {
    throw new UsernameValidationError(
      `Username maksimal ${USERNAME_MAX_LENGTH} karakter`
    );
  }

  if (/\s/.test(normalized)) {
    throw new UsernameValidationError("Username tidak boleh mengandung spasi");
  }

  if (!USERNAME_ALLOWED_PATTERN.test(normalized)) {
    throw new UsernameValidationError(
      "Username hanya boleh huruf, angka, titik, underscore, atau strip"
    );
  }

  return normalized;
}
