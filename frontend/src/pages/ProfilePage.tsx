import { useState } from 'react';
import type { FormEvent } from 'react';
import { useAuth } from '../context/AuthContext';
import { userApi } from '../api/userApi';
import { useToast } from '../context/ToastContext';
import { toErrorMessage } from '../lib/errorMessage';

export function ProfilePage() {
  const { user, refreshProfile } = useAuth();
  const { notify } = useToast();
  const [fullName, setFullName] = useState(user?.fullName ?? '');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!user) return null;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!fullName.trim()) {
      setError('Full name cannot be empty.');
      return;
    }
    setError(null);
    setIsSaving(true);
    try {
      await userApi.updateMe({ fullName });
      await refreshProfile();
      notify('Profile updated.');
    } catch (err) {
      setError(toErrorMessage(err));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="profile-page">
      <h1>Your profile</h1>
      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <label htmlFor="email">Email</label>
        <input id="email" type="email" value={user.email} disabled />
        <p className="field-hint">Email can't be changed here.</p>

        <label htmlFor="role">Role</label>
        <input id="role" type="text" value={user.role} disabled />

        <label htmlFor="fullName">Full name</label>
        <input
          id="fullName"
          type="text"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
        />

        <button type="submit" className="button button--primary" disabled={isSaving}>
          {isSaving ? 'Saving…' : 'Save changes'}
        </button>
      </form>
    </div>
  );
}
