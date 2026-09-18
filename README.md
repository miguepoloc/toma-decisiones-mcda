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
| 01 | [`01_ahp_iot_palmor.ipynb`](01_ahp_iot_palmor.ipynb) | AHP | [![Open In Colab](https://colab.research.google.com/assets/colab-badge.svg)](https://colab.research.google.com/github/miguepoloc/toma-decisiones-mcda/blob/main/01_ahp_iot_palmor.ipynb) |
| 02 | [`02_topsis_iot_palmor.ipynb`](02_topsis_iot_palmor.ipynb) | TOPSIS | [![Open In Colab](https://colab.research.google.com/assets/colab-badge.svg)](https://colab.research.google.com/github/miguepoloc/toma-decisiones-mcda/blob/main/02_topsis_iot_palmor.ipynb) |
| 03 | [`03_vikor_iot_palmor.ipynb`](03_vikor_iot_palmor.ipynb) | VIKOR | [![Open In Colab](https://colab.research.google.com/assets/colab-badge.svg)](https://colab.research.google.com/github/miguepoloc/toma-decisiones-mcda/blob/main/03_vikor_iot_palmor.ipynb) |
| 04 | [`04_electre_iot_palmor.ipynb`](04_electre_iot_palmor.ipynb) | ELECTRE | [![Open In Colab](https://colab.research.google.com/assets/colab-badge.svg)](https://colab.research.google.com/github/miguepoloc/toma-decisiones-mcda/blob/main/04_electre_iot_palmor.ipynb) |
| 05 | [`05_promethee_iot_palmor.ipynb`](05_promethee_iot_palmor.ipynb) | PROMETHEE II | [![Open In Colab](https://colab.research.google.com/assets/colab-badge.svg)](https://colab.research.google.com/github/miguepoloc/toma-decisiones-mcda/blob/main/05_promethee_iot_palmor.ipynb) |
| 06 | [`06_anp_iot_palmor.ipynb`](06_anp_iot_palmor.ipynb) | ANP | [![Open In Colab](https://colab.research.google.com/assets/colab-badge.svg)](https://colab.research.google.com/github/miguepoloc/toma-decisiones-mcda/blob/main/06_anp_iot_palmor.ipynb) |

## Caso usado

**00 a 06 comparten un mismo caso real**: elegir una tecnología de comunicación
(LoRaWAN, GSM/GPRS, Sigfox o Zigbee) para una red de sensores IoT/WSN de monitoreo
agroclimático en Palmor, corregimiento de Ciénaga (Sierra Nevada de Santa Marta,
Magdalena), una zona con conectividad limitada verificada vía MinTIC. Los 4 criterios
(alcance de comunicación, autonomía de batería, infraestructura/cobertura comercial en
Colombia, madurez/viabilidad comercial del proveedor) y los valores técnicos de la
matriz de decisión son reales, verificados vía WebSearch (datasheets SIMCom/DigiKey,
The Things Network, Lauridsen et al. 2019 *Sensors*/MDPI, noticias de apagado de 2G en
Colombia).

**AHP (01), TOPSIS (02) y VIKOR (03)** resuelven exactamente el caso ya visto en clase
(Sesiones 1-3 del curso), con los mismos pesos y matriz de decisión ya publicados y
verificados allí. **ELECTRE (04), PROMETHEE II (05) y ANP (06)** aplican sus métodos a
este mismo caso por primera vez en este repositorio — es una extensión nueva, con datos
reales y métodos/umbrales de convención del curso, pero **aún no vista en clase** (en el
curso presencial, esos 3 bloques todavía se enseñan sobre un caso distinto, de
zonificación agrícola). Cada notebook lo aclara explícitamente en su celda introductoria.

## Dependencias

```
pip install -r requirements.txt
```

Todos los notebooks funcionan directamente en Google Colab (el botón de cada uno
incluye la celda `!pip install pyDecision` necesaria); `numpy`, `pandas` y
`matplotlib` ya vienen preinstalados en Colab.

## Licencia

MIT, ver [LICENSE](LICENSE).
