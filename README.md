# wanna-trade

Analizador de mercado y simulador para aprender a invertir.

- **Analizar**: precios, indicadores y noticias con datos hasta hoy.
- **Simular**: vuelve a una fecha del pasado, arma un portafolio y avanza el reloj sin ver el futuro.
- **Aprender**: una ruta por pasos con misiones en el simulador.

Todas las funciones de datos reciben una **fecha de corte** (`asOf`). El analizador usa la fecha de hoy y el simulador una fecha del pasado, así que las mejoras de una sección sirven también para la otra.

Es la evolución de [tradex](https://github.com/kaezar22/tradex) (Streamlit).

## Stack

- Next.js 16 (App Router, TypeScript) desplegado en Vercel
- Tailwind CSS 4
- DeepSeek como LLM, llamado solo desde el servidor
- Precios de Yahoo Finance (API de gráficos v8) detrás de un adaptador propio
- Lightweight Charts de TradingView para los gráficos
- Vitest para los tests

## Correr en local

Requiere Node.js 20.9 o superior.

```bash
npm install
cp .env.example .env.local   # en Windows: copy .env.example .env.local
# llena DEEPSEEK_API_KEY y NEWS_API_KEY en .env.local
npm run dev
```

Abre http://localhost:3000. Para verificar las claves: http://localhost:3000/api/health

Tests:

```bash
npm test
```

Los indicadores se comparan contra valores generados con el código Python original de tradex (`scripts/make_tradex_fixture.py`).

## API de precios

`GET /api/prices?symbol=AAPL&interval=1d&start=2024-01-01&asOf=2024-06-28`

| Parámetro | Valores | Por defecto |
|---|---|---|
| `symbol` | Símbolo de Yahoo Finance: `AAPL`, `SPY`, `ICOLCAP.CL`, `COP=X`… | — |
| `interval` | `1h`, `1d`, `1wk`, `1mo` | `1d` |
| `start` | AAAA-MM-DD | hace un año |
| `asOf` | AAAA-MM-DD. Fecha de corte: conoces el cierre de ese día y nada posterior | sin corte (hasta ahora) |

Las semanas y meses se arman a partir de barras diarias ya cortadas, para que una semana parcial no incluya días posteriores a la fecha de corte. Las barras por hora solo existen para los últimos dos años.

Otras rutas:

| Ruta | Qué hace |
|---|---|
| `GET /api/screen?t=AAPL,MSFT,SPY&i=1d&r=1a` | Tendencia, riesgo y correlación de hasta 30 símbolos, y los 5 menos correlacionados |
| `GET /api/sentiment?q=Apple` | Titulares de NewsAPI y su sentimiento según DeepSeek |
| `GET /api/tickers?q=10 empresas de energía renovable` | Símbolos sugeridos por DeepSeek y verificados en Yahoo |
| `GET /api/cdt?fecha=2024-06-28` | Tasas de CDT por entidad y plazo conocidas en esa fecha (sin fecha: las más recientes) |
| `GET /api/cdt/history?plazo=90&desde=2021-01-01` | Tasa promedio mensual de CDT para un plazo |
| `GET /api/geo` | Noticias de geopolítica enriquecidas (la tabla de `/analizar/geopolitica` en JSON) |
| `GET /api/compare-cdt?symbol=SPY&desde=2023-01-02&monto=10000000&plazo=90` | Un ETF en pesos frente a CDT renovados con las tasas de cada momento |

Las tasas de CDT vienen del Formato 441 de la Superintendencia Financiera, publicado a diario en [datos.gov.co](https://www.datos.gov.co/en/Hacienda-y-Cr-dito-P-blico/Tasas-de-inter-s-de-captaci-n-y-operaciones-del-me/axk9-g2nh) desde enero de 2018. Para cada entidad y plazo se usa su dato más reciente de los últimos 10 días, y el promedio se pondera por monto, como la DTF.

Las rutas que usan DeepSeek tienen un límite de 20 consultas por hora por IP y guardan la respuesta una hora.

## Estrategias, perfil y macro

- `/analizar/backtest`: prueba cruce de medias, Chop Zone y rebote en Bollinger contra comprar y mantener. La señal del cierre de un día se ejecuta al cierre del siguiente, con comisión por cada cambio de posición. Un botón aplica la misma regla, sin tocarla, en otros activos para detectar sobreajuste.
- `/simular/perfil`: patrones acumulados de todas las partidas terminadas (aguantar pérdidas, perseguir subidas, costos, uso de CDT, resultado frente al S&P 500 y un CDT).
- `/analizar/macro`: tasa del Banco de la República e inflación anual (API SDMX en totoro.banrep.gov.co: `DF_CBR_MONTHLY_HIST` y `DF_UVR_DAILY_HIST`), tasa de CDT a 90 días, dólar en pesos y tasa de la Reserva Federal (FRED), cada una con su fuente.
  - La inflación se calcula con la UVR, que crece del 16 de un mes al 15 del siguiente con el IPC del mes anterior: inflación anual de X = UVR(15 de X+2) / UVR(15 de X−10) − 1. Datos de FRED para el IPC de Colombia están desactualizados, por eso no se usan.

## Geopolítica

`/analizar/geopolitica` es un servicio de enriquecimiento de datos sin base de datos:

1. Lee los RSS de 19 medios de distintos países (`src/lib/geo/outlets.ts`). El país de cada medio está fijado a mano, y se marca si es público (BBC, DW…) o estatal (TASS, CGTN…).
2. Toma hasta 5 noticias por medio de las últimas 48 horas. En los feeds que mezclan temas filtra antes por palabras clave.
3. DeepSeek, en lotes de 15, descarta lo que no es geopolítica y devuelve resumen en español, personas, países (ISO 3166), tema (lista fija), subtema, tono y efecto en el riesgo de mercado. La respuesta se valida contra la taxonomía (`src/lib/geo/classify.ts`).
4. El resultado se guarda una hora en caché. La tabla se puede filtrar y descargar en CSV.

Se descartó la API DOC de GDELT: desde Vercel responde 429 casi siempre (IP compartida) y el país que asigna a algunos medios es incorrecto.

## Simulador

`/simular` crea partidas que empiezan en una fecha del pasado (desde 2018) con un capital en pesos. Reglas:

- Solo se ven precios y tasas de CDT hasta la fecha simulada: `/api/sim/market` corta las series en el servidor.
- Las operaciones se hacen al cierre del día, con comisión y, en activos en dólares, diferencial cambiario.
- Los CDT usan las tasas reales de los bancos en esa fecha y quedan bloqueados hasta el vencimiento.
- Al terminar: comparación con el S&P 500, el COLCAP y CDT a 90 días (`/api/sim/benchmarks`) y un análisis de hábitos (vender pronto lo que gana, perseguir subidas, costos).
- Modo a ciegas: activos con alias y fechas como "Día N" hasta el final.

Las partidas se guardan en el navegador (localStorage) y se pueden exportar e importar como JSON.

## Aprender

`/aprender` tiene 7 lecciones (`src/lib/learn/lessons.ts`): fundamentos, gráficos, indicadores, qué comparar, portafolio, noticias y psicología. Cada una trae widgets interactivos, un quiz y una misión que abre el analizador o el simulador ya configurado (`/simular?inicio=2020-02-03&duracion=1a&ciegas=1&activos=SPY,TLT`). El progreso se guarda en el navegador.

El tutor (`POST /api/tutor`) responde con DeepSeek usando el texto de la lección como contexto, sin recomendaciones personalizadas, con un límite de 30 preguntas por hora por IP.

## Variables de entorno

| Variable | Uso |
|---|---|
| `DEEPSEEK_API_KEY` | Sentimiento de noticias, buscador de tickers y tutor |
| `NEWS_API_KEY` | Titulares de noticias recientes |
| `MARKET_DATA_MOCK` | Opcional. `1` = precios y tasas simulados para desarrollar sin conexión |
| `SOCRATA_APP_TOKEN` | Opcional. Token de datos.gov.co para tener un límite de consultas más alto |

En Vercel van en **Settings → Environment Variables**. Nunca uses el prefijo `NEXT_PUBLIC_` para claves: ese prefijo las expone en el navegador.

## Plan

| Fase | Contenido |
|---|---|
| 0 | Base del proyecto y despliegue ✅ |
| 1 | Núcleo de datos con fecha de corte, caché e indicadores en TypeScript con tests ✅ |
| 2 | Analizador: gráfico interactivo, selector, sentimiento, buscador de tickers ✅ |
| 3 | ETFs y CDT ✅ (falta el costo anual de los ETF, con fuente) |
| 4 | Simulador ✅ (falta: noticias históricas y guardar partidas en una base de datos) |
| 5 | Ruta de aprendizaje y tutor ✅ (el tutor usa la lección como contexto; RAG cuando haya más material) |
| 6 | Backtesting, perfil de decisiones, datos macro ✅ |

---

Herramienta educativa y de análisis. No es una recomendación de inversión.
