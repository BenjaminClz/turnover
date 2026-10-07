'use client';

import { useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase-client';
import { sortExperiences, formatPeriode } from './ExperienceTimeline';

const T = {
  card: '#16302a',
  input: '#0c1f1a',
  border: '#2C4A3D',
  text: '#eef3ef',
  muted: '#A4B0A6',
  lime: '#D4FF3F',
  danger: '#ff6b6b',
};

const NIVEAUX = [
  'Top 14', 'Pro D2', 'Nationale', 'Nationale 2',
  'Fédérale 1', 'Fédérale 2', 'Fédérale 3',
  'Régionale 1', 'Régionale 2', 'Régionale 3',
  'Suisse LNA', 'Suisse LNB', 'Suisse 1re ligue',
  'Universitaire', 'Loisir',
];

const POSTES = [
  'Pilier', 'Talonneur', 'Deuxième ligne', 'Troisième ligne aile', 'Troisième ligne centre',
  'Demi de mêlée', "Demi d'ouverture", 'Centre', 'Ailier', 'Arrière',
];

const CURRENT_YEAR = new Date().getFullYear();
const EMPTY = { club_name: '', start_year: '', end_year: '', en_cours: false, level: '', position: '', description: '' };

const css = `
.tv-xp input:focus, .tv-xp textarea:focus { outline: 2px solid ${T.lime}; outline-offset: 1px; }
.tv-xp button:focus-visible { outline: 2px solid ${T.lime}; outline-offset: 2px; }
.tv-xp-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
@media (max-width: 640px) { .tv-xp-row { grid-template-columns: 1fr; } }
`;

const inputStyle = {
  width: '100%',
  boxSizing: 'border-box',
  background: T.input,
  border: `1px solid ${T.border}`,
  borderRadius: 10,
  padding: '10px 12px',
  color: T.text,
  fontSize: 15,
  fontFamily: 'inherit',
};

const labelStyle = { display: 'block', fontSize: 13, color: T.muted, marginBottom: 6 };

const btnPrimary = {
  background: T.lime,
  color: '#0c1f1a',
  border: 'none',
  borderRadius: 10,
  padding: '10px 16px',
  fontWeight: 700,
  fontSize: 14,
  cursor: 'pointer',
};

const btnSecondary = {
  background: 'transparent',
  color: T.text,
  border: `1px solid ${T.border}`,
  borderRadius: 10,
  padding: '8px 14px',
  fontWeight: 600,
  fontSize: 13,
  cursor: 'pointer',
};

function validate(f) {
  if (!f.club_name.trim()) return 'Indique le nom du club.';
  const s = parseInt(f.start_year, 10);
  if (!s || s < 1950 || s > CURRENT_YEAR) return `L'année de début doit être comprise entre 1950 et ${CURRENT_YEAR}.`;
  if (!f.en_cours) {
    const e = parseInt(f.end_year, 10);
    if (!e) return "Indique l'année de fin, ou coche « J'y joue encore ».";
    if (e < s) return "L'année de fin doit être égale ou postérieure à l'année de début.";
    if (e > CURRENT_YEAR + 1) return `L'année de fin ne peut pas dépasser ${CURRENT_YEAR + 1}.`;
  }
  return null;
}

export default function ExperienceEditor({ userId }) {
  const [supabase] = useState(() => createClient());
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null); // null | 'new' | id
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [pending, setPending] = useState(null);
  const pendingRef = useRef(null);
  const clubInputRef = useRef(null);

  useEffect(() => {
    if (!userId) return;
    supabase
      .from('player_experiences')
      .select('*')
      .eq('user_id', userId)
      .then(({ data, error }) => {
        if (!error) setItems(sortExperiences(data || []));
        setLoading(false);
      });
  }, [supabase, userId]);

  // Si le composant est démonté pendant le délai d'annulation, on finalise la suppression
  useEffect(() => {
    return () => {
      const p = pendingRef.current;
      if (p) {
        clearTimeout(p.timer);
        supabase.from('player_experiences').delete().eq('id', p.item.id).then(() => {});
      }
    };
  }, [supabase]);

  useEffect(() => {
    if (editingId && clubInputRef.current) clubInputRef.current.focus();
  }, [editingId]);

  const set = (key) => (ev) => {
    const value = ev.target.type === 'checkbox' ? ev.target.checked : ev.target.value;
    setForm((f) => ({ ...f, [key]: value }));
  };

  const startNew = () => {
    setForm(EMPTY);
    setError('');
    setEditingId('new');
  };

  const startEdit = (item) => {
    setForm({
      club_name: item.club_name,
      start_year: String(item.start_year),
      end_year: item.end_year ? String(item.end_year) : '',
      en_cours: !item.end_year,
      level: item.level || '',
      position: item.position || '',
      description: item.description || '',
    });
    setError('');
    setEditingId(item.id);
  };

  const cancel = () => {
    setEditingId(null);
    setForm(EMPTY);
    setError('');
  };

  const save = async () => {
    const problem = validate(form);
    if (problem) {
      setError(problem);
      return;
    }
    setSaving(true);
    setError('');

    const payload = {
      club_name: form.club_name.trim(),
      start_year: parseInt(form.start_year, 10),
      end_year: form.en_cours ? null : parseInt(form.end_year, 10),
      level: form.level.trim() || null,
      position: form.position.trim() || null,
      description: form.description.trim() || null,
    };

    const query =
      editingId === 'new'
        ? supabase.from('player_experiences').insert({ ...payload, user_id: userId })
        : supabase.from('player_experiences').update(payload).eq('id', editingId);

    const { data, error: dbError } = await query.select().single();
    setSaving(false);

    if (dbError) {
      console.error("Supabase:", dbError);
      setError("L'enregistrement a échoué. Vérifie ta connexion et réessaie.");
      return;
    }

    setItems((prev) =>
      sortExperiences(editingId === 'new' ? [...prev, data] : prev.map((i) => (i.id === data.id ? data : i)))
    );
    cancel();
  };

  const commitDelete = async () => {
    const p = pendingRef.current;
    if (!p) return;
    clearTimeout(p.timer);
    pendingRef.current = null;
    setPending(null);
    const { error: dbError } = await supabase.from('player_experiences').delete().eq('id', p.item.id);
    if (dbError) {
      console.error("Supabase:", dbError);
      setItems((prev) => sortExperiences([...prev, p.item]));
      setError('La suppression a échoué. Réessaie.');
    }
  };

  const askDelete = (item) => {
    if (pendingRef.current) commitDelete();
    setItems((prev) => prev.filter((i) => i.id !== item.id));
    const timer = setTimeout(commitDelete, 5000);
    pendingRef.current = { item, timer };
    setPending(item);
  };

  const undoDelete = () => {
    const p = pendingRef.current;
    if (!p) return;
    clearTimeout(p.timer);
    pendingRef.current = null;
    setPending(null);
    setItems((prev) => sortExperiences([...prev, p.item]));
  };

  const formBlock = (
    <div
      style={{
        border: `1px solid ${T.border}`,
        borderRadius: 12,
        padding: 16,
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        marginBottom: 16,
      }}
    >
      <div>
        <label style={labelStyle} htmlFor="xp-club">Club</label>
        <input
          id="xp-club"
          ref={clubInputRef}
          style={inputStyle}
          value={form.club_name}
          onChange={set('club_name')}
          maxLength={120}
          placeholder="Ex. RC Annemasse"
        />
      </div>

      <div className="tv-xp-row">
        <div>
          <label style={labelStyle} htmlFor="xp-start">Année d'arrivée</label>
          <input
            id="xp-start"
            style={inputStyle}
            type="number"
            inputMode="numeric"
            min={1950}
            max={CURRENT_YEAR}
            value={form.start_year}
            onChange={set('start_year')}
            placeholder={String(CURRENT_YEAR - 2)}
          />
        </div>
        <div>
          <label style={labelStyle} htmlFor="xp-end">Année de départ</label>
          <input
            id="xp-end"
            style={{ ...inputStyle, opacity: form.en_cours ? 0.4 : 1 }}
            type="number"
            inputMode="numeric"
            min={1950}
            max={CURRENT_YEAR + 1}
            value={form.en_cours ? '' : form.end_year}
            onChange={set('end_year')}
            disabled={form.en_cours}
            placeholder={String(CURRENT_YEAR)}
          />
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, fontSize: 14, cursor: 'pointer' }}>
            <input type="checkbox" checked={form.en_cours} onChange={set('en_cours')} />
            J'y joue encore
          </label>
        </div>
      </div>

      <div className="tv-xp-row">
        <div>
          <label style={labelStyle} htmlFor="xp-level">Niveau</label>
          <input
            id="xp-level"
            style={inputStyle}
            list="xp-niveaux"
            value={form.level}
            onChange={set('level')}
            maxLength={60}
            placeholder="Ex. Fédérale 2"
          />
          <datalist id="xp-niveaux">
            {NIVEAUX.map((n) => <option key={n} value={n} />)}
          </datalist>
        </div>
        <div>
          <label style={labelStyle} htmlFor="xp-position">Poste occupé</label>
          <input
            id="xp-position"
            style={inputStyle}
            list="xp-postes"
            value={form.position}
            onChange={set('position')}
            maxLength={60}
            placeholder="Ex. Demi de mêlée"
          />
          <datalist id="xp-postes">
            {POSTES.map((p) => <option key={p} value={p} />)}
          </datalist>
        </div>
      </div>

      <div>
        <label style={labelStyle} htmlFor="xp-desc">Ce que tu y as fait (facultatif)</label>
        <textarea
          id="xp-desc"
          style={{ ...inputStyle, minHeight: 80, resize: 'vertical' }}
          value={form.description}
          onChange={set('description')}
          maxLength={500}
          placeholder="Titulaire, capitaine, montée en Fédérale 1…"
        />
        <div style={{ textAlign: 'right', fontSize: 12, color: T.muted, marginTop: 4 }}>
          {form.description.length}/500
        </div>
      </div>

      {error && <div role="alert" style={{ color: T.danger, fontSize: 14 }}>{error}</div>}

      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
        <button type="button" style={btnSecondary} onClick={cancel} disabled={saving}>Annuler</button>
        <button type="button" style={{ ...btnPrimary, opacity: saving ? 0.6 : 1 }} onClick={save} disabled={saving}>
          {saving ? 'Enregistrement…' : 'Enregistrer'}
        </button>
      </div>
    </div>
  );

  return (
    <section
      className="tv-xp"
      style={{
        background: T.card,
        border: `1px solid ${T.border}`,
        borderRadius: 16,
        padding: 20,
        color: T.text,
      }}
    >
      <style>{css}</style>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 16 }}>
        <div>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Parcours</h3>
          <p style={{ margin: '4px 0 0', fontSize: 14, color: T.muted }}>
            Les clubs où tu as joué, visibles sur ton profil.
          </p>
        </div>
        {!editingId && (
          <button type="button" style={btnPrimary} onClick={startNew}>Ajouter un club</button>
        )}
      </div>

      {editingId === 'new' && formBlock}

      {pending && (
        <div
          role="status"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            background: 'rgba(255,255,255,0.06)',
            borderRadius: 10,
            padding: '10px 14px',
            marginBottom: 12,
            fontSize: 14,
          }}
        >
          <span>{pending.club_name} retiré de ton parcours.</span>
          <button type="button" style={btnSecondary} onClick={undoDelete}>Annuler</button>
        </div>
      )}

      {loading ? (
        <p style={{ color: T.muted, fontSize: 14, margin: 0 }}>Chargement du parcours…</p>
      ) : items.length === 0 && editingId !== 'new' ? (
        <p style={{ color: T.muted, fontSize: 14, margin: 0 }}>
          Aucun club pour l'instant. Ajoute les clubs où tu as joué pour que les recruteurs voient ton parcours.
        </p>
      ) : (
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {items.map((item) =>
            editingId === item.id ? (
              <li key={item.id}>{formBlock}</li>
            ) : (
              <li
                key={item.id}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  gap: 12,
                  padding: '12px 0',
                  borderTop: `1px solid ${T.border}`,
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 700 }}>{item.club_name}</div>
                  <div style={{ color: T.muted, fontSize: 13, marginTop: 2 }}>
                    {[formatPeriode(item), item.level, item.position].filter(Boolean).join(', ')}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                  <button type="button" style={btnSecondary} onClick={() => startEdit(item)} disabled={!!editingId}>
                    Modifier
                  </button>
                  <button type="button" style={btnSecondary} onClick={() => askDelete(item)} disabled={!!editingId}>
                    Supprimer
                  </button>
                </div>
              </li>
            )
          )}
        </ul>
      )}
    </section>
  );
}
