const crypto = require('crypto');

const ALGORITHM = 'aes-256-cbc';
const KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 16;  // 128 bits

function getEncryptionKey() {
    const key = process.env.TOTP_ENCRYPTION_KEY;
    if (!key) {
        console.error('TOTP_ENCRYPTION_KEY environment variable is required but not found');
        throw new Error('TOTP encryption key not configured - contact system administrator');
    }
    
    if (key.length !== 64) { // 32 bytes = 64 hex chars
        console.error(`TOTP_ENCRYPTION_KEY has invalid length: ${key.length}, expected 64 hex characters`);
        throw new Error('TOTP encryption key has invalid format - contact system administrator');
    }
    
    return Buffer.from(key, 'hex');
}

function encryptTotpSecret(plaintext) {
    if (!plaintext) return null;
    
    try {
        const key = getEncryptionKey();
        const iv = crypto.randomBytes(IV_LENGTH);
        const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
        
        let encrypted = cipher.update(plaintext, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        
        // Combine IV + encrypted data
        const combined = iv.toString('hex') + encrypted;
        return combined;
        
    } catch (error) {
        console.error('TOTP encryption error:', error);
        throw new Error('Failed to encrypt TOTP secret');
    }
}

function decryptTotpSecret(encryptedData) {
    if (!encryptedData) return null;
    
    try {
        const key = getEncryptionKey();
        
        // Extract components
        const iv = Buffer.from(encryptedData.slice(0, IV_LENGTH * 2), 'hex');
        const encrypted = encryptedData.slice(IV_LENGTH * 2);
        
        const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
        
        let decrypted = decipher.update(encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        
        return decrypted;
        
    } catch (error) {
        console.error('TOTP decryption error:', error);
        throw new Error('Failed to decrypt TOTP secret');
    }
}

function generateEncryptionKey() {
    return crypto.randomBytes(KEY_LENGTH).toString('hex');
}

module.exports = {
    encryptTotpSecret,
    decryptTotpSecret,
    generateEncryptionKey
};