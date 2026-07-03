'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase-client';
import { Field, TextInput, Select, PrimaryButton, GhostButton } from '@/components/ui';
import { ROLES } from '@/lib/constants';

export default function AuthPage() {
  const supabase = createClient();
  const [mode, setMode] = useState('login'); // login | signup | verify-phone | sent | forgot | sent-reset
  const [form, setForm] = useState({ nom: '', prenom: '', email: '', password: '', role: 'joueur', telephone: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [simCode, setSimCode] = useState('');
  const [otpInput, setOtpInput] = useState('');

  const isClub = form.role === 'club';

  const genCode = () => String(Math.floor(100000 + Math.random() * 900000));

  // Étape 1 du signup : valider les champs, puis passer à la vérification du téléphone
  // (pas encore de vraie création de compte à ce stade).
  const handleSignupStart = (e) => {
    e.preventDefault();
    setError('');
    const nomOk = isClub ? form.nom.trim() : (form.prenom.trim() && form.nom.trim());
    if (!nomOk || !form.email.trim() || !form.password || !form.telephone.trim()) {
      setError('Tous les champs sont requis, y compris le téléphone.'); return;
    }
    if (form.password.length < 6) { setError('Le mot de passe doit faire au moins 6 caractères.'); return; }
    setSimCode(genCode());
    setOtpInput('');
    setMode('verify-phone');
  };

  // Étape 2 : vérification du code SMS simulé, puis création réelle du compte Supabase
  const handleVerifyPhone = async (e) => {
    e.preventDefault();
    if (otpInput.trim() !== simCode) { setError('Code incorrect.'); return; }
    setError(''); setLoading(true);
    const nomComplet = isClub ? form.nom.trim() : `${form.prenom.trim()} ${form.nom.trim()}`;
    const { error: signUpError } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: { data: { nom: nomComplet, prenom: isClub ? null : form.prenom.trim(), role: form.role, telephone: form.telephone } },
    });
    setLoading(false);
    if (signUpError) { setError(signUpError.message); setMode('signup'); return; }
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
          <img src="/logo.png" alt="Turnover" style={{ width: 30, height: 30, objectFit: 'contain', borderRadius: 6 }} />
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

  if (mode === 'verify-phone') {
    return wrap(
      <form onSubmit={handleVerifyPhone}>
        <h2 style={{ fontSize: 20, marginBottom: 6 }}>Vérification du téléphone</h2>
        <p style={{ color: '#8C9A8E', fontSize: 13, marginBottom: 18 }}>Entre le code envoyé au {form.telephone}.</p>
        <div style={{ background: 'rgba(212,255,63,0.08)', border: '1px dashed #D4FF3F', borderRadius: 10, padding: 16, marginBottom: 20 }}>
          <div style={{ fontSize: 11, color: '#D4FF3F', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>Code SMS (simulé)</div>
          <div style={{ fontFamily: 'monospace', fontSize: 26, fontWeight: 700, letterSpacing: '0.1em' }}>{simCode}</div>
          <div style={{ fontSize: 12, color: '#8C9A8E', marginTop: 6 }}>Simulation — dans la vraie appli, ce code serait envoyé par SMS.</div>
        </div>
        <Field label="Code à 6 chiffres">
          <TextInput value={otpInput} onChange={(e) => setOtpInput(e.target.value)} placeholder="000000" maxLength={6} />
        </Field>
        {error && <div style={{ color: '#FF5C5C', fontSize: 13, marginBottom: 14 }}>{error}</div>}
        <PrimaryButton type="submit" disabled={loading}>{loading ? 'Création du compte…' : 'Valider et créer mon compte'}</PrimaryButton>
        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <GhostButton type="button" onClick={() => { setMode('signup'); setError(''); }}>Retour</GhostButton>
        </div>
      </form>
    );
  }

  if (mode === 'signup') {
    return wrap(
      <form onSubmit={handleSignupStart}>
        <h2 style={{ fontSize: 20, marginBottom: 18 }}>Créer un compte</h2>
        <Field label="Je suis…">
          <Select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} options={ROLES} />
        </Field>
        {isClub ? (
          <Field label="Nom du club">
            <TextInput required value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} placeholder="RC Annemasse" />
          </Field>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <Field label="Prénom">
              <TextInput required value={form.prenom} onChange={(e) => setForm({ ...form, prenom: e.target.value })} placeholder="Marc" />
            </Field>
            <Field label="Nom">
              <TextInput required value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} placeholder="Dupuis" />
            </Field>
          </div>
        )}
        <Field label="Email">
          <TextInput type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="toi@exemple.com" />
        </Field>
        <Field label="Téléphone">
          <TextInput type="tel" required value={form.telephone} onChange={(e) => setForm({ ...form, telephone: e.target.value })} placeholder="06 12 34 56 78" />
        </Field>
        <Field label="Mot de passe">
          <TextInput type="password" required minLength={6} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="6 caractères minimum" />
        </Field>
        {error && <div style={{ color: '#FF5C5C', fontSize: 13, marginBottom: 14 }}>{error}</div>}
        <PrimaryButton type="submit" disabled={loading}>{loading ? '…' : 'Continuer'}</PrimaryButton>
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
