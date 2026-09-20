// Prueba de humo de PROMETHEE II. Compara contra 05_promethee_iot_palmor.ipynb del curso.
import { promethee } from '../src/lib/promethee.ts';

let fallos = 0;
const ok = (cond: boolean, msg: string) => { console.log((cond ? 'OK   ' : 'FALLA') + ' ' + msg); if (!cond) fallos++; };
const cerca = (a: number, b: number, tol = 5e-3) => Math.abs(a - b) <= tol;

// Resultado esperado (notebook): Sigfox +0.465, LoRaWAN +0.057, GSM/GPRS -0.193, Zigbee -0.330.
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
  const r = promethee(dataset, pesos, tipo);
  const esperado = [0.057, -0.193, 0.465, -0.330];
  tecnologias.forEach((t, i) => ok(cerca(r.phi[i], esperado[i]), `phi_${t} = ${r.phi[i].toFixed(3)} (esperado ${esperado[i]})`));
  ok(tecnologias[r.order[0]] === 'Sigfox', `ganador = ${tecnologias[r.order[0]]} (esperado Sigfox)`);
  const suma = r.phi.reduce((a, b) => a + b, 0);
  ok(cerca(suma, 0, 1e-6), `suma de flujos netos = ${suma.toFixed(6)} (esperado ~0, propiedad de PROMETHEE II)`);
}

console.log(fallos ? `\n${fallos} prueba(s) fallaron` : '\nTodas las pruebas pasaron');
process.exit(fallos ? 1 : 0);
