
const bcrypt = require('bcryptjs');
const userRepository = require('../repositories/userRepository');

class AuthError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

function validateString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function normalizeEmail(email) {
  return email.trim().toLowerCase();
}

function safeUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
  };
}

function invalidCredentials() {
  return new AuthError(
    401,
    'INVALID_CREDENTIALS',
    'Invalid email or password'
  );
}

async function register({ name, email, password } = {}) {
  if (
    !validateString(name) ||
    !validateString(email) ||
    !validateString(password)
  ) {
    throw new AuthError(
      400,
      'INVALID_INPUT',
      'Name, email, and password must be non-empty strings'
    );
  }

  const normalizedEmail = normalizeEmail(email);

  const existingUser = await userRepository.findUserByEmail(normalizedEmail);

  if (existingUser) {
    throw new AuthError(
      409,
      'EMAIL_ALREADY_EXISTS',
      'An account with this email already exists'
    );
  }

  const configuredCost = Number(process.env.BCRYPT_COST || 12);
  const cost = Number.isInteger(configuredCost)
    && configuredCost >= 4
    && configuredCost <= 31
    ? configuredCost
    : 12;

  const passwordHash = await bcrypt.hash(password, cost);

  try {
    const user = await userRepository.createUser({
      name: name.trim(),
      email: normalizedEmail,
      passwordHash,
    });

    return safeUser(user);
  } catch (error) {
    // Handles duplicate registration requests arriving simultaneously.
    if (error.code === 'P2002') {
      throw new AuthError(
        409,
        'EMAIL_ALREADY_EXISTS',
        'An account with this email already exists'
      );
    }

    throw error;
  }
}

async function login({ email, password } = {}) {
  if (!validateString(email) || !validateString(password)) {
    throw new AuthError(
      400,
      'INVALID_INPUT',
      'Email and password must be non-empty strings'
    );
  }

  const normalizedEmail = normalizeEmail(email);
  const user = await userRepository.findUserByEmail(normalizedEmail);

  if (!user) {
    throw invalidCredentials();
  }

  const passwordMatches = await bcrypt.compare(
    password,
    user.passwordHash
  );

  if (!passwordMatches) {
    throw invalidCredentials();
  }

  return safeUser(user);
}

module.exports = {
  register,
  login,
  AuthError,
};
