import { useState } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { Bell, Settings, RefreshCw } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './db/database';
import NuevoPesajeModal from './components/NuevoPesajeModal';
import Dashboard  from './pages/Dashboard';
import Animals    from './pages/Animals';
import Records    from './pages/Records';
import TagManager from './pages/TagManager';

const TABS = [
  { key: 'dashboard', label: 'Dashboard', path: '/' },
  { key: 'ganado',    label: 'Ganado',    path: '/animals' },
  { key: 'pesajes',   label: 'Pesajes',   path: '/records' },
  { key: 'reportes',  label: 'Reportes',  path: '/tags' },
];

// ─── Top Nav ──────────────────────────────────────────────────────────
function TopNav({ pendingSync, onNewPesaje }) {
  const navigate     = useNavigate();
  const { pathname } = useLocation();

  return (
    <nav className="topnav">
      <span className="nav-brand">San Silvestre</span>

      <div className="nav-tabs">
        {TABS.map((t) => (
          <button
            key={t.key}
            className={`nav-tab ${pathname === t.path ? 'active' : ''}`}
            onClick={() => navigate(t.path)}
          >
            {t.label}
            {/* Badge de sync en pestaña Pesajes */}
            {t.key === 'pesajes' && pendingSync > 0 && (
              <span style={{
                marginLeft: 6,
                background: 'var(--red)',
                color: 'white',
                fontSize: '0.6rem',
                fontWeight: 700,
                borderRadius: 999,
                padding: '1px 6px',
                lineHeight: 1.6,
              }}>
                {pendingSync}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="nav-right">
        {/* SPG-14: Indicador de registros sin sincronizar */}
        {pendingSync > 0 && (
          <button
            className="nav-sync-alert"
            onClick={() => navigate('/records')}
            title={`${pendingSync} registros sin sincronizar`}
          >
            <RefreshCw size={13} />
            {pendingSync} sin sync
          </button>
        )}
        <button className="nav-icon-btn" title="Notificaciones"><Bell size={18} /></button>
        <button className="nav-icon-btn" title="Configuración"><Settings size={18} /></button>
        <div className="nav-avatar">JS</div>
      </div>
    </nav>
  );
}

// ─── App Root ─────────────────────────────────────────────────────────
export default function App() {
  const [pesajeModal, setPesajeModal] = useState({ open: false, animalId: null });

  const pendingSync = useLiveQuery(
    () => db.records.where('sincronizado_nube').equals(0).count(),
    [],
    0,
  );

  const openNuevoPesaje = (animalId = null) =>
    setPesajeModal({ open: true, animalId });
  const closeNuevoPesaje = () =>
    setPesajeModal({ open: false, animalId: null });

  return (
    <BrowserRouter>
      <div className="app-layout">
        <TopNav pendingSync={pendingSync} onNewPesaje={openNuevoPesaje} />

        <Routes>
          <Route path="/"        element={<Dashboard  onNewPesaje={openNuevoPesaje} />} />
          <Route path="/animals" element={<Animals    onNewPesaje={openNuevoPesaje} />} />
          <Route path="/records" element={<Records    onNewPesaje={openNuevoPesaje} />} />
          <Route path="/tags"    element={<TagManager onNewPesaje={openNuevoPesaje} />} />
        </Routes>

        {/* Modal global de nuevo pesaje (SPG-14 + SPG-18) */}
        {pesajeModal.open && (
          <NuevoPesajeModal
            onClose={closeNuevoPesaje}
            preselectedAnimalId={pesajeModal.animalId}
          />
        )}
      </div>
    </BrowserRouter>
  );
}
