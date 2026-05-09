import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { format } from 'date-fns';
import { CheckCircle, RefreshCw, Plus } from 'lucide-react';
import { db } from '../db/database';

const PAGE_SIZE = 15;

export default function Records() {
  const [filterSync, setFilterSync] = useState('all');
  const [page,       setPage]       = useState(1);

  const records = useLiveQuery(() =>
    db.records.orderBy('fecha').reverse().toArray(), []
  );

  if (!records) return <div className="empty-state">Cargando pesajes…</div>;

  const pending  = records.filter((r) => !r.sincronizado_nube);
  const filtered = records.filter((r) => {
    if (filterSync === 'pending') return !r.sincronizado_nube;
    if (filterSync === 'synced')  return r.sincronizado_nube;
    return true;
  });

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleSyncAll = async () => {
    for (const r of pending) await db.records.update(r.id, { sincronizado_nube: true });
  };

  return (
    <div className="page-content">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Pesajes</h1>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: 2 }}>
            {records.length} registros · {pending.length} sin sincronizar
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {pending.length > 0 && (
            <button className="btn-outline" onClick={handleSyncAll}>
              <RefreshCw size={14} style={{ marginRight: 4 }} />
              Sincronizar ({pending.length})
            </button>
          )}
          <button className="btn-primary"><Plus size={15} /> Nuevo pesaje</button>
        </div>
      </div>

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
        {[
          { label: 'Total registros',  value: records.length,  color: 'var(--accent)' },
          { label: 'Sincronizados',    value: records.length - pending.length, color: 'var(--green)' },
          { label: 'Sin sincronizar',  value: pending.length,  color: 'var(--orange)' },
        ].map(({ label, value, color }) => (
          <div className="kpi-card" key={label}>
            <div className="kpi-value" style={{ fontSize: '1.75rem', color }}>{value}</div>
            <div className="kpi-label">{label}</div>
          </div>
        ))}
      </div>

      <div className="panel">
        <div className="toolbar">
          <select className="select-field" value={filterSync} onChange={(e) => { setFilterSync(e.target.value); setPage(1); }}>
            <option value="all">Todos los estados</option>
            <option value="pending">Sin sincronizar</option>
            <option value="synced">Sincronizados</option>
          </select>
          <span style={{ marginLeft: 'auto', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            {filtered.length} registros
          </span>
        </div>

        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Animal</th>
                <th>Peso</th>
                <th>Fecha</th>
                <th>Operario</th>
                <th>Tipo</th>
                <th>Estado Sync</th>
              </tr>
            </thead>
            <tbody>
              {paged.map((r) => (
                <tr key={r.id}>
                  <td className="col-id">{r.animal_id}</td>
                  <td className="col-bold">{r.peso} kg</td>
                  <td style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                    {format(new Date(r.fecha), 'dd/MM/yyyy HH:mm')}
                  </td>
                  <td>{r.operario ?? '—'}</td>
                  <td>
                    <span className={`badge ${r.tipo === 'REEMPLAZO_TAG' ? 'badge-blue' : 'badge-gray'}`}>
                      {r.tipo === 'REEMPLAZO_TAG' ? 'Tag' : 'Pesaje'}
                    </span>
                  </td>
                  <td>
                    {r.sincronizado_nube ? (
                      <span className="badge badge-green">
                        <CheckCircle size={10} /> Sincronizado
                      </span>
                    ) : (
                      <span className="badge badge-orange">Pendiente</span>
                    )}
                  </td>
                </tr>
              ))}
              {paged.length === 0 && (
                <tr><td colSpan={6} className="empty-state">Sin registros</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="pagination">
            <span style={{ marginRight: 8 }}>Pág {page} de {totalPages}</span>
            <button className="page-btn" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>‹</button>
            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => i + 1).map((p) => (
              <button key={p} className={`page-btn ${p === page ? 'current' : ''}`} onClick={() => setPage(p)}>{p}</button>
            ))}
            <button className="page-btn" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>›</button>
          </div>
        )}
      </div>
    </div>
  );
}
