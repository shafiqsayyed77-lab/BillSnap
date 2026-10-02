/**
 * WebAuthn Passkey Controller (passkeyController.js)
 * --------------------------------------------------
 * Implements FIDO2 / WebAuthn standards for passwordless biometric and hardware passkey authentication:
 * - Registration options & response verification
 * - Authentication options & response verification (Face ID / Touch ID / Windows Hello)
 * - Multi-device passkey management per user
 * - Replay attack prevention via counter verification
 */

import crypto from 'crypto';
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from '@simplewebauthn/server';
import Passkey from '../models/Passkey.js';
import User from '../models/User.js';
import { generateToken } from './authController.js';

// In-memory challenge store with automatic 5-minute TTL
const challengeStore = new Map();

const cleanExpiredChallenges = () => {
  const now = Date.now();
  for (const [key, val] of challengeStore.entries()) {
    if (val.expiresAt < now) {
      challengeStore.delete(key);
    }
  }
};

// Periodically clean challenge cache every 3 minutes
setInterval(cleanExpiredChallenges, 3 * 60 * 1000);

/**
 * Helper to dynamically determine RP ID and origin from incoming request
 */
const getRPConfig = (req) => {
  const reqOrigin = req.headers.origin || req.headers.referer?.replace(/\/$/, '') || 'http://localhost:5173';
  let rpID = 'localhost';
  try {
    const parsed = new URL(reqOrigin);
    rpID = parsed.hostname;
  } catch {
    rpID = 'localhost';
  }

  // Support typical development ports
  const expectedOrigins = [
    reqOrigin,
    'http://localhost:5173',
    'http://localhost:3000',
    'http://localhost:5174',
    'http://127.0.0.1:5173',
  ];

  return {
    rpName: 'BillSnap',
    rpID,
    expectedOrigin: reqOrigin || 'http://localhost:5173',
    expectedOrigins,
  };
};

/**
 * @route   POST /api/passkey/register-options
 * @desc    Generate WebAuthn registration options for the authenticated user
 * @access  Private (Scoped to req.user)
 */
export const getRegisterOptions = async (req, res, next) => {
  try {
    const user = req.user;
    const { rpName, rpID } = getRPConfig(req);

    // Retrieve user's existing passkeys to prevent re-registering the same device
    const existingPasskeys = await Passkey.find({ userId: user._id });

    // Generate options using WebAuthn standard
    const options = await generateRegistrationOptions({
      rpName,
      rpID,
      userID: Buffer.from(user._id.toString()),
      userName: user.email,
      userDisplayName: user.name,
      attestationType: 'none',
      excludeCredentials: existingPasskeys.map((p) => ({
        id: p.credentialID,
        transports: p.transports || ['internal'],
      })),
      authenticatorSelection: {
        residentKey: 'preferred',
        userVerification: 'preferred',
        authenticatorAttachment: 'platform', // prefers Face ID, Touch ID, Windows Hello, Android
      },
    });

    const challengeId = crypto.randomUUID();
    challengeStore.set(challengeId, {
      challenge: options.challenge,
      userId: user._id.toString(),
      expiresAt: Date.now() + 5 * 60 * 1000,
    });

    res.status(200).json({ options, challengeId });
  } catch (err) {
    next(err);
  }
};

/**
 * @route   POST /api/passkey/verify-registration
 * @desc    Verify client's WebAuthn registration response and enroll device
 * @access  Private (Scoped to req.user)
 */
