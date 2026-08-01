import { useState, useEffect } from 'react';

// Fixes the classic mobile bug: a number input pre-filled with "1", user taps
// and types "2000" — mobile keyboards insert at cursor position rather than
// replacing, so it becomes "12000". Fix: select all on focus (desktop) AND
// track the raw string locally so an empty field doesn't collapse to a
// phantom "0" while typing, but still commits a valid integer on blur.
export default function QuantityInput({ value, onChange, min = 1, max, className = '' }) {
  const [local, setLocal] = useState(String(value ?? ''));

  useEffect(() => { setLocal(String(value ?? '')); }, [value]);

  const handleFocus = (e) => e.target.select();

  const handleChange = (e) => {
    const raw = e.target.value.replace(/[^\d]/g, '');
    setLocal(raw);
    if (raw === '') return; // don't commit mid-edit
    let num = parseInt(raw, 10);
    if (max !== undefined) num = Math.min(num, max);
    onChange(num);
  };

  const handleBlur = () => {
    let num = parseInt(local, 10);
    if (Number.isNaN(num) || num < min) num = min;
    if (max !== undefined) num = Math.min(num, max);
    setLocal(String(num));
    onChange(num);
  };

  return (
    <input
      type="text"
      inputMode="numeric"
      pattern="[0-9]*"
      value={local === '' ? '' : local}
      onFocus={handleFocus}
      onChange={handleChange}
      onBlur={handleBlur}
      className={`input-field text-center ${className}`}
    />
  );
}
