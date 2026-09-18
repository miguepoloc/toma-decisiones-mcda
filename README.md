# Toma de Decisiones Multicriterio (MCDA) en Python

Notebooks de Jupyter con implementaciones en Python de los métodos MCDA (Multi-Criteria
Decision Analysis / Decision Making) vistos en el curso de posgrado **Toma de Decisiones
Multicriterio** (Maestría en Ingeniería, Universidad del Magdalena), dictado por
Miguel Ángel Polo-Castañeda.

Cada notebook está ya ejecutado end-to-end (los resultados que ves son reales, no
simulados) y tiene un botón para abrirlo directamente en Google Colab, sin instalar
nada localmente.

## Notebooks

| # | Notebook | Método | Abrir |
|---|----------|--------|-------|
| 00 | [`00_priorizacion_criterios.ipynb`](00_priorizacion_criterios.ipynb) | Priorización de criterios (votación en grupo) | [![Open In Colab](https://colab.research.google.com/assets/colab-badge.svg)](https://colab.research.google.com/github/miguepoloc/toma-decisiones-mcda/blob/main/00_priorizacion_criterios.ipynb) |
| 01 | [`01_ahp_cacao.ipynb`](01_ahp_cacao.ipynb) | AHP | [![Open In Colab](https://colab.research.google.com/assets/colab-badge.svg)](https://colab.research.google.com/github/miguepoloc/toma-decisiones-mcda/blob/main/01_ahp_cacao.ipynb) |
| 02 | [`02_topsis_cacao.ipynb`](02_topsis_cacao.ipynb) | TOPSIS | [![Open In Colab](https://colab.research.google.com/assets/colab-badge.svg)](https://colab.research.google.com/github/miguepoloc/toma-decisiones-mcda/blob/main/02_topsis_cacao.ipynb) |
| 03 | [`03_vikor_cacao.ipynb`](03_vikor_cacao.ipynb) | VIKOR | [![Open In Colab](https://colab.research.google.com/assets/colab-badge.svg)](https://colab.research.google.com/github/miguepoloc/toma-decisiones-mcda/blob/main/03_vikor_cacao.ipynb) |
| 04 | [`04_electre_cacao.ipynb`](04_electre_cacao.ipynb) | ELECTRE | [![Open In Colab](https://colab.research.google.com/assets/colab-badge.svg)](https://colab.research.google.com/github/miguepoloc/toma-decisiones-mcda/blob/main/04_electre_cacao.ipynb) |
| 05 | [`05_promethee_cacao.ipynb`](05_promethee_cacao.ipynb) | PROMETHEE II | [![Open In Colab](https://colab.research.google.com/assets/colab-badge.svg)](https://colab.research.google.com/github/miguepoloc/toma-decisiones-mcda/blob/main/05_promethee_cacao.ipynb) |
| 06 | [`06_anp_cacao.ipynb`](06_anp_cacao.ipynb) | ANP | [![Open In Colab](https://colab.research.google.com/assets/colab-badge.svg)](https://colab.research.google.com/github/miguepoloc/toma-decisiones-mcda/blob/main/06_anp_cacao.ipynb) |

## Casos usados

- **01-06** comparten un mismo caso: zonificación de 4 corregimientos de la Sierra
  Nevada de Santa Marta (Bonda, Guachaca, San Pedro, Palmor) según su aptitud para
  monitoreo de riesgo de Moniliasis en cultivos de cacao, con 4 criterios
  edafoclimáticos (temperatura, humedad bajo el dosel, pH y conductividad eléctrica
  del suelo). Es el caso de investigación doctoral real del docente; **los valores
  numéricos son ilustrativos**, no hay datos de campo todavía.
- **00** usa un caso distinto (selección de una tecnología de comunicación
  LoRaWAN/GSM-GPRS/Sigfox/Zigbee para una red de sensores IoT/WSN agrícola en
  Palmor), usado en el curso para introducir la fase de *elección de criterios*
  antes de comparar alternativas.

## Dependencias

```
pip install -r requirements.txt
```

Todos los notebooks funcionan directamente en Google Colab (el botón de cada uno
incluye la celda `!pip install pyDecision` necesaria); `numpy`, `pandas` y
`matplotlib` ya vienen preinstalados en Colab.

## Licencia

MIT, ver [LICENSE](LICENSE).