export const verifyRegistration = async (req, res, next) => {
  try {
    const { response, challengeId, friendlyName } = req.body;
    const user = req.user;

    if (!response || !challengeId) {
      return res.status(400).json({ message: 'Registration response and challengeId are required.' });
    }

    const storedChallenge = challengeStore.get(challengeId);
    if (!storedChallenge || storedChallenge.userId !== user._id.toString()) {
      return res.status(400).json({ message: 'Registration session expired or invalid. Please try again.' });
    }

    challengeStore.delete(challengeId);

    const { rpID, expectedOrigin } = getRPConfig(req);

    const verification = await verifyRegistrationResponse({
      response,
      expectedChallenge: storedChallenge.challenge,
      expectedOrigin,
      expectedRPID: rpID,
      requireUserVerification: false,
    });

    if (!verification.verified || !verification.registrationInfo) {
      return res.status(400).json({ message: 'Passkey verification failed on device.' });
    }

    const { credential, credentialDeviceType, credentialBackedUp } = verification.registrationInfo;

    // Check if this credential ID is already registered
    const existing = await Passkey.findOne({ credentialID: credential.id });
    if (existing) {
      return res.status(200).json({
        verified: true,
        message: 'This device is already enrolled as a passkey.',
        passkey: existing,
      });
    }

    const passkey = await Passkey.create({
      userId: user._id,
      credentialID: credential.id,
      credentialPublicKey: Buffer.from(credential.publicKey).toString('base64url'),
      counter: credential.counter || 0,
      deviceType: credentialDeviceType || 'singleDevice',
      backedUp: credentialBackedUp || false,
      transports: credential.transports || response.response?.transports || ['internal'],
      friendlyName: friendlyName?.trim() || 'Device Passkey',
    });

    res.status(201).json({
      verified: true,
      message: 'Passkey created successfully! You can now sign in with your device biometrics.',
      passkey: {
        id: passkey._id,
        friendlyName: passkey.friendlyName,
        createdAt: passkey.createdAt,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @route   POST /api/passkey/login-options
 * @desc    Generate WebAuthn authentication options for passkey sign-in
 * @access  Public
 */
export const getLoginOptions = async (req, res, next) => {
  try {
    const { email } = req.body;
    const { rpID } = getRPConfig(req);

    let allowCredentials = undefined;

    if (email && email.trim()) {
      const user = await User.findOne({ email: email.toLowerCase().trim() });
      if (user) {
        const passkeys = await Passkey.find({ userId: user._id });
        if (passkeys.length > 0) {
          allowCredentials = passkeys.map((p) => ({
            id: p.credentialID,
            transports: p.transports || ['internal'],
          }));
        }
      }
    }

    const options = await generateAuthenticationOptions({
      rpID,
      allowCredentials,
      userVerification: 'preferred',
    });

    const challengeId = crypto.randomUUID();
    challengeStore.set(challengeId, {
      challenge: options.challenge,
      email: email ? email.toLowerCase().trim() : null,
      expiresAt: Date.now() + 5 * 60 * 1000,
    });

    res.status(200).json({ options, challengeId });
  } catch (err) {
    next(err);
  }
};

/**
 * @route   POST /api/passkey/verify-login
 * @desc    Verify WebAuthn authentication response and issue JWT session
 * @access  Public
 */
export const verifyLogin = async (req, res, next) => {
  try {
    const { response, challengeId } = req.body;

    if (!response || !challengeId) {
      return res.status(400).json({ message: 'Authentication response and challengeId are required.' });
    }

    const storedChallenge = challengeStore.get(challengeId);
    if (!storedChallenge) {
      return res.status(400).json({ message: 'Passkey authentication session expired. Please try again.' });
    }

    challengeStore.delete(challengeId);

    // Find passkey record matching the returned credential ID
    const passkey = await Passkey.findOne({ credentialID: response.id });
    if (!passkey) {
      return res.status(401).json({
        message: 'No passkey found for this device on BillSnap. Please sign in with password first to set up a passkey.',
      });
    }

    // Find matching user
    const user = await User.findById(passkey.userId);
    if (!user) {
      return res.status(401).json({ message: 'User account associated with this passkey was not found.' });
    }

    const { rpID, expectedOrigin } = getRPConfig(req);

    // Convert stored base64url public key back to Uint8Array
    const publicKeyBuffer = Buffer.from(passkey.credentialPublicKey, 'base64url');

    const verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge: storedChallenge.challenge,
      expectedOrigin,
      expectedRPID: rpID,
      credential: {
        id: passkey.credentialID,
        publicKey: new Uint8Array(publicKeyBuffer),
        counter: passkey.counter || 0,
        transports: passkey.transports,
      },
      requireUserVerification: false,
    });

    if (!verification.verified) {
      return res.status(401).json({ message: 'Passkey biometric verification failed.' });
    }

    // Update counter and lastUsedAt
    if (verification.authenticationInfo) {
      passkey.counter = verification.authenticationInfo.newCounter;
    }
    passkey.lastUsedAt = new Date();
    await passkey.save();

    // Issue JWT token
    const token = generateToken(user._id);

    res.status(200).json({
      verified: true,
      token,
      user: {
        id: user._id,
        _id: user._id,
        name: user.name,
        email: user.email,
        monthlyBudget: user.monthlyBudget,
        createdAt: user.createdAt,
      },
      message: `Welcome back, ${user.name}! 🔐 Authenticated with Passkey.`,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @route   GET /api/passkey/list
 * @desc    List all registered passkeys for authenticated user
 * @access  Private (Scoped to req.user)
 */
export const listPasskeys = async (req, res, next) => {
  try {
    const passkeys = await Passkey.find({ userId: req.user._id })
      .select('_id friendlyName deviceType backedUp transports createdAt lastUsedAt')
      .sort({ createdAt: -1 });

    res.status(200).json({
      passkeys,
      count: passkeys.length,
      hasPasskeys: passkeys.length > 0,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @route   DELETE /api/passkey/:id
 * @desc    Remove a registered passkey
 * @access  Private (Scoped to req.user)
 */
export const deletePasskey = async (req, res, next) => {
  try {
    const result = await Passkey.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!result) {
      return res.status(404).json({ message: 'Passkey not found.' });
    }

    res.status(200).json({ message: 'Passkey removed successfully.' });
  } catch (err) {
    next(err);
  }
};
