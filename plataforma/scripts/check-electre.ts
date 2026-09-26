// Prueba de humo de ELECTRE I. Compara contra 04_electre_iot_palmor.ipynb del curso: LoRaWAN supera
// a Zigbee, Sigfox supera a GSM/GPRS, y Sigfox/LoRaWAN quedan incomparables entre sí (esas son las
// ÚNICAS dos relaciones de superación con c*=0.65/d*=0.30).
import { electre } from '../src/lib/electre.ts';

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

console.log(fallos ? `\n${fallos} prueba(s) fallaron` : '\nTodas las pruebas pasaron');
process.exit(fallos ? 1 : 0);
