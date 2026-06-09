import React, { useState, useEffect, useRef } from 'react';
import MultiSelectInput from './MultiSelectInput';

// ─── Column & Operator definitions ───────────────────────────────────────────

const COLUMNS = [
  { field: 'firstName',    label: 'First Name',  type: 'string' },
  { field: 'lastName',     label: 'Last Name',   type: 'string' },
  { field: 'department',   label: 'Department',  type: 'string' },
  { field: 'city',         label: 'City',        type: 'string' },
  { field: 'phone',        label: 'Phone',       type: 'string' },
  { field: 'email',        label: 'Email',       type: 'string' },
  { field: 'employeeType', label: 'Type',        type: 'enum',   options: ['Office', 'Hybrid'] },
  { field: 'workStatus',   label: 'Status',      type: 'boolean', options: ['true', 'false'] },
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
};

const LOGIC_OPS = [
  { value: 'and', label: 'VE (AND)' },
  { value: 'or',  label: 'VEYA (OR)' },
];

// ─── Build DevExtreme filter from conditions ──────────────────────────────────
// condition.value may be a string OR an array of strings (multi-select)
function buildConditionFilter(c) {
  const col = COLUMNS.find(col => col.field === c.field);
  const castValue = (v) => {
    if (!col) return v;
    if (col.type === 'boolean') return v === 'true' || v === true;
    return v;
  };

  const values = Array.isArray(c.value) ? c.value : [c.value];

  if (values.length === 0) return null;
  if (values.length === 1) return [c.field, c.operator, castValue(values[0])];

  // Multiple values → OR them together for "contains/startswith/=", AND for "notcontains/<>"
  const innerLogic = (c.operator === 'notcontains' || c.operator === '<>') ? 'and' : 'or';
  const parts = [];
  values.forEach((v, i) => {
    parts.push([c.field, c.operator, castValue(v)]);
    if (i < values.length - 1) parts.push(innerLogic);
  });
  return parts;
}

function buildDevExtremeFilter(conditions, logic) {
  const filled = conditions.filter(c => {
    const v = c.value;
    return Array.isArray(v) ? v.length > 0 : (v !== '' && v !== undefined && v !== null);
  });
  if (filled.length === 0) return null;
  if (filled.length === 1) return buildConditionFilter(filled[0]);

  const parts = [];
  filled.forEach((c, i) => {
    parts.push(buildConditionFilter(c));
    if (i < filled.length - 1) parts.push(logic);
  });
  return parts;
}

function hasValue(condition) {
  const v = condition.value;
  if (Array.isArray(v)) return v.length > 0;
  return v !== '' && v !== undefined && v !== null;
}

// ─── Single filter row ────────────────────────────────────────────────────────
function FilterRow({ condition, index, onUpdate, onRemove }) {
  const col = COLUMNS.find(c => c.field === condition.field) || COLUMNS[0];
  const operators = OPERATORS_BY_TYPE[col.type] || OPERATORS_BY_TYPE.string;

  function handleFieldChange(e) {
    const newCol = COLUMNS.find(c => c.field === e.target.value);
    const defaultOp = (OPERATORS_BY_TYPE[newCol.type] || OPERATORS_BY_TYPE.string)[0].value;
    onUpdate(index, { field: e.target.value, operator: defaultOp, value: [] });
  }

  function handleOperatorChange(e) {
    // Reset value when operator changes so stale selections don't persist
    onUpdate(index, { ...condition, operator: e.target.value, value: [] });
  }

  const renderValueInput = () => {
    // Boolean / enum → plain select (only a few fixed options)
    if (col.type === 'boolean' || col.type === 'enum') {
      const opts = col.options || [];
      const currentVal = Array.isArray(condition.value) ? condition.value[0] || '' : condition.value;
      return (
        <select
          value={currentVal}
          onChange={e => onUpdate(index, { ...condition, value: e.target.value ? [e.target.value] : [] })}
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

    // Date → plain date input (single value)
    if (col.type === 'date') {
      const currentVal = Array.isArray(condition.value) ? condition.value[0] || '' : condition.value;
      return (
        <input
          type="date"
          value={currentVal}
          onChange={e => onUpdate(index, { ...condition, value: e.target.value ? [e.target.value] : [] })}
          className="fp-input"
        />
      );
    }

    // String → autocomplete multi-select
    return (
      <MultiSelectInput
        field={condition.field}
        operator={condition.operator}
        selectedValues={Array.isArray(condition.value) ? condition.value : (condition.value ? [condition.value] : [])}
        onChange={vals => onUpdate(index, { ...condition, value: vals })}
        placeholder="Ara ve seç..."
      />
    );
  };

  return (
    <div className="fp-filter-row">
      {/* Field + Operator row */}
      <div className="fp-row-header">
        <select value={condition.field} onChange={handleFieldChange} className="fp-select fp-field-select">
          {COLUMNS.map(c => (
            <option key={c.field} value={c.field}>{c.label}</option>
          ))}
        </select>
        <select value={condition.operator} onChange={handleOperatorChange} className="fp-select fp-op-select">
          {operators.map(op => (
            <option key={op.value} value={op.value}>{op.label}</option>
          ))}
        </select>
        <button onClick={() => onRemove(index)} className="fp-remove-btn" title="Kaldır">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="fp-remove-icon">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {/* Value input row (full width) */}
      <div className="fp-row-value">
        {renderValueInput()}
      </div>
    </div>
  );
}

// ─── Main FilterPanel ─────────────────────────────────────────────────────────
export default function FilterPanel({ isOpen, onClose, onApply, onClear, activeCount }) {
  const [conditions, setConditions] = useState([]);
  const [logic, setLogic] = useState('and');
  const panelRef = useRef(null);

  function addCondition() {
    setConditions(prev => [
      ...prev,
      { field: COLUMNS[0].field, operator: OPERATORS_BY_TYPE[COLUMNS[0].type][0].value, value: [] },
    ]);
  }

  function updateCondition(index, updated) {
    setConditions(prev => prev.map((c, i) => (i === index ? updated : c)));
  }

  function removeCondition(index) {
    setConditions(prev => prev.filter((_, i) => i !== index));
  }

  function handleApply() {
    const filter = buildDevExtremeFilter(conditions, logic);
    if (!filter) return;
    onApply(filter);
  }

  function handleClear() {
    setConditions([]);
    onClear();
  }

  const hasAnyValue = conditions.some(hasValue);

  return (
    <>
      {isOpen && <div className="fp-backdrop" onClick={onClose} />}

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
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
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
                  <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
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

        {/* Add condition */}
        <div className="fp-add-wrap">
          <button onClick={addCondition} className="fp-add-btn">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="fp-add-icon">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Koşul Ekle
          </button>
        </div>

        {/* Footer */}
        <div className="fp-footer">
          <button onClick={handleClear} className="fp-btn-clear">Temizle</button>
          <button onClick={handleApply} disabled={!hasAnyValue} className="fp-btn-apply">
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
