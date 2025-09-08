const crypto = require('crypto');
const JWT = require('jsonwebtoken');
const {
  generatePasswordHash,
  verifyAccessToken,
  customsAuthTokens,
  refreshToken,
  verifyPassword,
  responseFormate,
  generateOTP
} = require('../../../src/utils/util'); // Adjust path as needed

// Mock Config module
jest.mock('../../../src/config/config', () => ({
  jwt: {
    user: {
      secret: 'test-secret-key'
    },
    accessTokenExpiresIn: '15m',
    refreshTokenExpiresIn: '7d',
    issuer: 'test-issuer'
  }
}));

describe('Authentication Utility Functions', () => {
  
  describe('generatePasswordHash', () => {
    it('should generate a password hash with salt', () => {
      const password = 'testPassword123';
      const result = generatePasswordHash(password);
      
      expect(result).toHaveProperty('salt');
      expect(result).toHaveProperty('hash');
      expect(typeof result.salt).toBe('string');
      expect(typeof result.hash).toBe('string');
      expect(result.hash).toHaveLength(128); // SHA512 hex digest length
    });

    it('should generate the same hash for the same password and salt', () => {
      const password = 'testPassword123';
      const salt = crypto.randomBytes(16);
      
      const result1 = generatePasswordHash(password, salt);
      const result2 = generatePasswordHash(password, salt);
      
      expect(result1.hash).toEqual(result2.hash);
      expect(result1.salt).toEqual(result2.salt);
    });

    it('should generate different hashes for different passwords', () => {
      const password1 = 'testPassword123';
      const password2 = 'differentPassword456';
      
      const result1 = generatePasswordHash(password1);
      const result2 = generatePasswordHash(password2);
      
      expect(result1.hash).not.toEqual(result2.hash);
    });

    it('should handle crypto errors properly', () => {
      // Mock crypto.createHmac to throw an error
      const originalCreateHmac = crypto.createHmac;
      crypto.createHmac = jest.fn().mockImplementation(() => {
        throw new Error('Crypto error');
      });

      console.error = jest.fn(); // Mock console.error

      expect(() => generatePasswordHash('password')).toThrow('Crypto error');
      expect(console.error).toHaveBeenCalledWith('Error in generatePasswordHash', expect.any(Error));

      // Restore original function
      crypto.createHmac = originalCreateHmac;
    });
  });

  describe('verifyAccessToken', () => {
    it('should verify a valid JWT token', () => {
      const payload = { uid: 'user123', email: 'test@example.com' };
      const token = JWT.sign(payload, 'test-secret-key');
      
      const decoded = verifyAccessToken(token);
      
      expect(decoded.uid).toBe(payload.uid);
      expect(decoded.email).toBe(payload.email);
      expect(decoded).toHaveProperty('iat');
    });

    it('should throw error for invalid token', () => {
      const invalidToken = 'invalid.token.here';
      
      expect(() => verifyAccessToken(invalidToken)).toThrow();
    });

    it('should throw error for expired token', () => {
      const payload = { uid: 'user123', email: 'test@example.com' };
      const expiredToken = JWT.sign(payload, 'test-secret-key', { expiresIn: '0s' });
      
      // Wait a moment to ensure token is expired
      setTimeout(() => {
        expect(() => verifyAccessToken(expiredToken)).toThrow();
      }, 100);
    });

    it('should throw error for token with wrong secret', () => {
      const payload = { uid: 'user123', email: 'test@example.com' };
      const token = JWT.sign(payload, 'wrong-secret');
      
      expect(() => verifyAccessToken(token)).toThrow();
    });
  });

  describe('customsAuthTokens', () => {

    it('should generate tokens with empty payload', () => {
      const result = customsAuthTokens();
      
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result).toHaveProperty('expirationTime');
    });
  
  });

  describe('refreshToken', () => {
    it('should generate new access token with provided refresh token', () => {
      const payload = { uid: 'user123', email: 'test@example.com' };
      const oldRefreshToken = 'old-refresh-token';
      
      const result = refreshToken(payload, oldRefreshToken);
      
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result).toHaveProperty('expirationTime');
      expect(result.refreshToken).toBe(oldRefreshToken);
      expect(typeof result.accessToken).toBe('string');
    });

    it('should work with empty payload', () => {
      const oldRefreshToken = 'old-refresh-token';
      const result = refreshToken({}, oldRefreshToken);
      
      expect(result.refreshToken).toBe(oldRefreshToken);
      expect(result).toHaveProperty('accessToken');
    });
  });

  describe('verifyPassword', () => {
    it('should verify correct password', () => {
      const password = 'testPassword123';
      const { hash, salt } = generatePasswordHash(password);
      
      const isValid = verifyPassword({ hash, salt, password });
      
      expect(isValid).toBe(true);
    });

    it('should reject incorrect password', () => {
      const correctPassword = 'testPassword123';
      const wrongPassword = 'wrongPassword456';
      const { hash, salt } = generatePasswordHash(correctPassword);
      
      const isValid = verifyPassword({ hash, salt, password: wrongPassword });
      
      expect(isValid).toBe(false);
    });

    it('should return false when hash is missing', () => {
      const password = 'testPassword123';
      const salt = 'test-salt';
      
      const isValid = verifyPassword({ hash: null, salt, password });
      
      expect(isValid).toBe(false);
    });

    it('should return false when salt is missing', () => {
      const password = 'testPassword123';
      const hash = 'test-hash';
      
      const isValid = verifyPassword({ hash, salt: null, password });
      
      expect(isValid).toBe(false);
    });

    it('should return false when both hash and salt are missing', () => {
      const password = 'testPassword123';
      
      const isValid = verifyPassword({ hash: null, salt: null, password });
      
      expect(isValid).toBe(false);
    });
  });

  describe('responseFormate', () => {
    it('should format user response correctly', () => {
      const userData = {
        _id: 'user123',
        email: 'test@example.com',
        name: 'Test User'
      };
      
      const result = responseFormate(userData);
      
      expect(result).toHaveProperty('uid', userData._id);
      expect(result).toHaveProperty('email', userData.email);
      expect(result).toHaveProperty('authToken');
      expect(result.authToken).toHaveProperty('accessToken');
      expect(result.authToken).toHaveProperty('refreshToken');
      expect(result.authToken).toHaveProperty('expirationTime');
    });

    it('should handle user data without additional fields', () => {
      const userData = {
        _id: 'user456',
        email: 'another@example.com'
      };
      
      const result = responseFormate(userData);
      
      expect(result.uid).toBe(userData._id);
      expect(result.email).toBe(userData.email);
      expect(result.authToken).toBeDefined();
    });
  });

  describe('generateOTP', () => {
    beforeEach(() => {
      // Mock Date to control time-based tests
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2023-01-01T12:00:00.000Z'));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should generate new OTP when no existing OTP', () => {
      const signUpData = {};
      const result = generateOTP(signUpData);
      
      expect(result).toHaveProperty('otp');
      expect(result).toHaveProperty('updatedAt');
      expect(typeof result.otp).toBe('number');
      expect(result.otp).toBeGreaterThanOrEqual(100000);
      expect(result.otp).toBeLessThanOrEqual(999999);
      expect(result.updatedAt).toBeInstanceOf(Date);
    });

    it('should generate new OTP when existing OTP is older than 5 minutes', () => {
      const oldTime = new Date('2023-01-01T11:54:00.000Z'); // 6 minutes ago
      const signUpData = {
        otp: 123456,
        updatedAt: oldTime
      };
      
      const result = generateOTP(signUpData);
      
      expect(result.otp).not.toBe(123456);
      expect(result.otp).toBeGreaterThanOrEqual(100000);
      expect(result.otp).toBeLessThanOrEqual(999999);
    });

    it('should return existing OTP when it is less than 5 minutes old', () => {
      const recentTime = new Date('2023-01-01T11:58:00.000Z'); // 2 minutes ago
      const existingOTP = 654321;
      const signUpData = {
        otp: existingOTP,
        updatedAt: recentTime
      };
      
      const result = generateOTP(signUpData);
      
      expect(result.otp).toBe(existingOTP);
      expect(result.updatedAt).toEqual(new Date('2023-01-01T12:00:00.000Z'));
    });

    it('should generate new OTP when updatedAt is exactly 5 minutes old', () => {
      const exactTime = new Date('2023-01-01T11:55:00.000Z'); // exactly 5 minutes ago
      const signUpData = {
        otp: 123456,
        updatedAt: exactTime
      };
      
      const result = generateOTP(signUpData);
      
      expect(result.otp).not.toBe(123456);
      expect(result.otp).toBeGreaterThanOrEqual(100000);
      expect(result.otp).toBeLessThanOrEqual(999999);
    });

    it('should handle signUpData without updatedAt', () => {
      const signUpData = {
        otp: 123456
        // no updatedAt property
      };
      
      const result = generateOTP(signUpData);
      
      expect(result.otp).not.toBe(123456);
      expect(result.otp).toBeGreaterThanOrEqual(100000);
      expect(result.otp).toBeLessThanOrEqual(999999);
    });

    it('should always return current time as updatedAt', () => {
      const currentTime = new Date('2023-01-01T12:00:00.000Z');
      const signUpData = { otp: 123456 };
      
      const result = generateOTP(signUpData);
      
      expect(result.updatedAt).toEqual(currentTime);
    });
  });
});
