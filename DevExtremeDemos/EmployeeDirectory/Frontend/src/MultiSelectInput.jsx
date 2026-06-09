import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';

const SUGGEST_URL = 'http://localhost:5050/api/employees/suggest';

// ─── Individual chip ──────────────────────────────────────────────────────────
function Chip({ label, onRemove }) {
  return (
    <span className="msi-chip">
      {label}
      <button className="msi-chip-x" onClick={onRemove} type="button">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </span>
  );
}

// ─── Main MultiSelectInput ────────────────────────────────────────────────────
export default function MultiSelectInput({ field, operator, selectedValues = [], onChange, placeholder }) {
  const [query,       setQuery]       = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [open,        setOpen]        = useState(false);
  const [loading,     setLoading]     = useState(false);
  const [highlighted, setHighlighted] = useState(-1);
  const debounceRef  = useRef(null);
  const inputRef     = useRef(null);
  const wrapRef      = useRef(null);

  // selectedValues ref'i — fetch'in selectedValues'a bağımlı olmaması için
  // böylece seçim yapıldığında dropdown kapanmaz ve yeniden fetch tetiklenmez
  const selectedValuesRef = useRef(selectedValues);
  useEffect(() => { selectedValuesRef.current = selectedValues; }, [selectedValues]);

  // ── Fetch suggestions ──────────────────────────────────────────────────────
  // selectedValues'ı dependency'den çıkardık → seçim dropdown'u kapatmaz
  const fetchSuggestions = useCallback((q) => {
    clearTimeout(debounceRef.current);
    if (!q || q.length < 1) {
      // Query temizlenince: eğer seçili olanlar varsa onları göster, yoksa kapat
      setSuggestions([]);
      setOpen(false);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const { data } = await axios.get(SUGGEST_URL, {
          params: { field, query: q, op: operator || 'contains', max: 15 },
        });
        const results = data || [];
        // Seçili olanları listenin BAŞINA koy, checked olarak göster
        const selected   = results.filter(s => selectedValuesRef.current.includes(s));
        const unselected = results.filter(s => !selectedValuesRef.current.includes(s));
        const ordered    = [...selected, ...unselected];
        setSuggestions(ordered);
        setOpen(ordered.length > 0);
        setHighlighted(-1);
      } catch {
        setSuggestions([]);
        setOpen(false);
      } finally {
        setLoading(false);
      }
    }, 250);
  }, [field, operator]); // ← selectedValues BURADA YOK: seçim dropdown'u resetlemez

  // Query değişince fetch
  useEffect(() => { fetchSuggestions(query); }, [query, fetchSuggestions]);

  // ── Close on outside click ─────────────────────────────────────────────────
  useEffect(() => {
    function onOut(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onOut);
    return () => document.removeEventListener('mousedown', onOut);
  }, []);

  // ── Toggle — sadece listeyi ve chip'i günceller, dropdown KAPANMAZ ─────────
  function toggle(val) {
    const current = selectedValuesRef.current;
    if (current.includes(val)) {
      onChange(current.filter(v => v !== val));
    } else {
      onChange([...current, val]);
    }
    // Dropdown açık kalsın, input focus'u kalsın
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  function removeChip(val) {
    onChange(selectedValues.filter(v => v !== val));
  }

  // ── Keyboard nav ───────────────────────────────────────────────────────────
  function handleKeyDown(e) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!open && suggestions.length > 0) setOpen(true);
      setHighlighted(h => Math.min(h + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlighted(h => Math.max(h - 1, 0));
    } else if (e.key === 'Enter' && highlighted >= 0) {
      e.preventDefault();
      toggle(suggestions[highlighted]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  }

  // ── Matching text highlight ────────────────────────────────────────────────
  function highlightMatch(text, q) {
    if (!q) return text;
    const idx = text.toLowerCase().indexOf(q.toLowerCase());
    if (idx === -1) return text;
    return (
      <>
        {text.slice(0, idx)}
        <mark className="msi-mark">{text.slice(idx, idx + q.length)}</mark>
        {text.slice(idx + q.length)}
      </>
    );
  }

  return (
    <div ref={wrapRef} className="msi-wrap">
      {/* ── Selected chips ── */}
      {selectedValues.length > 0 && (
        <div className="msi-chips">
          {selectedValues.map(v => (
            <Chip key={v} label={v} onRemove={() => removeChip(v)} />
          ))}
        </div>
      )}

      {/* ── Search input ── */}
      <div className="msi-input-row">
        <div className="msi-input-wrap">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="msi-search-icon">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => { if (suggestions.length > 0) setOpen(true); }}
            placeholder={selectedValues.length > 0 ? 'Daha fazla ekle...' : (placeholder || 'Ara ve seç...')}
            className="msi-input"
            autoComplete="off"
          />
          {loading && <div className="msi-spinner"><div className="msi-spinner-dot" /></div>}
          {selectedValues.length > 0 && !loading && (
            <button
              className="msi-clear-btn"
              onMouseDown={e => { e.preventDefault(); onChange([]); }}
              type="button"
              title="Tümünü temizle"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* ── Suggestions dropdown ── */}
      {open && suggestions.length > 0 && (
        <ul className="msi-dropdown">
          {/* Seçili olanlar varsa ve listede öne çıkıyorsa separator */}
          {suggestions.filter(s => selectedValues.includes(s)).length > 0 && (
            <li className="msi-section-label">Seçilenler</li>
          )}
          {suggestions.map((s, i) => {
            const checked  = selectedValues.includes(s);
            const isFirstUnchecked = !checked && i > 0 && selectedValues.includes(suggestions[i - 1]);
            return (
              <React.Fragment key={s}>
                {isFirstUnchecked && <li className="msi-section-label msi-section-label--other">Sonuçlar</li>}
                <li
                  className={`msi-option ${i === highlighted ? 'msi-option--highlighted' : ''} ${checked ? 'msi-option--checked' : ''}`}
                  onMouseDown={e => { e.preventDefault(); toggle(s); }}
                  onMouseEnter={() => setHighlighted(i)}
                >
                  <div className={`msi-checkbox ${checked ? 'msi-checkbox--checked' : ''}`}>
                    {checked && (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </div>
                  <span className="msi-option-label">{highlightMatch(s, query)}</span>
                  {checked && <span className="msi-option-check-badge">✓</span>}
                </li>
              </React.Fragment>
            );
          })}

          {/* Footer */}
          {selectedValues.length > 0 && (
            <li className="msi-footer">
              <span className="msi-footer-count">
                {selectedValues.length} seçili
              </span>
              <button
                className="msi-footer-clear"
                onMouseDown={e => { e.preventDefault(); onChange([]); }}
              >
                Tümünü kaldır
              </button>
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
