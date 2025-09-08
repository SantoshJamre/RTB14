const userDbClass = require('../../../../src/db/user/user.db.proccessor'); // Adjust path as needed
const User = require('../../../../src/models/User');

// Mock the User model
jest.mock('../../../../src/models/User');

// Mock logger
const mockLogger = {
  error: jest.fn()
};

global.logger = mockLogger;

describe('userDbClass', () => {
  let userDb;
  
  beforeEach(() => {
    jest.clearAllMocks();
    userDb = new userDbClass();
  });

  describe('get method', () => {
    it('should return user when found', async () => {
      const mockUser = {
        _id: 'user123',
        email: 'test@example.com',
        toJSON: jest.fn().mockReturnValue({
          _id: 'user123',
          email: 'test@example.com',
          name: 'Test User'
        })
      };

      User.findById = jest.fn().mockResolvedValue(mockUser);

      const result = await userDb.get('user123');

      expect(User.findById).toHaveBeenCalledWith('user123');
      expect(mockUser.toJSON).toHaveBeenCalled();
      expect(result).toEqual({
        _id: 'user123',
        email: 'test@example.com',
        name: 'Test User'
      });
    });

    it('should throw 404 error when user not found', async () => {
      User.findById = jest.fn().mockResolvedValue(null);

      await expect(userDb.get('nonexistent')).rejects.toEqual({
        message: 'user not found',
        code: 404
      });

      expect(User.findById).toHaveBeenCalledWith('nonexistent');
    });

    it('should throw 404 error when database error occurs', async () => {
      User.findById = jest.fn().mockRejectedValue(new Error('Database connection failed'));

      await expect(userDb.get('user123')).rejects.toEqual({
        message: 'user not found',
        code: 404
      });
    });

    it('should re-throw custom errors with code', async () => {
      const customError = { message: 'Custom error', code: 500 };
      User.findById = jest.fn().mockRejectedValue(customError);

      await expect(userDb.get('user123')).rejects.toEqual(customError);
    });
  });

  describe('create method', () => {
    it('should create user successfully', async () => {
      const createData = {
        email: 'new@example.com',
        password: 'hashedPassword',
        name: 'New User'
      };

      const mockUser = {
        _id: 'user456',
        email: 'new@example.com',
        save: jest.fn().mockResolvedValue()
      };

      User.mockImplementation(() => mockUser);

      const result = await userDb.create(createData);

      expect(User).toHaveBeenCalledWith(createData);
      expect(mockUser.save).toHaveBeenCalled();
      expect(result).toEqual({
        _id: 'user456',
        email: 'new@example.com',
        message: 'Please verify your email'
      });
    });

    it('should handle duplicate email error', async () => {
      const createData = { email: 'duplicate@example.com' };
      const mockUser = {
        save: jest.fn().mockRejectedValue({
          code: 11000,
          keyPattern: { email: 1 }
        })
      };

      User.mockImplementation(() => mockUser);

      await expect(userDb.create(createData)).rejects.toEqual({
        message: 'User with this email already exists',
        code: 400,
        field: 'email'
      });

      expect(mockLogger.error).not.toHaveBeenCalled();
    });

    it('should handle duplicate key error with different field', async () => {
      const createData = { username: 'duplicateuser' };
      const mockUser = {
        save: jest.fn().mockRejectedValue({
          code: 11000,
          keyPattern: { username: 1 }
        })
      };

      User.mockImplementation(() => mockUser);

      await expect(userDb.create(createData)).rejects.toEqual({
        message: 'User with this username already exists',
        code: 400,
        field: 'username'
      });
    });

    it('should handle validation errors', async () => {
      const createData = { email: 'invalid-email' };
      const validationError = new Error('Validation failed');
      validationError.message = 'Email is not valid';
      
      const mockUser = {
        save: jest.fn().mockRejectedValue(validationError)
      };

      User.mockImplementation(() => mockUser);

      await expect(userDb.create(createData)).rejects.toEqual({
        message: 'Email is not valid',
        code: 500
      });

      expect(mockLogger.error).toHaveBeenCalledWith('Error creating user:', { error: validationError });
    });

    it('should handle generic database errors', async () => {
      const createData = { email: 'test@example.com' };
      const dbError = new Error('Database connection failed');
      
      const mockUser = {
        save: jest.fn().mockRejectedValue(dbError)
      };

      User.mockImplementation(() => mockUser);

      await expect(userDb.create(createData)).rejects.toEqual({
        message: 'Database connection failed',
        code: 500
      });

      expect(mockLogger.error).toHaveBeenCalledWith('Error creating user:', { error: dbError });
    });

    it('should handle errors without message', async () => {
      const createData = { email: 'test@example.com' };
      const errorWithoutMessage = {};
      
      const mockUser = {
        save: jest.fn().mockRejectedValue(errorWithoutMessage)
      };

      User.mockImplementation(() => mockUser);

      await expect(userDb.create(createData)).rejects.toEqual({
        message: 'Failed to create user',
        code: 500
      });
    });
  });

  describe('update method', () => {
    it('should handle $unset operation for OTP data', async () => {
      const updateData = { $unset: { otpData: 1 } };
      
      User.findByIdAndUpdate = jest.fn().mockResolvedValue();

      const result = await userDb.update('user123', updateData);

      expect(User.findByIdAndUpdate).toHaveBeenCalledWith('user123', { $unset: { otpData: 1 } });
      expect(result).toEqual({ success: true });
    });

    it('should update user successfully with regular data', async () => {
      const updateData = { name: 'Updated Name', isVerified: true };
      const mockUpdatedUser = {
        _id: 'user123',
        email: 'test@example.com',
        isVerified: true
      };

      User.findByIdAndUpdate = jest.fn().mockResolvedValue(mockUpdatedUser);

      const result = await userDb.update('user123', updateData);

      expect(User.findByIdAndUpdate).toHaveBeenCalledWith(
        'user123',
        updateData,
        { new: true, runValidators: true }
      );
      expect(result).toEqual({
        success: true,
        user: {
          _id: 'user123',
          email: 'test@example.com',
          isVerified: true
        }
      });
    });

    it('should throw error when user not found for update', async () => {
      const updateData = { name: 'Updated Name' };
      
      User.findByIdAndUpdate = jest.fn().mockResolvedValue(null);

      await expect(userDb.update('nonexistent', updateData)).rejects.toEqual({
        message: 'User not found',
        code: 500
      });

      expect(mockLogger.error).toHaveBeenCalledWith('Error updating user:', { 
        error: expect.any(Error) 
      });
    });

    it('should handle duplicate key error on update', async () => {
      const updateData = { email: 'duplicate@example.com' };
      const duplicateError = {
        code: 11000,
        keyPattern: { email: 1 }
      };

      User.findByIdAndUpdate = jest.fn().mockRejectedValue(duplicateError);

      await expect(userDb.update('user123', updateData)).rejects.toEqual({
        message: 'User with this email already exists',
        code: 400,
        field: 'email'
      });

      expect(mockLogger.error).toHaveBeenCalledWith('Error updating user:', { error: duplicateError });
    });

    it('should handle validation errors on update', async () => {
      const updateData = { email: 'invalid-email' };
      const validationError = new Error('Invalid email format');
      
      User.findByIdAndUpdate = jest.fn().mockRejectedValue(validationError);

      await expect(userDb.update('user123', updateData)).rejects.toEqual({
        message: 'Invalid email format',
        code: 500
      });
    });

    it('should handle errors with custom code', async () => {
      const updateData = { name: 'Test' };
      const customError = { message: 'Custom error', code: 422 };
      
      User.findByIdAndUpdate = jest.fn().mockRejectedValue(customError);

      await expect(userDb.update('user123', updateData)).rejects.toEqual({
        message: 'Custom error',
        code: 422
      });
    });
  });

  describe('updatePassword method', () => {
    it('should update password successfully', async () => {
      const updateData = { password: 'newHashedPassword' };
      const mockUser = {
        _id: 'user123',
        email: 'test@example.com'
      };

      User.findByIdAndUpdate = jest.fn().mockResolvedValue(mockUser);

      const result = await userDb.updatePassword('user123', updateData);

      expect(User.findByIdAndUpdate).toHaveBeenCalledWith('user123', updateData, { new: true });
      expect(result).toEqual({ success: true });
    });

    it('should throw error when user not found for password update', async () => {
      const updateData = { password: 'newHashedPassword' };
      
      User.findByIdAndUpdate = jest.fn().mockResolvedValue(null);

      await expect(userDb.updatePassword('nonexistent', updateData)).rejects.toEqual({
        message: 'user not found',
        code: 404
      });
    });

    it('should handle database errors during password update', async () => {
      const updateData = { password: 'newHashedPassword' };
      
      User.findByIdAndUpdate = jest.fn().mockRejectedValue(new Error('Database error'));

      await expect(userDb.updatePassword('user123', updateData)).rejects.toEqual({
        message: 'user not found',
        code: 404
      });
    });

    it('should re-throw custom errors with code', async () => {
      const updateData = { password: 'newHashedPassword' };
      const customError = { message: 'Custom password error', code: 422 };
      
      User.findByIdAndUpdate = jest.fn().mockRejectedValue(customError);

      await expect(userDb.updatePassword('user123', updateData)).rejects.toEqual(customError);
    });
  });

  describe('delete method', () => {
    it('should soft delete user successfully', async () => {
      const mockUser = {
        _id: 'user123',
        isActive: false
      };

      User.findByIdAndUpdate = jest.fn().mockResolvedValue(mockUser);

      const result = await userDb.delete('user123');

      expect(User.findByIdAndUpdate).toHaveBeenCalledWith(
        'user123',
        { isActive: false },
        { new: true }
      );
      expect(result).toEqual({ message: 'user deleted successfully' });
    });

    it('should throw error when user not found for deletion', async () => {
      User.findByIdAndUpdate = jest.fn().mockResolvedValue(null);

      await expect(userDb.delete('nonexistent')).rejects.toEqual({
        message: 'user not found',
        code: 404
      });
    });

    it('should handle database errors during deletion', async () => {
      User.findByIdAndUpdate = jest.fn().mockRejectedValue(new Error('Database error'));

      await expect(userDb.delete('user123')).rejects.toEqual({
        message: 'user not found',
        code: 404
      });
    });

    it('should re-throw custom errors with code', async () => {
      const customError = { message: 'Custom delete error', code: 500 };
      
      User.findByIdAndUpdate = jest.fn().mockRejectedValue(customError);

      await expect(userDb.delete('user123')).rejects.toEqual(customError);
    });
  });

  describe('getByEmail method', () => {
    it('should return user when found by email', async () => {
      const mockUser = {
        _id: 'user123',
        email: 'test@example.com',
        name: 'Test User'
      };

      User.findOne = jest.fn().mockResolvedValue(mockUser);

      const result = await userDb.getByEmail('test@example.com');

      expect(User.findOne).toHaveBeenCalledWith({ email: 'test@example.com' });
      expect(result).toEqual(mockUser);
    });

    it('should return null when user not found by email', async () => {
      User.findOne = jest.fn().mockResolvedValue(null);

      const result = await userDb.getByEmail('nonexistent@example.com');

      expect(User.findOne).toHaveBeenCalledWith({ email: 'nonexistent@example.com' });
      expect(result).toBeNull();
    });

    it('should handle database errors when finding by email', async () => {
      User.findOne = jest.fn().mockRejectedValue(new Error('Database connection failed'));

      await expect(userDb.getByEmail('test@example.com')).rejects.toEqual({
        message: 'Error finding user by email',
        code: 500
      });
    });

    it('should re-throw custom errors with code', async () => {
      const customError = { message: 'Custom find error', code: 422 };
      
      User.findOne = jest.fn().mockRejectedValue(customError);

      await expect(userDb.getByEmail('test@example.com')).rejects.toEqual(customError);
    });

    it('should handle case-sensitive email searches', async () => {
      const mockUser = {
        _id: 'user123',
        email: 'Test@Example.com',
        name: 'Test User'
      };

      User.findOne = jest.fn().mockResolvedValue(mockUser);

      const result = await userDb.getByEmail('Test@Example.com');

      expect(User.findOne).toHaveBeenCalledWith({ email: 'Test@Example.com' });
      expect(result).toEqual(mockUser);
    });
  });

  describe('Integration Tests', () => {
    it('should handle complete user lifecycle', async () => {
      const createData = {
        email: 'lifecycle@example.com',
        password: 'hashedPassword',
        name: 'Lifecycle User'
      };

      // Mock create
      const mockCreatedUser = {
        _id: 'lifecycle123',
        email: 'lifecycle@example.com',
        save: jest.fn().mockResolvedValue()
      };
      User.mockImplementation(() => mockCreatedUser);

      const createResult = await userDb.create(createData);
      expect(createResult).toHaveProperty('_id', 'lifecycle123');

      // Mock get
      const mockFoundUser = {
        _id: 'lifecycle123',
        email: 'lifecycle@example.com',
        toJSON: jest.fn().mockReturnValue({
          _id: 'lifecycle123',
          email: 'lifecycle@example.com',
          name: 'Lifecycle User'
        })
      };
      User.findById = jest.fn().mockResolvedValue(mockFoundUser);

      const getResult = await userDb.get('lifecycle123');
      expect(getResult).toHaveProperty('email', 'lifecycle@example.com');

      // Mock update
      const mockUpdatedUser = {
        _id: 'lifecycle123',
        email: 'lifecycle@example.com',
        isVerified: true
      };
      User.findByIdAndUpdate = jest.fn().mockResolvedValue(mockUpdatedUser);

      const updateResult = await userDb.update('lifecycle123', { isVerified: true });
      expect(updateResult.success).toBe(true);

      // Mock delete
      const mockDeletedUser = {
        _id: 'lifecycle123',
        isActive: false
      };
      User.findByIdAndUpdate = jest.fn().mockResolvedValue(mockDeletedUser);

      const deleteResult = await userDb.delete('lifecycle123');
      expect(deleteResult.message).toBe('user deleted successfully');
    });

    it('should handle error propagation through methods', async () => {
      const userId = 'error123';
      
      // Test error propagation in get -> update chain
      User.findById = jest.fn().mockResolvedValue(null);
      
      await expect(userDb.get(userId)).rejects.toHaveProperty('code', 404);
      
      // Simulate successful get but failed update
      User.findById = jest.fn().mockResolvedValue({
        _id: userId,
        toJSON: () => ({ _id: userId })
      });
      User.findByIdAndUpdate = jest.fn().mockResolvedValue(null);
      
      await userDb.get(userId); // Should succeed
      await expect(userDb.update(userId, { name: 'test' })).rejects.toHaveProperty('code', 500);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty update data', async () => {
      const mockUser = {
        _id: 'user123',
        email: 'test@example.com',
        isVerified: false
      };

      User.findByIdAndUpdate = jest.fn().mockResolvedValue(mockUser);

      const result = await userDb.update('user123', {});

      expect(User.findByIdAndUpdate).toHaveBeenCalledWith(
        'user123',
        {},
        { new: true, runValidators: true }
      );
      expect(result.success).toBe(true);
    });

    it('should handle invalid ObjectId format gracefully', async () => {
      User.findById = jest.fn().mockRejectedValue(new Error('Cast to ObjectId failed'));

      await expect(userDb.get('invalid-id-format')).rejects.toEqual({
        message: 'user not found',
        code: 404
      });
    });
  });
});
