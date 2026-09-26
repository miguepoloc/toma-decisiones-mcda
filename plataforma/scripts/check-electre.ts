// Prueba de humo de ELECTRE I. Compara contra 04_electre_iot_palmor.ipynb del curso: LoRaWAN supera
// a Zigbee, Sigfox supera a GSM/GPRS, y Sigfox/LoRaWAN quedan incomparables entre sí (esas son las
// ÚNICAS dos relaciones de superación con c*=0.65/d*=0.30).
import { electre, electreKernel, electreKernelText } from '../src/lib/electre.ts';

let fallos = 0;
const ok = (cond: boolean, msg: string) => { console.log((cond ? 'OK   ' : 'FALLA') + ' ' + msg); if (!cond) fallos++; };

{
  const tecnologias = ['LoRaWAN', 'GSM/GPRS', 'Sigfox', 'Zigbee'];
  const dataset = [
    [10, 8, 2, 5],
    [10.5, 0.5, 3, 2],
    [40, 2, 5, 2],
    [0.07, 1.5, 2, 4],
  ];
  const pesos = [0.16, 0.25, 0.488, 0.102];
  const tipo: ('max' | 'min')[] = ['max', 'max', 'max', 'max'];
  const r = electre(dataset, pesos, tipo, 0.65, 0.30);
  const idx = (n: string) => tecnologias.indexOf(n);

  ok(r.outranks[idx('LoRaWAN')][idx('Zigbee')], 'LoRaWAN supera a Zigbee');
  ok(r.outranks[idx('Sigfox')][idx('GSM/GPRS')], 'Sigfox supera a GSM/GPRS');
  ok(!r.outranks[idx('Sigfox')][idx('LoRaWAN')], 'Sigfox NO supera a LoRaWAN (discordancia alta)');
  ok(!r.outranks[idx('LoRaWAN')][idx('Sigfox')], 'LoRaWAN NO supera a Sigfox');

  const total = r.outranks.reduce((a, row) => a + row.filter(Boolean).length, 0);
  ok(total === 2, `exactamente 2 relaciones de superación en total (hay ${total})`);

  const dSigfoxLoRaWAN = r.discordance[idx('Sigfox')][idx('LoRaWAN')];
  ok(Math.abs(dSigfoxLoRaWAN - 1.0) < 1e-9, `discordancia Sigfox->LoRaWAN = ${dSigfoxLoRaWAN.toFixed(2)} (esperado 1.00)`);
}

{
  // Empate con el umbral: pesos 0.1 + 0.7 suman 0.7999999999999999 en coma flotante; con c* = 0.8 la relación no debe perderse por redondeo.
  const r = electre([[2, 2, 1], [1, 1, 2]], [0.1, 0.7, 0.2], ['max', 'max', 'max'], 0.8, 1);
  ok(r.concordance[0][1] < 0.8 || Math.abs(r.concordance[0][1] - 0.8) < 1e-9, `concordancia A->B = ${r.concordance[0][1]} (≈ 0.8)`);
  ok(r.outranks[0][1], 'A supera a B aunque la concordancia sea 0.7999999999999999 con c* = 0.8 (tolerancia 1e-9)');
  ok(!electre([[2, 2, 1], [1, 1, 2]], [0.1, 0.7, 0.2], ['max', 'max', 'max'], 0.81, 1).outranks[0][1], 'con c* = 0.81 sí deja de superar');
}

{
  // Núcleo (kernel). Caso de un estudiante: ciclo RF↔XGB que además supera a ARIMA y GRU, y MLP aislada (0 ARIMA, 1 RF, 2 XGB, 3 MLP, 4 GRU).
  // «Nadie la supera» daba a MLP como ganadora; el núcleo real son dos bloques y no hay ganador.
  const M = (pairs: [number, number][], n: number) => Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, k) => pairs.some(([a, b]) => a === i && b === k)));
  const names = ['ARIMA', 'Random Forest', 'XGBoost', 'MLP', 'GRU'];
  const k = electreKernel(M([[1, 0], [1, 2], [1, 4], [2, 1], [2, 4]], 5));
  ok(k.winner === null, 'MLP aislada + ciclo RF↔XGB: no hay ganador único');
  ok(k.blocks.length === 2, `el núcleo tiene 2 bloques (hay ${k.blocks.length})`);
  ok(k.members.join() === '1,2,3', `núcleo = Random Forest, XGBoost y MLP (${k.members.map((i) => names[i]).join(', ')})`);
  ok(k.isolated.join() === '3', 'MLP está aislada');
  ok(k.cycles.length === 1 && k.cycles[0].join() === '1,2', 'el ciclo es {Random Forest, XGBoost}');
  const t = electreKernelText(names, k, true);
  ok(/MLP/.test(t.reasons.join(' ')) && /no hay ganador/.test(t.summary), 'el texto explica por qué MLP está en el núcleo sin ganar');

  const w = electreKernel(M([[0, 1], [0, 2]], 3));
  ok(w.winner === 0 && w.members.join() === '0', 'A supera a B y C: A es la única del núcleo y gana');
  const chain = electreKernel(M([[0, 1], [1, 2]], 3));
  ok(chain.members.join() === '0,2' && chain.winner === null, 'cadena A→B→C sin A→C: núcleo {A, C}, sin ganador (C no es superada por A)');
  const none = electreKernel(M([], 3));
  ok(none.members.length === 3 && none.winner === null && none.isolated.length === 0, 'sin relaciones: todas en el núcleo, sin ganador y sin «aisladas»');
  const tri = electreKernel(M([[0, 1], [1, 2], [2, 0]], 3));
  ok(tri.blocks.length === 1 && tri.blocks[0].length === 3 && tri.winner === null, 'ciclo de 3: un solo bloque, sin ganador');
}

console.log(fallos ? `\n${fallos} prueba(s) fallaron` : '\nTodas las pruebas pasaron');
process.exit(fallos ? 1 : 0);
