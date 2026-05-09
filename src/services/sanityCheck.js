// SPG-18: Sanity Check — Validación Biológica de Peso
import { db } from '../db/database';

/** Umbrales biológicos aceptados */
const UMBRAL_PERDIDA_PCT  = -10;   // más de -10% → alerta
const UMBRAL_GANANCIA_PCT =  25;   // más de +25% → alerta (irreal para un período)

/**
 * Verifica si el nuevo peso de un animal es biológicamente coherente
 * comparándolo con su último registro.
 *
 * @param {string} animalId  - ID del animal (e.g. 'NFC-0042')
 * @param {number} nuevoPeso - Peso nuevo en kg ingresado por el operario
 * @returns {Promise<SanityResult>}
 */
export async function checkSanity(animalId, nuevoPeso) {
  // Buscar el último pesaje real del animal en la BD local
  const registros = await db.records
    .where('animal_id')
    .equals(animalId)
    .filter((r) => r.tipo === 'PESAJE')
    .toArray();

  if (registros.length === 0) {
    // Sin historial previo → no hay base de comparación, OK
    return { ok: true, delta: null, pct: null, ultimoPeso: null };
  }

  // Ordenar por fecha descendente y tomar el más reciente
  registros.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
  const ultimo = registros[0];
  const ultimoPeso = ultimo.peso;

  const delta = nuevoPeso - ultimoPeso;
  const pct   = Number(((delta / ultimoPeso) * 100).toFixed(1));

  const ok = pct >= UMBRAL_PERDIDA_PCT && pct <= UMBRAL_GANANCIA_PCT;

  return { ok, delta: Math.round(delta), pct, ultimoPeso };
}

/**
 * Retorna el nivel de severidad del resultado del sanity check.
 * @param {SanityResult} result
 * @returns {'ok'|'warning'|'critical'}
 */
export function getSeverity({ ok, pct }) {
  if (ok) return 'ok';
  if (pct < -20 || pct > 40) return 'critical';
  return 'warning';
}

/**
 * @typedef {Object} SanityResult
 * @property {boolean}      ok        - true si el peso es coherente
 * @property {number|null}  delta     - diferencia absoluta en kg
 * @property {number|null}  pct       - diferencia porcentual
 * @property {number|null}  ultimoPeso - último peso registrado
 */
