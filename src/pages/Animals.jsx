import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { format } from 'date-fns';
import { Search, Plus } from 'lucide-react';
import { db } from '../db/database';

const PAGE_SIZE = 15;
const ESTADOS   = ['Todos', 'Sano', 'Observación', 'Tratamiento'];
const LOTES     = ['Todos', 'Engorde A', 'Engorde B', 'Cría 1', 'Cría 2'];

export default function Animals({ onNewPesaje }) {
  const [q,        setQ]        = useState('');
  const [estado,   setEstado]   = useState('Todos');
  const [lote,     setLote]     = useState('Todos');
  const [page,     setPage]     = useState(1);
  const [selected, setSelected] = useState(null);

  const animals = useLiveQuery(() => db.animals.toArray(), []);
  if (!animals) return <div className="empty-state">Cargando animales…</div>;

  const filtered = animals.filter((a) => {
    const matchQ      = !q || a.id.toLowerCase().includes(q.toLowerCase());
    const matchEstado = estado === 'Todos' || a.estado === estado;
    const matchLote   = lote   === 'Todos' || a.lote   === lote;
    return matchQ && matchEstado && matchLote;
  });

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const badgeCls = (e) =>
    e === 'Sano' ? 'badge-green' : e === 'Observación' ? 'badge-orange' : 'badge-red';

  return (
    <div className="page-content">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Ganado</h1>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: 2 }}>
            {animals.length} animales registrados
          </p>
        </div>
        <button className="btn-primary"><Plus size={15} /> Nuevo animal</button>
      </div>

      <div className="panel">
        <div className="toolbar">
          <div className="search-wrap">
            <Search size={14} className="search-icon" />
            <input
              className="input-field search-input"
              placeholder="Buscar por ID (NFC-XXXX)…"
              value={q}
              onChange={(e) => { setQ(e.target.value); setPage(1); }}
            />
          </div>
          <select className="select-field" value={estado} onChange={(e) => { setEstado(e.target.value); setPage(1); }}>
            {ESTADOS.map((e) => <option key={e}>{e}</option>)}
          </select>
          <select className="select-field" value={lote} onChange={(e) => { setLote(e.target.value); setPage(1); }}>
            {LOTES.map((l) => <option key={l}>{l}</option>)}
          </select>
          <span style={{ marginLeft: 'auto', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            {filtered.length} resultados
          </span>
        </div>

        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Raza</th>
                <th>Edad</th>
                <th>Lote</th>
                <th>Último Peso</th>
                <th>GMD</th>
                <th>Estado</th>
                <th>Último Pesaje</th>
              </tr>
            </thead>
            <tbody>
              {paged.map((a) => (
                <tr key={a.id} style={{ cursor: 'pointer' }} onClick={() => setSelected(a)}>
                  <td className="col-id">{a.id}</td>
                  <td>{a.raza}</td>
                  <td>{Math.floor(a.edad_meses / 12)} a {a.edad_meses % 12} m</td>
                  <td><span className="badge badge-blue">{a.lote}</span></td>
                  <td className="col-bold">{a.ultimo_peso} kg</td>
                  <td>{a.gmd} kg/día</td>
                  <td><span className={`badge ${badgeCls(a.estado)}`}>{a.estado}</span></td>
                  <td style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                    {format(new Date(a.fecha_ultimo_pesaje), 'dd MMM yyyy')}
                  </td>
                </tr>
              ))}
              {paged.length === 0 && (
                <tr><td colSpan={8} className="empty-state">Sin resultados</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="pagination">
            <span style={{ marginRight: 8 }}>{filtered.length} registros · Pág {page} de {totalPages}</span>
            <button className="page-btn" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>‹</button>
            {Array.from({ length: Math.min(totalPages, 9) }, (_, i) => i + 1).map((p) => (
              <button key={p} className={`page-btn ${p === page ? 'current' : ''}`} onClick={() => setPage(p)}>{p}</button>
            ))}
            {totalPages > 9 && <span style={{ padding: '0 4px' }}>…</span>}
            <button className="page-btn" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>›</button>
          </div>
        )}
      </div>

      {selected && <AnimalModal animal={selected} onClose={() => setSelected(null)} onNewPesaje={onNewPesaje} />}
    </div>
  );
}

function AnimalModal({ animal, onClose, onNewPesaje }) {
  const records = useLiveQuery(
    () => db.records.where('animal_id').equals(animal.id).toArray(),
    [animal.id],
  );

  const badgeCls = (e) =>
    e === 'Sano' ? 'badge-green' : e === 'Observación' ? 'badge-orange' : 'badge-red';

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span className="modal-title">{animal.id}</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer', color: 'var(--text-secondary)' }}>✕</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          {[
            ['Raza',         animal.raza],
            ['Lote',         animal.lote],
            ['Estado',       animal.estado],
            ['Edad',         `${Math.floor(animal.edad_meses / 12)} años ${animal.edad_meses % 12} meses`],
            ['Último Peso',  `${animal.ultimo_peso} kg`],
            ['GMD',          `${animal.gmd} kg/día`],
          ].map(([k, v]) => (
            <div key={k} style={{ background: 'var(--border-light)', borderRadius: 6, padding: '0.75rem 1rem' }}>
              <p style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.05em' }}>{k}</p>
              <p style={{ fontWeight: 700, marginTop: 3, color: 'var(--text)' }}>{v}</p>
            </div>
          ))}
        </div>

        <div>
          <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Historial</p>
          <div style={{ maxHeight: 180, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 6 }}>
            <table className="data-table">
              <thead>
                <tr><th>Fecha</th><th>Peso</th><th>Operario</th></tr>
              </thead>
              <tbody>
                {(records ?? []).slice().reverse().slice(0, 10).map((r) => (
                  <tr key={r.id}>
                    <td>{format(new Date(r.fecha), 'dd/MM/yy')}</td>
                    <td className="col-bold">{r.peso} kg</td>
                    <td>{r.operario ?? '—'}</td>
                  </tr>
                ))}
                {(records?.length ?? 0) === 0 && (
                  <tr><td colSpan={3} className="empty-state">Sin historial</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
          <button className="btn-outline" onClick={onClose}>Cerrar</button>
          <button className="btn-primary" onClick={() => { onClose(); onNewPesaje(animal.id); }}>Registrar Pesaje</button>
        </div>
      </div>
    </div>
  );
}
