import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';

const SUGGEST_URL = 'http://localhost:5050/api/employees/suggest';

// String alanlar için autocomplete destekleyen input
export default function SuggestInput({ field, operator, value, onChange, placeholder }) {
  const [suggestions, setSuggestions]   = useState([]);
  const [open, setOpen]                 = useState(false);
  const [loading, setLoading]           = useState(false);
  const [highlighted, setHighlighted]   = useState(-1);
  const debounceRef                     = useRef(null);
  const wrapRef                         = useRef(null);

  // Debounced backend call
  const fetchSuggestions = useCallback((q) => {
    if (!q || q.length < 1) { setSuggestions([]); setOpen(false); return; }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const { data } = await axios.get(SUGGEST_URL, {
          params: { field, query: q, op: operator, max: 8 },
        });
        setSuggestions(data || []);
        setOpen((data || []).length > 0);
        setHighlighted(-1);
      } catch {
        setSuggestions([]);
        setOpen(false);
      } finally {
        setLoading(false);
      }
    }, 280); // 280ms debounce
  }, [field, operator]);

  useEffect(() => {
    fetchSuggestions(value);
  }, [value, fetchSuggestions]);

  // Close on outside click
  useEffect(() => {
    function onClickOutside(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  function handleKeyDown(e) {
    if (!open) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlighted(h => Math.min(h + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlighted(h => Math.max(h - 1, 0));
    } else if (e.key === 'Enter' && highlighted >= 0) {
      e.preventDefault();
      select(suggestions[highlighted]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  }

  function select(val) {
    onChange(val);
    setSuggestions([]);
    setOpen(false);
  }

  // Highlight matching part in suggestion text
  function highlight(text, query) {
    if (!query) return text;
    const idx = text.toLowerCase().indexOf(query.toLowerCase());
    if (idx === -1) return text;
    return (
      <>
        {text.slice(0, idx)}
        <mark className="si-mark">{text.slice(idx, idx + query.length)}</mark>
        {text.slice(idx + query.length)}
      </>
    );
  }

  return (
    <div ref={wrapRef} className="si-wrap">
      <div className="si-input-wrap">
        <input
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => suggestions.length > 0 && setOpen(true)}
          placeholder={placeholder || 'Değer girin...'}
          className="fp-input"
          autoComplete="off"
        />
        {loading && (
          <div className="si-spinner">
            <div className="si-spinner-dot" />
          </div>
        )}
      </div>

      {open && suggestions.length > 0 && (
        <ul className="si-dropdown">
          {suggestions.map((s, i) => (
            <li
              key={s}
              className={`si-item ${i === highlighted ? 'si-item--active' : ''}`}
              onMouseDown={e => { e.preventDefault(); select(s); }}
              onMouseEnter={() => setHighlighted(i)}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="si-item-icon">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <span>{highlight(s, value)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
