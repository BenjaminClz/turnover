'use client';
import Select from 'react-select';
import { nationalites } from '@/lib/nationalites';

const options = nationalites.map((n) => ({ value: n.code, label: n.nom }));

const darkStyles = {
  control: (base, state) => ({
    ...base,
    background: '#0B1F1A',
    borderColor: state.isFocused ? '#D4FF3F' : '#2C4A3D',
    borderWidth: 1.5,
    borderRadius: 8,
    minHeight: 44,
    boxShadow: 'none',
    '&:hover': { borderColor: '#D4FF3F' },
  }),
  menu: (base) => ({ ...base, background: '#152E26', border: '1.5px solid #2C4A3D', zIndex: 20 }),
  option: (base, state) => ({
    ...base,
    background: state.isFocused ? '#0B1F1A' : 'transparent',
    color: '#F5F0E6',
    cursor: 'pointer',
  }),
  multiValue: (base) => ({ ...base, background: '#D4FF3F', borderRadius: 6 }),
  multiValueLabel: (base) => ({ ...base, color: '#0B1F1A', fontWeight: 700 }),
  multiValueRemove: (base) => ({ ...base, color: '#0B1F1A', ':hover': { background: '#bfe835', color: '#0B1F1A' } }),
  input: (base) => ({ ...base, color: '#F5F0E6' }),
  placeholder: (base) => ({ ...base, color: '#5C6B5E' }),
  singleValue: (base) => ({ ...base, color: '#F5F0E6' }),
};

export function NationaliteSelect({ value, onChange }) {
  return (
    <Select
      isMulti
      options={options}
      value={options.filter((o) => (value || []).includes(o.value))}
      onChange={(selected) => onChange(selected.map((s) => s.value))}
      placeholder="Sélectionner une ou plusieurs nationalités"
      noOptionsMessage={() => 'Aucun pays trouvé'}
      styles={darkStyles}
    />
  );
}

export default NationaliteSelect;
