import { useState, useEffect, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Search, AlertTriangle, CheckCircle, X, RotateCcw, Save } from 'lucide-react';
import { db } from '../db/database';
import { checkSanity, getSeverity } from '../services/sanityCheck';
import './NuevoPesajeModal.css';

// ─── Estados del flujo ────────────────────────────────────────────────
// idle → searching → ready → sanity_check → saving → done
const STEPS = {
  SEARCH:  'searching',
  READY:   'ready',
  SANITY:  'sanity_check',
  DONE:    'done',
};

export default function NuevoPesajeModal({ onClose, preselectedAnimalId = null }) {
  const [step,        setStep]        = useState(preselectedAnimalId ? STEPS.READY : STEPS.SEARCH);
  const [query,       setQuery]       = useState(preselectedAnimalId ?? '');
  const [animal,      setAnimal]      = useState(null);
  const [notFound,    setNotFound]    = useState(false);
  const [peso,        setPeso]        = useState('');
  const [nota,        setNota]        = useState('');
  const [sanity,      setSanity]      = useState(null);   // SanityResult
  const [saving,      setSaving]      = useState(false);
  const [saved,       setSaved]       = useState(false);
  const [operario,    setOperario]    = useState('Admin Web');
  const pesoRef = useRef(null);

  // Precarga si viene con animal ya seleccionado
  useEffect(() => {
    if (preselectedAnimalId) {
      db.animals.get(preselectedAnimalId).then((a) => {
        if (a) setAnimal(a);
      });
    }
  }, [preselectedAnimalId]);

  // Focus automático al campo de peso cuando está listo
  useEffect(() => {
    if (step === STEPS.READY) {
      setTimeout(() => pesoRef.current?.focus(), 100);
    }
  }, [step]);

  // ── Búsqueda del animal ────────────────────────────────────────────
  const handleSearch = async () => {
    setNotFound(false);
    const id = query.trim().toUpperCase();
    const found = await db.animals.get(id);
    if (found) {
      setAnimal(found);
      setStep(STEPS.READY);
    } else {
      setNotFound(true);
    }
  };

  // ── Guardar pesaje con Sanity Check ───────────────────────────────
  const handleSave = async (force = false) => {
    const pesoNum = parseFloat(peso);
    if (!pesoNum || pesoNum <= 0 || isNaN(pesoNum)) return;

    if (!force) {
      // SPG-18: Verificar coherencia biológica antes de guardar
      const result = await checkSanity(animal.id, pesoNum);
      if (!result.ok) {
        setSanity(result);
        setStep(STEPS.SANITY);
        return;
      }
    }

    // SPG-14: Guardar con sincronizado_nube = false
    setSaving(true);
    await db.records.add({
      animal_id:         animal.id,
      peso:              pesoNum,
      fecha:             new Date().toISOString(),
      sincronizado_nube: false,               // offline-first
      tipo:              'PESAJE',
      operario,
      nota:              nota.trim() || null,
      forzado:           force,               // marca si el operario ignoró la alerta
    });

    // Actualiza último peso en el perfil del animal
    await db.animals.update(animal.id, { ultimo_peso: pesoNum });

    setSaving(false);
    setSaved(true);
    setTimeout(() => onClose(), 1400);
  };

  // ── Render ────────────────────────────────────────────────────────
  return (
    <div className="npm-overlay" onClick={onClose}>
      <div className="npm-modal" onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className="npm-header">
          <div>
            <h2 className="npm-title">Nuevo Pesaje</h2>
            {animal && <p className="npm-subtitle">{animal.id} · {animal.raza} · {animal.lote}</p>}
          </div>
          <button className="npm-close" onClick={onClose}><X size={20} /></button>
        </div>

        {/* ── STEP 1: Buscar animal ── */}
        {step === STEPS.SEARCH && (
          <div className="npm-step">
            <label className="npm-label">ID del animal (NFC-XXXX)</label>
            <div className="npm-search-row">
              <div style={{ position: 'relative', flex: 1 }}>
                <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-light)' }} />
                <input
                  className="npm-input"
                  style={{ paddingLeft: '2.1rem' }}
                  placeholder="Ej: NFC-0042"
                  value={query}
                  onChange={(e) => setQuery(e.target.value.toUpperCase())}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  autoFocus
                />
              </div>
              <button className="npm-btn-primary" onClick={handleSearch}>Buscar</button>
            </div>
            {notFound && (
              <p className="npm-error">
                <AlertTriangle size={14} /> Animal no encontrado. Verifique el ID.
              </p>
            )}
          </div>
        )}

        {/* ── STEP 2: Formulario de pesaje ── */}
        {step === STEPS.READY && animal && (
          <div className="npm-step">
            {/* Datos del animal (SPG-10 adaptado a web) */}
            <div className="npm-animal-card">
              <div className="npm-animal-row">
                <span className="npm-animal-label">Último peso registrado</span>
                <span className="npm-animal-last-peso">{animal.ultimo_peso} kg</span>
              </div>
              <div className="npm-animal-row">
                <span className="npm-animal-label">GMD actual</span>
                <span className="npm-animal-value">{animal.gmd} kg/día</span>
              </div>
              <div className="npm-animal-row">
                <span className="npm-animal-label">Estado</span>
                <span className={`badge ${animal.estado === 'Sano' ? 'badge-green' : animal.estado === 'Observación' ? 'badge-orange' : 'badge-red'}`}>
                  {animal.estado}
                </span>
              </div>
            </div>

            {/* Input de peso */}
            <div className="npm-peso-group">
              <label className="npm-label">
                Peso actual (kg)
                <span className="npm-hint"> — solo numérico</span>
              </label>
              <div className="npm-peso-input-wrap">
                <input
                  ref={pesoRef}
                  className="npm-peso-input"
                  type="number"
                  inputMode="decimal"
                  pattern="[0-9]*"
                  min="0"
                  step="0.5"
                  placeholder="0.0"
                  value={peso}
                  onChange={(e) => setPeso(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                />
                <span className="npm-peso-unit">kg</span>
              </div>
            </div>

            {/* Nota de sanidad */}
            <div>
              <label className="npm-label">Nota de sanidad (opcional)</label>
              <textarea
                className="npm-textarea"
                rows={2}
                placeholder="Ej: vacuna aplicada, lesión en pata derecha..."
                value={nota}
                onChange={(e) => setNota(e.target.value)}
              />
            </div>

            {/* Operario */}
            <div>
              <label className="npm-label">Operario</label>
              <select
                className="select-field"
                style={{ width: '100%' }}
                value={operario}
                onChange={(e) => setOperario(e.target.value)}
              >
                {['Admin Web', 'Juan P.', 'Miguel R.', 'Carlos S.'].map((o) => (
                  <option key={o}>{o}</option>
                ))}
              </select>
            </div>

            {/* Acciones */}
            <div className="npm-footer">
              {/* Indicador offline (SPG-14) */}
              <div className="npm-offline-badge">
                <span className="npm-sync-dot" />
                Se guardará local · sync pendiente
              </div>
              <button className="npm-btn-outline" onClick={onClose}>Cancelar</button>
              <button
                className="npm-btn-primary"
                onClick={() => handleSave(false)}
                disabled={!peso || saving}
              >
                {saving ? 'Guardando…' : <><Save size={15} /> Guardar pesaje</>}
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 3: SANITY CHECK — Modal de desviación (SPG-18) ── */}
        {step === STEPS.SANITY && sanity && (
          <SanityWarning
            animal={animal}
            nuevoPeso={parseFloat(peso)}
            sanity={sanity}
            onCorrect={() => { setStep(STEPS.READY); setSanity(null); }}
            onForce={() => { setStep(STEPS.READY); setSanity(null); handleSave(true); }}
          />
        )}

        {/* ── STEP 4: Guardado exitoso ── */}
        {saved && (
          <div className="npm-success">
            <CheckCircle size={40} />
            <p>Pesaje guardado localmente</p>
            <p className="npm-success-sub">Pendiente de sincronización con el servidor</p>
          </div>
        )}

      </div>
    </div>
  );
}

// ─── Componente del modal de alerta biológica (SPG-18) ────────────────
function SanityWarning({ animal, nuevoPeso, sanity, onCorrect, onForce }) {
  const sev     = getSeverity(sanity);
  const isPct   = sanity.pct < 0 ? 'pérdida' : 'ganancia';
  const absPct  = Math.abs(sanity.pct);

  return (
    <div className={`npm-sanity npm-sanity-${sev}`}>
      <div className="npm-sanity-icon">
        <AlertTriangle size={36} />
      </div>

      <h3 className="npm-sanity-title">¡DESVIACIÓN INUSUAL!</h3>
      <p className="npm-sanity-desc">
        El peso ingresado presenta una {isPct} de <strong>{absPct}%</strong> respecto al último
        registro. Verifique si el dato es correcto antes de continuar.
      </p>

      {/* Detalle numérico */}
      <div className="npm-sanity-grid">
        <div className="npm-sanity-cell">
          <span className="npm-sanity-cell-label">Último peso</span>
          <span className="npm-sanity-cell-value">{sanity.ultimoPeso} kg</span>
        </div>
        <div className="npm-sanity-cell">
          <span className="npm-sanity-cell-label">Nuevo peso</span>
          <span className="npm-sanity-cell-value">{nuevoPeso} kg</span>
        </div>
        <div className="npm-sanity-cell">
          <span className="npm-sanity-cell-label">Diferencia</span>
          <span className={`npm-sanity-cell-value ${sanity.delta < 0 ? 'npm-red' : 'npm-green'}`}>
            {sanity.delta > 0 ? '+' : ''}{sanity.delta} kg
          </span>
        </div>
        <div className="npm-sanity-cell">
          <span className="npm-sanity-cell-label">Variación</span>
          <span className={`npm-sanity-cell-value ${sanity.pct < 0 ? 'npm-red' : 'npm-green'}`}>
            {sanity.pct > 0 ? '+' : ''}{sanity.pct}%
          </span>
        </div>
      </div>

      {/* SPG-18 AC-3: Dos opciones */}
      <div className="npm-sanity-actions">
        <button className="npm-btn-correct" onClick={onCorrect}>
          <RotateCcw size={16} />
          Corregir Peso
        </button>
        <button className="npm-btn-force" onClick={onForce}>
          Forzar Registro
          <span className="npm-force-hint">(animal posiblemente enfermo)</span>
        </button>
      </div>
    </div>
  );
}
