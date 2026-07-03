import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';

export function StatsRadar({ stats }) {
  const data = [
    { stat: 'Vitesse', valeur: stats.stat_vitesse ?? 50 },
    { stat: 'Défense', valeur: stats.stat_defense ?? 50 },
    { stat: 'Vision', valeur: stats.stat_vision ?? 50 },
    { stat: 'Technique', valeur: stats.stat_technique ?? 50 },
    { stat: 'Combat', valeur: stats.stat_combat ?? 50 },
    { stat: 'Attaque', valeur: stats.stat_attaque ?? 50 },
    { stat: 'Physique', valeur: stats.stat_physique ?? 50 },
  ];

  return (
    <ResponsiveContainer width="100%" height={280}>
      <RadarChart data={data}>
        <PolarGrid stroke="#2C4A3D" />
        <PolarAngleAxis dataKey="stat" tick={{ fill: '#A4B0A6', fontSize: 12 }} />
        <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: '#5C6B5E', fontSize: 10 }} />
        <Radar dataKey="valeur" stroke="#D4FF3F" fill="#D4FF3F" fillOpacity={0.35} />
      </RadarChart>
    </ResponsiveContainer>
  );
}

export default StatsRadar;
