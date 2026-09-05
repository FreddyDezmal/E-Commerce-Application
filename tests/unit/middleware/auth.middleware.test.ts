import { authenticate } from '../../../src/middleware/authenticate';
import { verifyToken } from '../../../src/utils/jwt';

jest.mock('../../../src/utils/jwt', () => ({
  verifyToken: jest.fn()
}));

describe('Auth middleware', () => {
  const mockedVerifyToken = verifyToken as jest.MockedFunction<
    typeof verifyToken
  >;

  const createRequest = (authorization?: string) => ({
    headers: {
      ...(authorization !== undefined ? { authorization } : {})
    }
  }) as any;

  const response = {} as any;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should authenticate a valid customer token', () => {
    const request = createRequest('Bearer valid-token');
    const next = jest.fn();

    mockedVerifyToken.mockReturnValue({
      sub: 'user-123',
      role: 'customer'
    });

    authenticate(request, response, next);

    expect(mockedVerifyToken).toHaveBeenCalledWith('valid-token');
    expect(request.user).toEqual({
      id: 'user-123',
      role: 'customer'
    });
    expect(next).toHaveBeenCalledWith();
  });

  it('should authenticate a valid admin token', () => {
    const request = createRequest('Bearer admin-token');
    const next = jest.fn();

    mockedVerifyToken.mockReturnValue({
      sub: 'admin-123',
      role: 'admin'
    });

    authenticate(request, response, next);

    expect(mockedVerifyToken).toHaveBeenCalledWith('admin-token');
    expect(request.user).toEqual({
      id: 'admin-123',
      role: 'admin'
    });
    expect(next).toHaveBeenCalledWith();
  });

  it('should reject a missing Authorization header', () => {
    const request = createRequest();
    const next = jest.fn();

    authenticate(request, response, next);

    expect(mockedVerifyToken).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledTimes(1);

    const error = next.mock.calls[0][0];

    expect(error).toBeInstanceOf(Error);
    expect(error.message).toBe(
      'Missing or malformed Authorization header'
    );
  });

  it('should reject a malformed Authorization header', () => {
    const request = createRequest('Basic some-token');
    const next = jest.fn();

    authenticate(request, response, next);

    expect(mockedVerifyToken).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledTimes(1);

    const error = next.mock.calls[0][0];

    expect(error).toBeInstanceOf(Error);
    expect(error.message).toBe(
      'Missing or malformed Authorization header'
    );
  });

  it('should reject an invalid token', () => {
    const request = createRequest('Bearer invalid-token');
    const next = jest.fn();

    mockedVerifyToken.mockImplementation(() => {
      throw new Error('Invalid token');
    });

    authenticate(request, response, next);

    expect(mockedVerifyToken).toHaveBeenCalledWith('invalid-token');
    expect(next).toHaveBeenCalledTimes(1);

    const error = next.mock.calls[0][0];

    expect(error).toBeInstanceOf(Error);
    expect(error.message).toBe('Invalid or expired token');
  });

  it('should reject an expired token', () => {
    const request = createRequest('Bearer expired-token');
    const next = jest.fn();

    mockedVerifyToken.mockImplementation(() => {
      throw new Error('Token expired');
    });

    authenticate(request, response, next);

    expect(mockedVerifyToken).toHaveBeenCalledWith('expired-token');
    expect(next).toHaveBeenCalledTimes(1);

    const error = next.mock.calls[0][0];

    expect(error).toBeInstanceOf(Error);
    expect(error.message).toBe('Invalid or expired token');
  });
});