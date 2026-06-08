import React, { useState, useEffect, useRef } from 'react';

// ─── Column & Operator definitions ───────────────────────────────────────────

const COLUMNS = [
  { field: 'firstName',    label: 'First Name',  type: 'string' },
  { field: 'lastName',     label: 'Last Name',   type: 'string' },
  { field: 'department',   label: 'Department',  type: 'string' },
  { field: 'city',         label: 'City',        type: 'string' },
  { field: 'phone',        label: 'Phone',       type: 'string' },
  { field: 'email',        label: 'Email',       type: 'string' },
  { field: 'employeeType', label: 'Type',        type: 'enum',   options: ['Office', 'Hybrid'] },
  { field: 'workStatus',   label: 'Status',      type: 'boolean',options: ['true', 'false'] },
  { field: 'hireDate',     label: 'Hire Date',   type: 'date' },
];

const OPERATORS_BY_TYPE = {
  string: [
    { value: 'contains',    label: 'İçerir' },
    { value: 'notcontains', label: 'İçermez' },
    { value: 'startswith',  label: 'İle başlar' },
    { value: 'endswith',    label: 'İle biter' },
    { value: '=',           label: 'Eşittir (=)' },
    { value: '<>',          label: 'Eşit değil (≠)' },
  ],
  enum: [
    { value: '=',  label: 'Eşittir (=)' },
    { value: '<>', label: 'Eşit değil (≠)' },
  ],
  boolean: [
    { value: '=',  label: 'Eşittir (=)' },
  ],
  date: [
    { value: '=',  label: 'Eşittir (=)' },
    { value: '<>', label: 'Eşit değil (≠)' },
    { value: '>',  label: 'Sonra (>)' },
    { value: '>=', label: 'Bu tarih veya sonra (≥)' },
    { value: '<',  label: 'Önce (<)' },
    { value: '<=', label: 'Bu tarih veya önce (≤)' },
  ],
  number: [
    { value: '=',  label: 'Eşittir (=)' },
    { value: '<>', label: 'Eşit değil (≠)' },
    { value: '>',  label: 'Büyük (>)' },
    { value: '>=', label: 'Büyük veya eşit (≥)' },
    { value: '<',  label: 'Küçük (<)' },
    { value: '<=', label: 'Küçük veya eşit (≤)' },
  ],
};

const LOGIC_OPS = [
  { value: 'and', label: 'VE (AND)' },
  { value: 'or',  label: 'VEYA (OR)' },
];

// ─── Build DevExtreme filter array from conditions ────────────────────────────
function buildDevExtremeFilter(conditions, logic) {
  if (conditions.length === 0) return null;
  if (conditions.length === 1) {
    const c = conditions[0];
    const val = parseValue(c);
    return [c.field, c.operator, val];
  }
  const parts = [];
  conditions.forEach((c, i) => {
    const val = parseValue(c);
    parts.push([c.field, c.operator, val]);
    if (i < conditions.length - 1) parts.push(logic);
  });
  return parts;
}

function parseValue(condition) {
  const col = COLUMNS.find(c => c.field === condition.field);
  if (!col) return condition.value;
  if (col.type === 'boolean') return condition.value === 'true';
  if (col.type === 'date') return condition.value; // ISO string
  return condition.value;
}

// ─── Single filter row ────────────────────────────────────────────────────────
function FilterRow({ condition, index, onUpdate, onRemove }) {
  const col = COLUMNS.find(c => c.field === condition.field) || COLUMNS[0];
  const operators = OPERATORS_BY_TYPE[col.type] || OPERATORS_BY_TYPE.string;

  function handleFieldChange(e) {
    const newCol = COLUMNS.find(c => c.field === e.target.value);
    const defaultOp = (OPERATORS_BY_TYPE[newCol.type] || OPERATORS_BY_TYPE.string)[0].value;
    onUpdate(index, { field: e.target.value, operator: defaultOp, value: '' });
  }

  function handleOperatorChange(e) {
    onUpdate(index, { ...condition, operator: e.target.value });
  }

  function handleValueChange(e) {
    onUpdate(index, { ...condition, value: e.target.value });
  }

  const renderValueInput = () => {
    if (col.type === 'boolean' || col.type === 'enum') {
      const opts = col.options || [];
      return (
        <select
          value={condition.value}
          onChange={handleValueChange}
          className="fp-select"
        >
          <option value="">Seçiniz...</option>
          {opts.map(o => (
            <option key={o} value={o}>
              {col.type === 'boolean' ? (o === 'true' ? 'Active' : 'Inactive') : o}
            </option>
          ))}
        </select>
      );
    }
    if (col.type === 'date') {
      return (
        <input
          type="date"
          value={condition.value}
          onChange={handleValueChange}
          className="fp-input"
        />
      );
    }
    return (
      <input
        type="text"
        value={condition.value}
        onChange={handleValueChange}
        placeholder="Değer girin..."
        className="fp-input"
      />
    );
  };

  return (
    <div className="fp-filter-row">
      <div className="fp-filter-row-inner">
        {/* Field selector */}
        <select value={condition.field} onChange={handleFieldChange} className="fp-select fp-field-select">
          {COLUMNS.map(c => (
            <option key={c.field} value={c.field}>{c.label}</option>
          ))}
        </select>

        {/* Operator */}
        <select value={condition.operator} onChange={handleOperatorChange} className="fp-select fp-op-select">
          {operators.map(op => (
            <option key={op.value} value={op.value}>{op.label}</option>
          ))}
        </select>

        {/* Value */}
        <div className="fp-value-wrap">
          {renderValueInput()}
        </div>

        {/* Remove */}
        <button onClick={() => onRemove(index)} className="fp-remove-btn" title="Kaldır">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="fp-remove-icon">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
    </div>
  );
}

