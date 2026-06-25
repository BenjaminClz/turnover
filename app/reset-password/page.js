'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase-client';
import { Field, TextInput, PrimaryButton } from '@/components/ui';

export default function ResetPasswordPage() {
  const supabase = createClient();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleReset = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    if (password.length < 6) {
      setError('6 caractères minimum.'); setLoading(false); return;
    }
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (updateError) { setError(updateError.message); return; }
    setDone(true);
    setTimeout(() => { window.location.href = '/app'; }, 1500);
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 400 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'center', marginBottom: 32 }}>
          <div style={{ width: 9, height: 9, background: '#D4FF3F', borderRadius: '50%' }} />
          <span className="turnover-anton" style={{ fontSize: 22 }}>TURNOVER</span>
        </div>
        <div style={{ background: '#152E26', border: '1px solid #274238', borderRadius: 16, padding: 28 }}>
          {done ? (
            <p style={{ color: '#D4FF3F', fontSize: 14 }}>Mot de passe mis à jour. Redirection…</p>
          ) : (
            <form onSubmit={handleReset}>
              <h2 style={{ fontSize: 20, marginBottom: 18 }}>Nouveau mot de passe</h2>
              <Field label="Choisis un nouveau mot de passe">
                <TextInput type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="6 caractères minimum" />
              </Field>
              {error && <div style={{ color: '#FF5C5C', fontSize: 13, marginBottom: 14 }}>{error}</div>}
              <PrimaryButton type="submit" disabled={loading}>{loading ? 'Mise à jour…' : 'Valider'}</PrimaryButton>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
