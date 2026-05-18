const VALID_STACKS = ['backend', 'frontend'];
const VALID_LEVELS = ['debug', 'info', 'warn', 'error', 'fatal'];
const LOG_ENDPOINT = 'http://4.224.186.213/evaluation-service/logs';

let authToken = process.env.AFFORDMED_LOG_TOKEN || null;

function ensureLowercase(value, name) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`${name} must be a non-empty string`);
  }
  if (value !== value.toLowerCase()) {
    throw new Error(`${name} must be lowercase`);
  }
}

function validateFields(stack, level, packageName, message) {
  ensureLowercase(stack, 'stack');
  ensureLowercase(level, 'level');
  ensureLowercase(packageName, 'package');

  if (!VALID_STACKS.includes(stack)) {
    throw new Error(`stack must be one of: ${VALID_STACKS.join(', ')}`);
  }

  if (!VALID_LEVELS.includes(level)) {
    throw new Error(`level must be one of: ${VALID_LEVELS.join(', ')}`);
  }

  if (typeof message !== 'string' || message.trim() === '') {
    throw new Error('message must be a non-empty string');
  }
}

export function setLogAuthToken(token) {
  if (typeof token !== 'string' || token.trim() === '') {
    throw new Error('auth token must be a non-empty string');
  }
  authToken = token.trim();
}

export async function Log(stack, level, packageName, message) {
  validateFields(stack, level, packageName, message);

  if (!authToken) {
    throw new Error('Authorization token is not set. Call setLogAuthToken(token) first or set AFFORDMED_LOG_TOKEN.');
  }

  const payload = {
    stack,
    level,
    package: packageName,
    message,
  };

  const response = await fetch(LOG_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authToken}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Log API failed with status ${response.status}: ${body}`);
  }

  return response.json();
}