// ─── Main FilterPanel ─────────────────────────────────────────────────────────
export default function FilterPanel({ isOpen, onClose, onApply, onClear, activeCount }) {
  const [conditions, setConditions] = useState([]);
  const [logic, setLogic] = useState('and');
  const panelRef = useRef(null);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (isOpen && panelRef.current && !panelRef.current.contains(e.target)) {
        // Don't close on toolbar button click — handled by parent
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  function addCondition() {
    setConditions(prev => [
      ...prev,
      { field: COLUMNS[0].field, operator: OPERATORS_BY_TYPE[COLUMNS[0].type][0].value, value: '' },
    ]);
  }

  function updateCondition(index, updated) {
    setConditions(prev => prev.map((c, i) => (i === index ? updated : c)));
  }

  function removeCondition(index) {
    setConditions(prev => prev.filter((_, i) => i !== index));
  }

  function handleApply() {
    const filled = conditions.filter(c => c.value !== '' && c.value !== undefined);
    if (filled.length === 0) return;
    const filter = buildDevExtremeFilter(filled, logic);
    onApply(filter);
  }

  function handleClear() {
    setConditions([]);
    onClear();
  }

  return (
    <>
      {/* Backdrop */}
      {isOpen && <div className="fp-backdrop" onClick={onClose} />}

      {/* Side panel */}
      <div ref={panelRef} className={`fp-panel ${isOpen ? 'fp-panel--open' : ''}`}>
        {/* Header */}
        <div className="fp-header">
          <div className="fp-header-left">
            <div className="fp-header-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
              </svg>
            </div>
            <div>
              <h2 className="fp-title">Gelişmiş Filtre</h2>
              <p className="fp-subtitle">
                {conditions.length === 0
                  ? 'Koşul eklemeye başlayın'
                  : `${conditions.length} koşul tanımlandı`}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="fp-close-btn">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Logic operator (AND / OR) */}
        {conditions.length > 1 && (
          <div className="fp-logic-bar">
            <span className="fp-logic-label">Koşullar arası mantık:</span>
            {LOGIC_OPS.map(op => (
              <button
                key={op.value}
                className={`fp-logic-btn ${logic === op.value ? 'fp-logic-btn--active' : ''}`}
                onClick={() => setLogic(op.value)}
              >
                {op.label}
              </button>
            ))}
          </div>
        )}

        {/* Conditions list */}
        <div className="fp-body">
          {conditions.length === 0 ? (
            <div className="fp-empty">
              <div className="fp-empty-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
              </div>
              <p className="fp-empty-text">Henüz filtre koşulu yok</p>
              <p className="fp-empty-sub">Aşağıdaki "Koşul Ekle" butonuna tıklayın</p>
            </div>
          ) : (
            <div className="fp-conditions">
              {conditions.map((cond, i) => (
                <div key={i}>
                  {i > 0 && (
                    <div className="fp-connector">
                      <span className={`fp-connector-badge fp-connector-badge--${logic}`}>
                        {logic.toUpperCase()}
                      </span>
                    </div>
                  )}
                  <FilterRow
                    condition={cond}
                    index={i}
                    onUpdate={updateCondition}
                    onRemove={removeCondition}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Add condition button */}
        <div className="fp-add-wrap">
          <button onClick={addCondition} className="fp-add-btn">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="fp-add-icon">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Koşul Ekle
          </button>
        </div>

        {/* Footer actions */}
        <div className="fp-footer">
          <button onClick={handleClear} className="fp-btn-clear">
            Temizle
          </button>
          <button
            onClick={handleApply}
            disabled={conditions.filter(c => c.value !== '').length === 0}
            className="fp-btn-apply"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            Filtreyi Uygula
          </button>
        </div>
      </div>
    </>
  );
}
