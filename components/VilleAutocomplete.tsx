'use client';
import usePlacesAutocomplete, { getGeocode, getLatLng } from 'use-places-autocomplete';

export function VilleAutocomplete({ onSelect }) {
  const {
    ready,
    value,
    suggestions: { status, data },
    setValue,
    clearSuggestions,
  } = usePlacesAutocomplete({
    requestOptions: { types: ['(cities)'] },
    debounce: 300,
  });

  const handleSelect = async (description) => {
    setValue(description, false);
    clearSuggestions();
    // Toujours transmettre la ville choisie au formulaire, même si le géocodage
    // précis échoue ci-dessous : un repli (API française) prendra le relais ensuite.
    try {
      const results = await getGeocode({ address: description });
      const { lat, lng } = await getLatLng(results[0]);
      const pays = results[0].address_components.find((c) => c.types.includes('country'))?.long_name ?? '';
      onSelect({ ville: description, pays, latitude: lat, longitude: lng });
    } catch (err) {
      onSelect({ ville: description, pays: '', latitude: null, longitude: null });
    }
  };

  return (
    <div style={{ position: 'relative' }}>
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        disabled={!ready}
        placeholder="Rechercher une ville..."
        autoComplete="off"
        name="turnover-recherche-ville"
        style={{
          width: '100%', background: 'var(--bg)', border: '1px solid var(--line)', borderRadius: 8,
          color: 'var(--text)', padding: '14px 16px', fontSize: 16, outline: 'none', boxSizing: 'border-box',
          transition: 'border-color .15s ease, box-shadow .15s ease',
        }}
        onFocus={(e) => { e.target.style.borderColor = 'var(--lime)'; e.target.style.boxShadow = '0 0 0 3px rgba(212,255,63,0.15)'; }}
        onBlur={(e) => { e.target.style.borderColor = 'var(--line)'; e.target.style.boxShadow = 'none'; }}
      />
      {status === 'OK' && (
        <ul style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4, background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 8, boxShadow: 'var(--shadow-pop)', zIndex: 50, listStyle: 'none', padding: 0, overflow: 'hidden' }}>
          {data.map(({ place_id, description }) => (
            <li
              key={place_id}
              onClick={() => handleSelect(description)}
              style={{ padding: '11px 16px', cursor: 'pointer', fontSize: 15, color: 'var(--text)' }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(212,255,63,0.08)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
              {description}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default VilleAutocomplete;
