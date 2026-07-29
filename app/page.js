'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase-client';
import { Field, TextInput, Select, PrimaryButton, GhostButton } from '@/components/ui';
import { ROLES } from '@/lib/constants';
import { geocodeAdresse } from '@/lib/geo';

export default function AuthPage() {
  const supabase = createClient();
  const [mode, setMode] = useState('login'); // login | signup | sent | forgot | sent-reset
  const [form, setForm] = useState({ nom: '', prenom: '', email: '', password: '', role: 'joueur', telephone: '', adresse: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const isClub = form.role === 'club';

  // Inscription : validation puis création du compte. Supabase envoie un email de
  // confirmation ; le compte n'est actif qu'une fois le lien du mail cliqué.
  const handleSignup = async (e) => {
    e.preventDefault();
    setError('');
    const nomOk = isClub ? form.nom.trim() : (form.prenom.trim() && form.nom.trim());
    if (!nomOk || !form.email.trim() || !form.password || !form.telephone.trim()) {
      setError('Tous les champs sont requis, y compris le téléphone.'); return;
    }
    if (isClub && !form.adresse.trim()) {
      setError("L'adresse des locaux du club est requise."); return;
    }
    if (form.password.length < 6) { setError('Le mot de passe doit faire au moins 6 caractères.'); return; }

    setLoading(true);
    // Pour un club, on géolocalise l'adresse des locaux avant de créer le compte,
    // pour que les joueurs puissent la situer sur la carte depuis leur domicile.
    let geo = null;
    if (isClub) {
      geo = await geocodeAdresse(form.adresse);
      if (!geo) {
        setLoading(false);
        setError("Adresse non reconnue. Vérifie l'orthographe (ex. « 12 rue du Stade, Annemasse »).");
        return;
      }
    }

    const nomComplet = isClub ? form.nom.trim() : `${form.prenom.trim()} ${form.nom.trim()}`;
    const { error: signUpError } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        emailRedirectTo: `${window.location.origin}/app`,
        data: {
          nom: nomComplet,
          prenom: isClub ? null : form.prenom.trim(),
          role: form.role,
          telephone: form.telephone,
          adresse: isClub ? form.adresse.trim() : null,
          latitude: isClub ? geo.latitude : null,
          longitude: isClub ? geo.longitude : null,
        },
      },
    });
    setLoading(false);
    if (signUpError) { setError(signUpError.message); return; }
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

  if (mode === 'signup') {
    return wrap(
      <form onSubmit={handleSignup}>
        <h2 style={{ fontSize: 20, marginBottom: 18 }}>Créer un compte</h2>
        <Field label="Je suis…">
          <Select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} options={ROLES} />
        </Field>
        {isClub ? (
          <>
            <Field label="Nom du club">
              <TextInput required value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} placeholder="RC Annemasse" />
            </Field>
            <Field label="Adresse des locaux" hint="Adresse complète, ex. « 12 rue du Stade, Annemasse ». Visible des joueurs pour situer le club.">
              <TextInput required value={form.adresse} onChange={(e) => setForm({ ...form, adresse: e.target.value })} placeholder="12 rue du Stade, Annemasse" />
            </Field>
          </>
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
        <PrimaryButton type="submit" disabled={loading}>{loading ? 'Création du compte…' : 'Créer mon compte'}</PrimaryButton>
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
