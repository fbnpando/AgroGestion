import Dexie from 'dexie';

export const db = new Dexie('SanSilvestreDB');

db.version(1).stores({
  animals: 'id, uid_nfc, raza, edad_meses, estado, ultimo_peso, lote, gmd, fecha_ultimo_pesaje',
  records: '++id, animal_id, peso, fecha, sincronizado_nube, tipo, operario',
  alerts:  '++id, animal_id, tipo, mensaje, fecha, leida',
});

export async function seedMockData() {
  const count = await db.animals.count();
  if (count > 0) return;

  const lotes   = ['Engorde A', 'Engorde B', 'Cría 1', 'Cría 2'];
  const razas   = ['Brahman', 'Nelore', 'Brangus', 'Aberdeen Angus', 'Hereford'];
  const estados = ['Sano', 'Sano', 'Sano', 'Observación', 'Tratamiento'];

  const animals = Array.from({ length: 300 }, (_, i) => {
    const n = String(i + 1).padStart(4, '0');
    return {
      id:                `NFC-${n}`,
      uid_nfc:           `TAG-${n}`,
      raza:              razas[i % razas.length],
      edad_meses:        18 + (i * 2) % 48,
      estado:            estados[i % estados.length],
      ultimo_peso:       280 + Math.round(Math.random() * 250),
      lote:              lotes[i % lotes.length],
      gmd:               +(0.5 + Math.random() * 0.8).toFixed(2),
      fecha_ultimo_pesaje: new Date(2024, 9, 12 - (i % 7)).toISOString(),
    };
  });
  await db.animals.bulkAdd(animals);

  // Historial de pesajes (8 semanas) para los primeros 20 animales
  const records = [];
  const base = new Date(2024, 8, 1); // 1 Sep 2024
  for (const a of animals.slice(0, 80)) {
    for (let w = 0; w < 8; w++) {
      records.push({
        animal_id:         a.id,
        peso:              280 + Math.round(Math.random() * 60) + w * 15,
        fecha:             new Date(base.getTime() + w * 7 * 86400000).toISOString(),
        sincronizado_nube: true,
        tipo:              'PESAJE',
        operario:          ['Juan P.', 'Miguel R.', 'Carlos S.'][i % 3],
      });
    }
  }

  // Pesajes recientes (los últimos días)
  const recentIds = ['NFC-0042','NFC-0045','NFC-0038','NFC-0021','NFC-0019','NFC-0056'];
  const recentWeights = [450, 432, 418, 465, 395, 302];
  const recentDates = ['2024-10-12','2024-10-12','2024-10-11','2024-10-11','2024-10-10','2024-10-10'];
  const recentLotes = ['Engorde A','Engorde A','Cría 2','Engorde B','Cría 2','Engorde A'];
  for (let j = 0; j < recentIds.length; j++) {
    records.push({
      animal_id: recentIds[j],
      peso: recentWeights[j],
      fecha: new Date(recentDates[j]).toISOString(),
      sincronizado_nube: true,
      tipo: 'PESAJE',
      operario: 'Juan P.',
    });
  }
  await db.records.bulkAdd(records);

  // Alertas
  await db.alerts.bulkAdd([
    { animal_id: 'NFC-0056', tipo: 'gmd_bajo', mensaje: 'Baja ganancia NFC-0056', fecha: new Date(Date.now() - 2 * 3600000).toISOString(), leida: false },
    { animal_id: 'NFC-0012', tipo: 'gmd_bajo', mensaje: 'Baja ganancia NFC-0012', fecha: new Date(Date.now() - 6 * 3600000).toISOString(), leida: false },
    { animal_id: 'NFC-0078', tipo: 'sin_pesaje', mensaje: 'Sin pesaje hace 14 días', fecha: new Date(Date.now() - 86400000).toISOString(), leida: false },
  ]);

  console.log('[DB] San Silvestre data seeded.');
}
