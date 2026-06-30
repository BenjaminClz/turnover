'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase-client';
import { PageTitle, PageSubtitle, EmptyState, Badge } from '@/components/ui';

const TARGET_LABELS = {
  player_listing: 'Profil joueur', staff_listing: 'Profil staff', club_need: 'Annonce club',
  message: 'Message', profile: 'Profil utilisateur',
};

export default function AdminTab({ showToast }) {
  const supabase = createClient();
  const [reports, setReports] = useState([]);
  const [suspendedProfiles, setSuspendedProfiles] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const [{ data: r }, { data: s }] = await Promise.all([
      supabase.from('reports').select('*, reporter:profiles!reports_reporter_id_fkey(nom), target_owner:profiles!reports_target_owner_id_fkey(nom, suspended)').order('created_at', { ascending: false }),
      supabase.from('profiles').select('*').eq('suspended', true),
    ]);
    setReports(r || []);
    setSuspendedProfiles(s || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  // Regroupe les signalements par cible (target_owner_id + target_type + target_id)
  const grouped = {};
  for (const r of reports) {
    const key = `${r.target_type}:${r.target_id}`;
    if (!grouped[key]) grouped[key] = { ...r, reports: [] };
    grouped[key].reports.push(r);
  }
  const groupedList = Object.values(grouped).sort((a, b) => b.reports.length - a.reports.length);

  const handleReactivate = async (profileId) => {
    const { error } = await supabase.from('profiles').update({ suspended: false }).eq('id', profileId);
    if (error) { showToast('Erreur lors de la réactivation.'); return; }
    showToast('Compte réactivé.');
    load();
  };

  const handleDismiss = async (reportIds) => {
    const { error } = await supabase.from('reports').delete().in('id', reportIds);
    if (error) { showToast('Erreur lors du rejet.'); return; }
    showToast('Signalement(s) rejeté(s).');
    load();
  };

  return (
    <div>
      <PageTitle>Administration</PageTitle>
      <PageSubtitle>Signalements reçus et comptes suspendus.</PageSubtitle>

      {suspendedProfiles.length > 0 && (
        <div style={{ marginBottom: 36 }}>
          <h2 style={{ fontSize: 15, color: '#FF6B6B', marginBottom: 14, textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 700 }}>
            Comptes suspendus ({suspendedProfiles.length})
          </h2>
          <div style={{ display: 'grid', gap: 10 }}>
            {suspendedProfiles.map((p) => (
              <div key={p.id} style={{ background: 'rgba(255,107,107,0.06)', border: '1.5px solid #FF6B6B', borderRadius: 12, padding: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                <div>
                  <div style={{ fontWeight: 700 }}>{p.nom}</div>
                  <div style={{ fontSize: 13, color: '#A4B0A6' }}>{p.role}</div>
                </div>
                <button onClick={() => handleReactivate(p.id)} style={{ background: '#D4FF3F', color: '#0B1F1A', border: 'none', padding: '9px 18px', borderRadius: 8, fontWeight: 700, fontSize: 13.5, cursor: 'pointer' }}>Réactiver le compte</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {loading ? (
        <div style={{ color: '#A4B0A6', textAlign: 'center', padding: 40 }}>Chargement…</div>
      ) : groupedList.length === 0 ? (
        <EmptyState icon="🛡️" title="Aucun signalement" sub="Tout est calme pour l'instant." />
      ) : (
        <div>
          <h2 style={{ fontSize: 15, color: '#D4FF3F', marginBottom: 14, textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 700 }}>
            Signalements groupés par cible ({groupedList.length})
          </h2>
          <div style={{ display: 'grid', gap: 12 }}>
            {groupedList.map((g) => (
              <div key={`${g.target_type}:${g.target_id}`} style={{ background: '#152E26', border: '1.5px solid #2C4A3D', borderRadius: 14, padding: 18 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: 12 }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>{TARGET_LABELS[g.target_type]} — {g.target_owner?.nom}</div>
                    <div style={{ fontSize: 13, color: '#A4B0A6', marginTop: 2 }}>
                      {g.reports.length} signalement{g.reports.length > 1 ? 's' : ''}
                      {g.target_owner?.suspended && <span style={{ marginLeft: 8 }}><Badge tone="urgent">Compte suspendu</Badge></span>}
                    </div>
                  </div>
                  <button onClick={() => handleDismiss(g.reports.map((r) => r.id))} style={{ background: 'transparent', border: '1.5px solid #2C4A3D', color: '#A4B0A6', padding: '8px 14px', borderRadius: 7, fontWeight: 600, fontSize: 12.5, cursor: 'pointer' }}>Rejeter ces signalements</button>
                </div>
                <div style={{ display: 'grid', gap: 8 }}>
                  {g.reports.map((r) => (
                    <div key={r.id} style={{ fontSize: 13, color: '#C7CFC8', background: '#0B1F1A', borderRadius: 8, padding: '8px 12px' }}>
                      <span style={{ color: '#8C9A8E' }}>Signalé par {r.reporter?.nom} :</span> {r.reason || <em>aucune raison donnée</em>}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
