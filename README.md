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

Las rutas que usan DeepSeek tienen un límite de 20 consultas por hora por IP y guardan la respuesta una hora.

## Variables de entorno

| Variable | Uso |
|---|---|
| `DEEPSEEK_API_KEY` | Sentimiento de noticias, buscador de tickers y tutor |
| `NEWS_API_KEY` | Titulares de noticias recientes |
| `MARKET_DATA_MOCK` | Opcional. `1` = precios simulados para desarrollar sin conexión |

En Vercel van en **Settings → Environment Variables**. Nunca uses el prefijo `NEXT_PUBLIC_` para claves: ese prefijo las expone en el navegador.

## Plan

| Fase | Contenido |
|---|---|
| 0 | Base del proyecto y despliegue ✅ |
| 1 | Núcleo de datos con fecha de corte, caché e indicadores en TypeScript con tests ✅ |
| 2 | Analizador: gráfico interactivo, selector, sentimiento, buscador de tickers ✅ |
| 3 | ETFs y CDT |
| 4 | Simulador |
| 5 | Ruta de aprendizaje y tutor |
| 6 | Backtesting, perfil de decisiones, datos macro |

---

Herramienta educativa y de análisis. No es una recomendación de inversión.
