'use client';
import Select from 'react-select';
import { nationalites } from '@/lib/nationalites';

const options = nationalites.map((n) => ({ value: n.code, label: n.nom }));

const darkStyles = {
  control: (base, state) => ({
    ...base,
    background: 'var(--bg)',
    borderColor: state.isFocused ? 'var(--lime)' : 'var(--line)',
    borderWidth: 1.5,
    borderRadius: 8,
    minHeight: 44,
    boxShadow: 'none',
    '&:hover': { borderColor: 'var(--lime)' },
  }),
  menu: (base) => ({ ...base, background: 'var(--surface)', border: '1px solid var(--line)', zIndex: 20 }),
  option: (base, state) => ({
    ...base,
    background: state.isFocused ? 'var(--bg)' : 'transparent',
    color: 'var(--text)',
    cursor: 'pointer',
  }),
  multiValue: (base) => ({ ...base, background: 'var(--lime)', borderRadius: 6 }),
  multiValueLabel: (base) => ({ ...base, color: 'var(--on-lime)', fontWeight: 700 }),
  multiValueRemove: (base) => ({ ...base, color: 'var(--on-lime)', ':hover': { background: 'var(--lime-hover)', color: 'var(--on-lime)' } }),
  input: (base) => ({ ...base, color: 'var(--text)' }),
  placeholder: (base) => ({ ...base, color: 'var(--faint)' }),
  singleValue: (base) => ({ ...base, color: 'var(--text)' }),
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
