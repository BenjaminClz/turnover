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
    const results = await getGeocode({ address: description });
    const { lat, lng } = await getLatLng(results[0]);
    const pays = results[0].address_components.find((c) => c.types.includes('country'))?.long_name ?? '';
    onSelect({ ville: description, pays, lat, lng });
  };

  return (
    <div style={{ position: 'relative' }}>
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        disabled={!ready}
        placeholder="Rechercher une ville..."
        style={{
          width: '100%', background: '#0B1F1A', border: '1.5px solid #2C4A3D', borderRadius: 10,
          color: '#F5F0E6', padding: '14px 16px', fontSize: 16, outline: 'none', boxSizing: 'border-box',
          transition: 'border-color .15s ease, box-shadow .15s ease',
        }}
        onFocus={(e) => { e.target.style.borderColor = '#D4FF3F'; e.target.style.boxShadow = '0 0 0 3px rgba(212,255,63,0.15)'; }}
        onBlur={(e) => { e.target.style.borderColor = '#2C4A3D'; e.target.style.boxShadow = 'none'; }}
      />
      {status === 'OK' && (
        <ul style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4, background: '#152E26', border: '1.5px solid #2C4A3D', borderRadius: 10, boxShadow: '0 12px 32px rgba(0,0,0,0.45)', zIndex: 50, listStyle: 'none', padding: 0, overflow: 'hidden' }}>
          {data.map(({ place_id, description }) => (
            <li
              key={place_id}
              onClick={() => handleSelect(description)}
              style={{ padding: '11px 16px', cursor: 'pointer', fontSize: 14.5, color: '#F5F0E6' }}
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
