import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { format } from 'date-fns';
import { RefreshCw } from 'lucide-react';
import { es } from 'date-fns/locale';
import { Plus, AlertTriangle, CloudOff } from 'lucide-react';
import { db } from '../db/database';

// ─── Gráfica de evolución 8 semanas ──────────────────────────────────
const WEEK_LABELS = ['Sem 1','Sem 2','Sem 3','Sem 4','Sem 5','Sem 6','Sem 7','Sem 8'];

function WeightChart({ data }) {
  const referencia = 375; // línea de referencia dashed

  return (
    <div style={{ padding: '0 1.5rem 1.5rem' }}>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 12, fill: '#9CA3AF' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 12, fill: '#9CA3AF' }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => `${v}kg`}
            domain={[200, 550]}
            ticks={[200, 300, 400, 500]}
          />
          <Tooltip
            contentStyle={{
              background: 'white',
              border: '1px solid #E5E7EB',
              borderRadius: 6,
              fontSize: 13,
              boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
            }}
            formatter={(v) => [`${v} kg`, '']}
            labelStyle={{ fontWeight: 600, color: '#111827' }}
          />
          {/* Línea de referencia punteada */}
          <ReferenceLine
            y={referencia}
            stroke="#D1D5DB"
            strokeDasharray="5 5"
          />
          {/* Línea histórico */}
          <Line
            type="monotone"
            dataKey="peso"
            stroke="#9CA3AF"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: '#2563EB' }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────
export default function Dashboard({ onNewPesaje }) {
  const animals = useLiveQuery(() => db.animals.toArray(), []);
  const records = useLiveQuery(() => db.records.toArray(), []);
  const alerts   = useLiveQuery(() => db.alerts.where('leida').equals(0).toArray(), []);
  const pending   = useLiveQuery(() => db.records.where('sincronizado_nube').equals(0).count(), [], 0);

  const [chartData, setChartData] = useState([]);

  useEffect(() => {
    if (!records) return;

    // Construye curva ascendente promediando registros por semana
    // Si un slice no tiene datos, interpola para que la línea siempre aparezca
    const pesajes = records.filter((r) => r.tipo === 'PESAJE');
    const rawData = WEEK_LABELS.map((label, i) => {
      const weekRecords = pesajes.filter((r) => {
        const recDate   = new Date(r.fecha);
        const weekStart = new Date(2024, 8, 1 + i * 7);
        const weekEnd   = new Date(2024, 8, 8 + i * 7);
        return recDate >= weekStart && recDate < weekEnd;
      });
      const avg = weekRecords.length
        ? Math.round(weekRecords.reduce((s, r) => s + r.peso, 0) / weekRecords.length)
        : null;
      return { label, peso: avg };
    });

    // Si no hay datos de la BD (p.ej. semanas sin registros), genera curva demo ascendente
    const hasData = rawData.some((d) => d.peso !== null);
    const weekData = hasData
      ? rawData
      : WEEK_LABELS.map((label, i) => ({
          label,
          peso: Math.round(265 + i * 28 + (Math.random() * 10 - 5)),
        }));

    setChartData(weekData);
  }, [records]);

  if (!animals || !records) {
    return (
      <div className="page-content">
        <div className="empty-state">Cargando...</div>
      </div>
    );
  }

  const avgPeso = animals.length
    ? Math.round(animals.reduce((s, a) => s + a.ultimo_peso, 0) / animals.length)
    : 0;
  const avgGmd = animals.length
    ? (animals.reduce((s, a) => s + a.gmd, 0) / animals.length).toFixed(2)
    : 0;
  const alertCount = alerts?.length ?? 0;

  // Pesajes recientes fijos del mockup
  const RECENT = [
    { id: 'NFC-0042', lote: 'Lote: Engorde A', peso: 450, fecha: '12 Oct' },
    { id: 'NFC-0045', lote: 'Lote: Engorde A', peso: 432, fecha: '12 Oct' },
    { id: 'NFC-0038', lote: 'Lote: Cría 2',   peso: 418, fecha: '11 Oct' },
    { id: 'NFC-0021', lote: 'Lote: Engorde B', peso: 465, fecha: '11 Oct' },
    { id: 'NFC-0019', lote: 'Lote: Cría 2',   peso: 395, fecha: '10 Oct' },
  ];

  const lastAlert = alerts?.[0];

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <div className="page-content">
        {/* ── KPI Row ── */}
        <div className="kpi-row">
          <div className="kpi-card">
            <div className="kpi-value">{animals.length}</div>
            <div className="kpi-label">Animales registrados</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-value">{avgPeso} kg</div>
            <div className="kpi-label">Peso promedio</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-value">{avgGmd} kg/día</div>
            <div className="kpi-label">GMD promedio</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-value">{alertCount}</div>
            <div className="kpi-label">Alertas pendientes</div>
          </div>
        </div>

        {/* ── Chart + Recent ── */}
        <div className="content-row">
          {/* Left: Evolución de peso */}
          <div className="panel">
            <div className="panel-header">
              <span className="panel-title">Evolución de peso — 8 semanas</span>
              <div className="panel-legend">
                <div className="legend-item">
                  <div className="legend-line" />
                  <span>Histórico</span>
                </div>
                <div className="legend-item">
                  <div className="legend-line dashed" />
                  <span>Referencia</span>
                </div>
              </div>
            </div>
            <WeightChart data={chartData} />
          </div>

          {/* Right: Pesajes recientes */}
          <div className="panel">
            <div className="panel-header">
              <span className="panel-title">Pesajes recientes</span>
            </div>
            <div className="weighing-list">
              {RECENT.map((r) => (
                <div className="weighing-item" key={r.id}>
                  <div className="weighing-info">
                    <div className="weighing-id">{r.id}</div>
                    <div className="weighing-lote">{r.lote}</div>
                  </div>
                  <div className="weighing-right">
                    <div className="weighing-weight">{r.peso} kg</div>
                    <div className="weighing-date">{r.fecha}</div>
                  </div>
                  <div className="weighing-dot" />
                </div>
              ))}
            </div>
            <a className="panel-link">VER TODOS LOS PESAJES</a>
          </div>
        </div>
      </div>

      {/* ── Bottom Bar ── */}
      <div className="bottom-bar">
        {/* Offline Sync Status */}
        {pending > 0 && (
          <div className="offline-panel">
            <CloudOff size={16} />
            <span>{pending} registros pendientes de sincronizar</span>
          </div>
        )}
        
        {/* Última alerta */}
        <div className="bottom-alert">
          <AlertTriangle size={16} className="alert-icon" />
          <div>
            <div className="bottom-section-label">Última alerta</div>
            <div className="alert-text">
              {lastAlert?.mensaje ?? 'Baja ganancia NFC-0056'}
            </div>
            <div className="alert-sub">Registrado hace 2 horas</div>
          </div>
        </div>

        {/* Próximo pesaje */}
        <div className="bottom-bar-section">
          <div className="bottom-section-label">Próximo pesaje colectivo</div>
          <div className="bottom-section-value">Lote Engorde A — 15 Oct</div>
        </div>

        {/* Meta semanal */}
        <div className="bottom-bar-section">
          <div className="bottom-section-label">Meta semanal</div>
          <div className="bottom-section-value">85% Completado</div>
        </div>

        {/* Acciones */}
        <div className="bottom-actions">
          <button className="btn-primary" onClick={() => onNewPesaje()}>
            <Plus size={16} />
            Nuevo Pesaje
          </button>
          <button className="btn-outline">Iniciar Sesión</button>
        </div>
      </div>
    </div>
  );
}
