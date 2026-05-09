import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Search, Edit3, CheckCircle, Tag } from 'lucide-react';
import { format } from 'date-fns';
import { db } from '../db/database';

export default function TagManager() {
  const [q,       setQ]       = useState('');
  const [editing, setEditing] = useState(null);
  const [newUid,  setNewUid]  = useState('');
  const [saved,   setSaved]   = useState(false);

  const animals = useLiveQuery(() => db.animals.toArray(), []);
  if (!animals) return <div className="empty-state">Cargando…</div>;

  const filtered = animals.filter(
    (a) => !q || a.id.includes(q.toUpperCase()) || a.uid_nfc.toLowerCase().includes(q.toLowerCase()),
  );

  const handleSave = async () => {
    if (!editing || !newUid.trim()) return;
    await db.animals.update(editing.id, { uid_nfc: newUid.trim() });
    await db.records.add({
      animal_id: editing.id,
      peso: editing.ultimo_peso,
      fecha: new Date().toISOString(),
      sincronizado_nube: false,
      tipo: 'REEMPLAZO_TAG',
      operario: 'Admin Web',
    });
    setSaved(true);
    setTimeout(() => { setEditing(null); setNewUid(''); setSaved(false); }, 1500);
  };

  return (
    <div className="page-content">
      <div>
        <h1 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Gestión de Tags NFC</h1>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: 2 }}>
          Consulta y reemplaza chips NFC asignados a cada animal (SPG-34)
        </p>
      </div>

      {/* Info banner */}
      <div style={{
        background: 'var(--accent-light)', border: '1px solid #BFDBFE',
        borderRadius: 'var(--radius)', padding: '1rem 1.25rem',
        display: 'flex', alignItems: 'flex-start', gap: '0.75rem',
      }}>
        <Tag size={18} color="var(--accent)" style={{ flexShrink: 0, marginTop: 2 }} />
        <div>
          <p style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: 4 }}>Reemplazo de Tag</p>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            Cuando un animal pierde su caravana NFC, el operario escanea el nuevo chip desde la app móvil.
            Aquí el administrador puede editarlo manualmente y el registro se marcará para sincronizar con el servidor Node.
          </p>
        </div>
      </div>

      <div className="panel">
        <div className="toolbar">
          <div className="search-wrap">
            <Search size={14} className="search-icon" />
            <input
              className="input-field search-input"
              placeholder="Buscar por ID o UID…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <span style={{ marginLeft: 'auto', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            {filtered.length} animales
          </span>
        </div>

        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Raza</th>
                <th>Lote</th>
                <th>UID NFC</th>
                <th>Fecha ingreso</th>
                <th>Acción</th>
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, 30).map((a) => (
                <tr key={a.id}>
                  <td className="col-id">{a.id}</td>
                  <td>{a.raza}</td>
                  <td><span className="badge badge-blue">{a.lote}</span></td>
                  <td>
                    <code style={{
                      fontSize: '0.75rem', color: 'var(--text-secondary)',
                      background: 'var(--border-light)', padding: '2px 6px', borderRadius: 4,
                    }}>{a.uid_nfc}</code>
                  </td>
                  <td style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                    {format(new Date(a.fecha_ingreso ?? new Date()), 'dd/MM/yy')}
                  </td>
                  <td>
                    <button
                      className="btn-outline"
                      style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem' }}
                      onClick={() => { setEditing(a); setNewUid(''); setSaved(false); }}
                    >
                      <Edit3 size={12} style={{ marginRight: 4 }} />
                      Reemplazar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {editing && (
        <div className="modal-overlay" onClick={() => setEditing(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span className="modal-title">Reemplazar Tag — {editing.id}</span>
              <button onClick={() => setEditing(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.25rem', color: 'var(--text-secondary)' }}>✕</button>
            </div>

            <div style={{ background: 'var(--border-light)', borderRadius: 6, padding: '0.75rem 1rem' }}>
              <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 600, marginBottom: 4 }}>UID ACTUAL</p>
              <code style={{ fontSize: '0.875rem' }}>{editing.uid_nfc}</code>
            </div>

            {!saved ? (
              <>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
                    NUEVO UID NFC
                  </label>
                  <input
                    className="input-field"
                    style={{ width: '100%', fontFamily: 'monospace', fontSize: '0.9rem' }}
                    placeholder="Ej: TAG-0301"
                    value={newUid}
                    onChange={(e) => setNewUid(e.target.value)}
                    autoFocus
                  />
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: 6 }}>
                    En producción la app Flutter captura este UID automáticamente con la antena NFC del dispositivo.
                  </p>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                  <button className="btn-outline" onClick={() => setEditing(null)}>Cancelar</button>
                  <button className="btn-primary" onClick={handleSave} disabled={!newUid.trim()}>
                    Confirmar reemplazo
                  </button>
                </div>
              </>
            ) : (
              <div style={{
                textAlign: 'center', padding: '1.5rem',
                background: 'var(--green-light)', borderRadius: 6,
                color: 'var(--green)', fontWeight: 700,
              }}>
                <CheckCircle size={28} style={{ marginBottom: 8 }} />
                <p>Tag actualizado y marcado para sincronizar</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
