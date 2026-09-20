// Prueba de humo de VIKOR. Compara contra 03_vikor_iot_palmor.ipynb del curso (caso IoT/Palmor).
import { vikor } from '../src/lib/vikor.ts';

let fallos = 0;
const ok = (cond: boolean, msg: string) => { console.log((cond ? 'OK   ' : 'FALLA') + ' ' + msg); if (!cond) fallos++; };
const cerca = (a: number, b: number, tol = 5e-3) => Math.abs(a - b) <= tol;

// Resultado esperado (notebook, salida cacheada): Sigfox S=0.302 R=0.200 Q=0.000,
// GSM/GPRS S=0.796 R=0.325 Q=0.631, LoRaWAN S=0.608 R=0.488 Q=0.757, Zigbee S=0.899 R=0.488 Q=1.000.
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
  const r = vikor(dataset, pesos, tipo);
  const esperadoS = [0.608, 0.796, 0.302, 0.899];
  const esperadoR = [0.488, 0.325, 0.200, 0.488];
  const esperadoQ = [0.757, 0.631, 0.000, 1.000];
  tecnologias.forEach((t, i) => {
    ok(cerca(r.s[i], esperadoS[i]), `S_${t} = ${r.s[i].toFixed(3)} (esperado ${esperadoS[i]})`);
    ok(cerca(r.r[i], esperadoR[i]), `R_${t} = ${r.r[i].toFixed(3)} (esperado ${esperadoR[i]})`);
    ok(cerca(r.q[i], esperadoQ[i]), `Q_${t} = ${r.q[i].toFixed(3)} (esperado ${esperadoQ[i]})`);
  });
  ok(tecnologias[r.order[0]] === 'Sigfox', `ganador (menor Q) = ${tecnologias[r.order[0]]} (esperado Sigfox)`);
}

console.log(fallos ? `\n${fallos} prueba(s) fallaron` : '\nTodas las pruebas pasaron');
process.exit(fallos ? 1 : 0);
