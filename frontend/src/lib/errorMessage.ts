import { ApiError, NetworkError } from '../api/client';

// Turns any thrown value from the API client into a user-facing string
export function toErrorMessage(err: unknown): string {
  if (err instanceof ApiError || err instanceof NetworkError) {
    return err.message;
  }
  if (err instanceof Error) {
    return err.message;
  }
  return 'Something went wrong. Please try again.';
}
