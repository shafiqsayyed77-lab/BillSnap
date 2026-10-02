/**
 * WebAuthn Passkey Client Service (passkey.js)
 * --------------------------------------------
 * Integrates with @simplewebauthn/browser to enable hardware-backed biometric sign-in:
 * - Face ID
 * - Touch ID / Fingerprint
 * - Android Biometric Prompt
 * - Windows Hello
 * - Device Passcode / PIN
 */

import {
  startRegistration,
  startAuthentication,
  browserSupportsWebAuthn,
} from '@simplewebauthn/browser';
import api from '../api/axios';

/**
 * Checks if current browser and platform support WebAuthn / Passkeys
 */
export const isPasskeySupported = () => {
  try {
    return typeof window !== 'undefined' && browserSupportsWebAuthn();
  } catch {
    return false;
  }
};

/**
 * Initiates Passkey enrollment for the authenticated user
 * @param {string} friendlyName - e.g. "My Phone", "Windows Hello", "MacBook Touch ID"
 */
export const registerPasskey = async (friendlyName = 'Device Passkey') => {
  if (!isPasskeySupported()) {
    throw new Error('WebAuthn / Passkeys are not supported on this browser or device.');
  }

  // 1. Fetch challenge & registration options from backend
  const optionsRes = await api.post('/passkey/register-options');
  const { options, challengeId } = optionsRes.data;

  // 2. Prompt device authenticator (Face ID / Touch ID / PIN)
  let attestationResponse;
  try {
    attestationResponse = await startRegistration({ optionsJSON: options });
  } catch (err) {
    if (err.name === 'NotAllowedError') {
      throw new Error('Passkey creation was cancelled by the user.');
    }
    if (err.name === 'InvalidStateError') {
      throw new Error('This device is already registered as a passkey.');
    }
    throw new Error(err.message || 'Failed to authenticate with device biometrics.');
  }

  // 3. Send response to backend for cryptographic verification & storage
  const verifyRes = await api.post('/passkey/verify-registration', {
    response: attestationResponse,
    challengeId,
    friendlyName,
  });

  return verifyRes.data;
};

/**
 * Initiates Passkey sign-in using device biometrics
 * @param {string} [email] - Optional user email for targeted credential search
 */
export const authenticateWithPasskey = async (email = '') => {
  if (!isPasskeySupported()) {
    throw new Error('WebAuthn / Passkeys are not supported on this browser or device.');
  }

  // 1. Fetch authentication options & challenge from backend
  const optionsRes = await api.post('/passkey/login-options', {
    email: email.trim() || undefined,
  });
  const { options, challengeId } = optionsRes.data;

  // 2. Prompt device authenticator
  let assertionResponse;
  try {
    assertionResponse = await startAuthentication({ optionsJSON: options });
  } catch (err) {
    if (err.name === 'NotAllowedError') {
      throw new Error('Passkey sign-in was cancelled.');
    }
    throw new Error(err.message || 'Passkey verification failed on this device.');
  }

  // 3. Send assertion response to backend to verify signature & issue session JWT
  const verifyRes = await api.post('/passkey/verify-login', {
    response: assertionResponse,
    challengeId,
  });

  return verifyRes.data;
};

/**
 * Fetches list of registered passkeys for currently authenticated user
 */
export const fetchRegisteredPasskeys = async () => {
  const res = await api.get('/passkey/list');
  return res.data;
};
export const getRegisteredPasskeys = fetchRegisteredPasskeys;

/**
 * Deletes a registered passkey by ID
 */
export const deletePasskey = async (passkeyId) => {
  const res = await api.delete(`/passkey/${passkeyId}`);
  return res.data;
};
export const removePasskey = deletePasskey;

