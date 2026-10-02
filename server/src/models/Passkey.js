/**
 * Passkey Model (Passkey.js)
 * ----------------------------
 * Stores FIDO2 / WebAuthn public key credentials for biometric and device-bound passkey login.
 * 
 * Security:
 * - Public key credentials only (private keys never leave the user's authenticating device).
 * - Multi-device support: users can enroll iPhone (Face ID), MacBook (Touch ID), Android biometrics, etc.
 * - Enforces per-user credential isolation.
 */

import mongoose from 'mongoose';

const passkeySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    // Base64URL-encoded credential identifier
    credentialID: {
      type: String,
      required: [true, 'Credential ID is required'],
      unique: true,
      index: true,
    },
    // Base64URL-encoded public key bytes
    credentialPublicKey: {
      type: String,
      required: [true, 'Public key is required'],
    },
    // Signature counter to protect against replay attacks
    counter: {
      type: Number,
      default: 0,
    },
    // 'singleDevice' or 'multiDevice'
    deviceType: {
      type: String,
      default: 'singleDevice',
    },
    // Whether credential is syncable across iCloud Keychain / Google Password Manager
    backedUp: {
      type: Boolean,
      default: false,
    },
    // Authenticator transports: ['internal', 'hybrid', 'usb', 'nfc', 'ble']
    transports: {
      type: [String],
      default: ['internal'],
    },
    // User-friendly device name (e.g. "iPhone 15 Face ID", "MacBook Touch ID", "Windows Hello")
    friendlyName: {
      type: String,
      trim: true,
      default: 'Device Passkey',
    },
    lastUsedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

const Passkey = mongoose.model('Passkey', passkeySchema);

export default Passkey;
