
// Add a declaration for the CryptoJS global variable loaded from the CDN
declare var CryptoJS: any;

export interface EncryptedData {
    payload: string; // Base64
    salt: string;    // Base64
}

// Fixed constants for "Public" sharing (URLs without a user-provided password)
// We use a known secret and salt so the app can auto-decrypt them.
export const PUBLIC_SECRET = "PRISM_PUBLIC_SHARE_SECRET_KEY";
// Base64 representation of a fixed salt
export const PUBLIC_SALT = "UFJJU01fRklYRURfU0FMVF9WMQ=="; 

/**
 * Encrypts a JSON string using PBKDF2 key derivation and AES-CBC.
 * Generates a random salt unless a custom one is provided.
 */
export const encryptWithPassword = (jsonString: string, password: string, customSaltBase64?: string): EncryptedData | null => {
    if (typeof CryptoJS === 'undefined') {
        console.error("CryptoJS not loaded.");
        return null;
    }
    
    try {
        // 1. Generate Salt (128-bit) or use custom
        let salt;
        if (customSaltBase64) {
            salt = CryptoJS.enc.Base64.parse(customSaltBase64);
        } else {
            salt = CryptoJS.lib.WordArray.random(128 / 8);
        }
        
        // 2. Derive Key/IV
        // keySize 12 words = 48 bytes. First 8 words (32b) = Key, Next 4 words (16b) = IV
        const kdfParams = { keySize: 12, iterations: 1000, hasher: CryptoJS.algo.SHA256 };
        const derived = CryptoJS.PBKDF2(password, salt, kdfParams);
        
        const key = CryptoJS.lib.WordArray.create(derived.words.slice(0, 8));
        const iv = CryptoJS.lib.WordArray.create(derived.words.slice(8, 12));
        
        // 3. Encrypt
        const encrypted = CryptoJS.AES.encrypt(jsonString, key, {
            iv: iv,
            mode: CryptoJS.mode.CBC,
            padding: CryptoJS.pad.Pkcs7
        });
        
        return {
            payload: encrypted.ciphertext.toString(CryptoJS.enc.Base64),
            salt: salt.toString(CryptoJS.enc.Base64)
        };
    } catch (e) {
        console.error("Encryption failed:", e);
        return null;
    }
};

/**
 * Decrypts a payload using a password and salt via PBKDF2 + AES-CBC.
 */
export const decryptWithPassword = async (payloadBase64: string, password: string, saltBase64: string): Promise<string | null> => {
    if (typeof CryptoJS === 'undefined') {
        console.error("CryptoJS not loaded.");
        return null;
    }

    try {
        // Handle URL encoding artifacts (spaces instead of +)
        const payloadStr = decodeURIComponent(payloadBase64).replace(/ /g, '+');
        const saltStr = decodeURIComponent(saltBase64).replace(/ /g, '+');
        
        const salt = CryptoJS.enc.Base64.parse(saltStr);
        
        // Derive Key/IV matching encryption
        const kdfParams = { keySize: 12, iterations: 1000, hasher: CryptoJS.algo.SHA256 };
        const derived = CryptoJS.PBKDF2(password, salt, kdfParams);
        
        const key = CryptoJS.lib.WordArray.create(derived.words.slice(0, 8));
        const iv = CryptoJS.lib.WordArray.create(derived.words.slice(8, 12));
        
        const decrypted = CryptoJS.AES.decrypt(payloadStr, key, {
            iv: iv,
            mode: CryptoJS.mode.CBC,
            padding: CryptoJS.pad.Pkcs7
        });
        
        const txt = decrypted.toString(CryptoJS.enc.Utf8);
        return txt && txt.length > 0 ? txt : null;
    } catch (error) {
        console.error('Decryption failed:', error);
        return null;
    }
};
