const REGISTER_ENDPOINT = 'http://4.224.186.213/evaluation-service/register';
const AUTH_ENDPOINT = 'http://4.224.186.213/evaluation-service/auth';

function validateRegistrationPayload(payload) {
  const requiredFields = ['email', 'name', 'mobileNo', 'githubUsername', 'rollNo', 'accessCode'];
  for (const field of requiredFields) {
    if (!payload[field]) {
      throw new Error(`Registration payload missing required field: ${field}`);
    }
  }
}

function validateAuthPayload(payload) {
  const requiredFields = ['email', 'name', 'rollNo', 'accessCode', 'clientID', 'clientSecret'];
  for (const field of requiredFields) {
    if (!payload[field]) {
      throw new Error(`Authentication payload missing required field: ${field}`);
    }
  }
}

export async function register(payload) {
  validateRegistrationPayload(payload);

  const response = await fetch(REGISTER_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();
  return { status: response.status, ok: response.ok, data };
}

export async function authenticate(payload) {
  validateAuthPayload(payload);

  const response = await fetch(AUTH_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();
  return { status: response.status, ok: response.ok, data };
}
