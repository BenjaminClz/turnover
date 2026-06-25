'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase-client';
import { Field, TextInput, Select, PrimaryButton, GhostButton } from '@/components/ui';

export default function AuthPage() {
  const supabase = createClient();
  const [mode, setMode] = useState('login'); // login | signup | forgot | sent
  const [form, setForm] = useState({ nom: '', email: '', password: '', role: 'joueur' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignup = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    if (!form.nom.trim() || !form.email.trim() || !form.password) {
      setError('Tous les champs sont requis.'); setLoading(false); return;
    }
    const { data, error: signUpError } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: { data: { nom: form.nom, role: form.role } },
    });
    if (signUpError) {
      setError(signUpError.message); setLoading(false); return;
    }
    // Le profil sera créé automatiquement via un trigger SQL (voir guide) à la confirmation d'email.
    setLoading(false);
    setMode('sent');
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: form.email,
      password: form.password,
    });
    setLoading(false);
    if (signInError) {
      setError(
        signInError.message.includes('Email not confirmed')
          ? 'Confirme ton email avant de te connecter (vérifie ta boîte de réception).'
          : 'Email ou mot de passe incorrect.'
      );
      return;
    }
    window.location.href = '/app';
  };

  const handleForgot = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(form.email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (resetError) { setError(resetError.message); return; }
    setMode('sent-reset');
  };

  const wrap = (content) => (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 400 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'center', marginBottom: 32 }}>
          <div style={{ width: 9, height: 9, background: '#D4FF3F', borderRadius: '50%' }} />
          <span className="turnover-anton" style={{ fontSize: 22 }}>TURNOVER</span>
        </div>
        <div style={{ background: '#152E26', border: '1px solid #274238', borderRadius: 16, padding: 28 }}>
          {content}
        </div>
      </div>
    </div>
  );

  if (mode === 'sent') {
    return wrap(
      <div>
        <h2 style={{ fontSize: 20, marginBottom: 10 }}>Vérifie ta boîte mail</h2>
        <p style={{ color: '#8C9A8E', fontSize: 14, lineHeight: 1.6 }}>
          Un email de confirmation a été envoyé à <strong style={{ color: '#F5F0E6' }}>{form.email}</strong>.
          Clique sur le lien qu'il contient pour activer ton compte, puis reviens te connecter ici.
        </p>
        <div style={{ marginTop: 20 }}>
          <GhostButton onClick={() => setMode('login')}>Retour à la connexion</GhostButton>
        </div>
      </div>
    );
  }

  if (mode === 'sent-reset') {
    return wrap(
      <div>
        <h2 style={{ fontSize: 20, marginBottom: 10 }}>Email envoyé</h2>
        <p style={{ color: '#8C9A8E', fontSize: 14, lineHeight: 1.6 }}>
          Si un compte existe avec <strong style={{ color: '#F5F0E6' }}>{form.email}</strong>, un lien de réinitialisation vient d'être envoyé. Clique sur ce lien pour choisir un nouveau mot de passe.
        </p>
        <div style={{ marginTop: 20 }}>
          <GhostButton onClick={() => setMode('login')}>Retour à la connexion</GhostButton>
        </div>
      </div>
    );
  }

  if (mode === 'forgot') {
    return wrap(
      <form onSubmit={handleForgot}>
        <h2 style={{ fontSize: 20, marginBottom: 6 }}>Mot de passe oublié</h2>
        <p style={{ color: '#8C9A8E', fontSize: 13, marginBottom: 18 }}>Entre ton email, tu recevras un vrai lien de réinitialisation.</p>
        <Field label="Email">
          <TextInput type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="toi@exemple.com" />
        </Field>
        {error && <div style={{ color: '#FF5C5C', fontSize: 13, marginBottom: 14 }}>{error}</div>}
        <PrimaryButton type="submit" disabled={loading}>{loading ? 'Envoi…' : 'Envoyer le lien'}</PrimaryButton>
        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <GhostButton type="button" onClick={() => { setMode('login'); setError(''); }}>Retour à la connexion</GhostButton>
        </div>
      </form>
    );
  }

  if (mode === 'signup') {
    return wrap(
      <form onSubmit={handleSignup}>
        <h2 style={{ fontSize: 20, marginBottom: 18 }}>Créer un compte</h2>
        <Field label="Nom (ou nom du club)">
          <TextInput required value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} placeholder="Marc Dupuis / RC Annemasse" />
        </Field>
        <Field label="Je suis…">
          <Select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} options={['joueur', 'club']} />
        </Field>
        <Field label="Email">
          <TextInput type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="toi@exemple.com" />
        </Field>
        <Field label="Mot de passe">
          <TextInput type="password" required minLength={6} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="6 caractères minimum" />
        </Field>
        {error && <div style={{ color: '#FF5C5C', fontSize: 13, marginBottom: 14 }}>{error}</div>}
        <PrimaryButton type="submit" disabled={loading}>{loading ? 'Création…' : 'Créer mon compte'}</PrimaryButton>
        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <GhostButton type="button" onClick={() => { setMode('login'); setError(''); }}>J'ai déjà un compte</GhostButton>
        </div>
      </form>
    );
  }

  return wrap(
    <form onSubmit={handleLogin}>
      <h2 style={{ fontSize: 20, marginBottom: 18 }}>Connexion</h2>
      <Field label="Email">
        <TextInput type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="toi@exemple.com" />
      </Field>
      <Field label="Mot de passe">
        <TextInput type="password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="••••••••" />
      </Field>
      {error && <div style={{ color: '#FF5C5C', fontSize: 13, marginBottom: 14 }}>{error}</div>}
      <PrimaryButton type="submit" disabled={loading}>{loading ? 'Connexion…' : 'Se connecter'}</PrimaryButton>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 16 }}>
        <GhostButton type="button" onClick={() => { setMode('signup'); setError(''); }}>Créer un compte</GhostButton>
        <GhostButton type="button" onClick={() => { setMode('forgot'); setError(''); }}>Mot de passe oublié ?</GhostButton>
      </div>
    </form>
  );
}
