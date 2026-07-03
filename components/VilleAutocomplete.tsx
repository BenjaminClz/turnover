'use client';
import usePlacesAutocomplete, { getGeocode, getLatLng } from 'use-places-autocomplete';

export function VilleAutocomplete({ onSelect }: {
  onSelect: (data: { ville: string; pays: string; lat: number; lng: number }) => void;
}) {
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

  const handleSelect = async (description: string) => {
    setValue(description, false);
    clearSuggestions();
    const results = await getGeocode({ address: description });
    const { lat, lng } = await getLatLng(results[0]);
    const pays = results[0].address_components.find(c => c.types.includes('country'))?.long_name ?? '';
    onSelect({ ville: description, pays, lat, lng });
  };

  return (
    <div>
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        disabled={!ready}
        placeholder="Rechercher une ville..."
        className="w-full border rounded px-3 py-2"
      />
      {status === 'OK' && (
        <ul className="border rounded mt-1 bg-white shadow">
          {data.map(({ place_id, description }) => (
            <li
              key={place_id}
              onClick={() => handleSelect(description)}
              className="px-3 py-2 hover:bg-gray-100 cursor-pointer"
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
