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

## Correr en local

Requiere Node.js 20.9 o superior.

```bash
npm install
cp .env.example .env.local   # en Windows: copy .env.example .env.local
# llena DEEPSEEK_API_KEY y NEWS_API_KEY en .env.local
npm run dev
```

Abre http://localhost:3000. Para verificar las claves: http://localhost:3000/api/health

## Variables de entorno

| Variable | Uso |
|---|---|
| `DEEPSEEK_API_KEY` | Sentimiento de noticias, buscador de tickers y tutor |
| `NEWS_API_KEY` | Titulares de noticias recientes |

En Vercel van en **Settings → Environment Variables**. Nunca uses el prefijo `NEXT_PUBLIC_` para claves: ese prefijo las expone en el navegador.

## Plan

| Fase | Contenido |
|---|---|
| 0 | Base del proyecto y despliegue ✅ |
| 1 | Núcleo de datos con fecha de corte, caché e indicadores en TypeScript con tests |
| 2 | Analizador: gráfico interactivo, selector, sentimiento, buscador de tickers |
| 3 | ETFs y CDT |
| 4 | Simulador |
| 5 | Ruta de aprendizaje y tutor |
| 6 | Backtesting, perfil de decisiones, datos macro |

---

Herramienta educativa y de análisis. No es una recomendación de inversión.
