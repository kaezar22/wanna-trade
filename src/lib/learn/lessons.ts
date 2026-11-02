// Ruta de aprendizaje. Contenido propio, escrito para alguien que empieza a
// invertir desde Colombia. Cada lección termina con un quiz corto y una misión
// en el analizador o el simulador.
//
// Formato de texto: **negrita** es lo único especial.

export type Block =
  | { t: "p"; text: string }
  | { t: "h"; text: string }
  | { t: "list"; items: string[] }
  | { t: "callout"; tone: "idea" | "ojo"; text: string }
  | { t: "widget"; name: "compound" | "candle" | "diversification" }
  | { t: "tool"; href: string; label: string; text: string };

export type QuizQuestion = { q: string; options: string[]; answer: number; why: string };

export type Lesson = {
  slug: string;
  level: number;
  title: string;
  summary: string;
  minutes: number;
  blocks: Block[];
  quiz: QuizQuestion[];
  mission: { title: string; text: string; href: string; cta: string };
  /** Preguntas sugeridas para el tutor. */
  prompts: string[];
};

export const LESSONS: Lesson[] = [
  {
    slug: "fundamentos",
    level: 1,
    title: "Qué es invertir",
    summary: "Ahorro, inflación, interés compuesto y la relación entre riesgo y rentabilidad.",
    minutes: 8,
    blocks: [
      {
        t: "p",
        text: "Ahorrar es guardar plata. Invertir es ponerla a trabajar: prestarla, como en un CDT, o volverte dueño de una parte de algo, como en una acción o un ETF. La razón principal para invertir es que la plata guardada pierde valor con el tiempo.",
      },
      { t: "h", text: "La inflación se come lo que no crece" },
      {
        t: "p",
        text: "Si los precios suben 5 % en un año, un millón de pesos debajo del colchón compra al final del año lo que antes compraban unos 952.000 pesos. Por eso lo que importa no es cuánto ganas, sino cuánto ganas **por encima de la inflación**: la rentabilidad real.",
      },
      {
        t: "callout",
        tone: "idea",
        text: "Rentabilidad real ≈ rentabilidad de la inversión menos inflación. Un CDT al 10 % con inflación del 5 % te deja cerca de 5 % real, antes de impuestos.",
      },
      { t: "h", text: "El interés compuesto" },
      {
        t: "p",
        text: "Cuando reinviertes lo que ganas, el año siguiente ganas también sobre las ganancias anteriores. Al principio la diferencia es pequeña; con los años se vuelve la parte más grande del resultado. El factor que más pesa es el tiempo.",
      },
      { t: "widget", name: "compound" },
      { t: "h", text: "Riesgo y rentabilidad van juntos" },
      {
        t: "p",
        text: "Nadie paga más rentabilidad sin pedir algo a cambio. Lo que se pide es aceptar incertidumbre: que el valor suba y baje, que a veces pierdas. A mayor rentabilidad esperada, mayor riesgo. Si alguien te promete mucha rentabilidad sin riesgo, desconfía.",
      },
      {
        t: "list",
        items: [
          "**Renta fija:** prestas tu plata a cambio de un interés acordado. CDT, bonos. Sabes de antemano cuánto vas a recibir si el emisor cumple.",
          "**Renta variable:** compras una parte de una empresa o de muchas. Acciones, ETF de acciones. Ganas si la empresa crece y reparte utilidades, pero el precio se mueve todos los días.",
          "**ETF:** un fondo que compras como una acción y que replica un índice. Con uno solo tienes cientos de empresas, lo que reduce el riesgo de que una sola te hunda.",
        ],
      },
      {
        t: "callout",
        tone: "ojo",
        text: "Los CDT en Colombia están cubiertos por el seguro de depósitos de Fogafín hasta 50 millones de pesos por persona en cada entidad. Las acciones y los ETF no tienen ese seguro: su valor puede caer.",
      },
      {
        t: "tool",
        href: "/analizar/cdt",
        label: "Ver tasas de CDT hoy",
        text: "Mira qué pagan hoy los bancos y calcula cuánto te queda después de retención e inflación.",
      },
    ],
    quiz: [
      {
        q: "Un CDT paga 9 % al año y la inflación es 6 %. ¿Cuál es, más o menos, tu rentabilidad real antes de impuestos?",
        options: ["9 %", "15 %", "3 %", "−3 %"],
        answer: 2,
        why: "La rentabilidad real descuenta la inflación: 9 % − 6 % ≈ 3 %. Es lo que de verdad crece tu poder de compra.",
      },
      {
        q: "¿Qué hace que el interés compuesto pese tanto en el largo plazo?",
        options: [
          "Que la tasa sube cada año",
          "Que ganas intereses sobre los intereses ya ganados",
          "Que el banco te regala un bono",
          "Que la inflación baja",
        ],
        answer: 1,
        why: "Al reinvertir, cada año la base es más grande. Con el tiempo, las ganancias sobre ganancias superan lo que aportaste.",
      },
      {
        q: "¿Cuál de estas inversiones tiene el valor más estable día a día?",
        options: ["Una acción de una sola empresa", "Un ETF de acciones", "Un CDT", "Una criptomoneda"],
        answer: 2,
        why: "El CDT es renta fija: sabes cuánto recibirás al vencer. Las acciones, los ETF de acciones y las criptomonedas cambian de precio todos los días.",
      },
    ],
    mission: {
      title: "Calcula tu rentabilidad real",
      text: "Abre las tasas de CDT de hoy, elige el banco que mejor paga a 360 días y escribe en la calculadora la inflación más reciente. ¿Cuánto ganas de verdad después de retención e inflación?",
      href: "/analizar/cdt?plazo=360",
      cta: "Ir a tasas de CDT",
    },
    prompts: [
      "¿Por qué la inflación hace que guardar plata sea perder?",
      "Explícame el interés compuesto con un ejemplo en pesos",
      "¿Qué diferencia hay entre un CDT y un ETF?",
    ],
  },
  {
    slug: "graficos",
    level: 2,
    title: "Leer un gráfico",
    summary: "Velas, volumen, tendencias, soportes y resistencias, y por qué importa la escala de tiempo.",
    minutes: 8,
    blocks: [
      {
        t: "p",
        text: "Un gráfico de precios es la historia de lo que la gente estuvo dispuesta a pagar por algo. No dice el futuro, pero ayuda a ver si el precio viene subiendo, bajando o moviéndose de lado, y qué tan fuerte se mueve.",
      },
      { t: "h", text: "Anatomía de una vela" },
      {
        t: "p",
        text: "Cada vela resume un periodo: un día, una semana, un mes. Muestra cuatro precios: el de apertura, el de cierre, el máximo y el mínimo.",
      },
      { t: "widget", name: "candle" },
      {
        t: "list",
        items: [
          "**Cuerpo:** va de la apertura al cierre. Verde si cerró más arriba de donde abrió, rojo si cerró más abajo.",
          "**Mechas:** las líneas finas muestran hasta dónde llegó el precio durante el periodo, aunque no cerrara ahí.",
          "Un cuerpo largo indica que un lado ganó con claridad; mechas largas indican que hubo pelea y el precio fue rechazado.",
        ],
      },
      { t: "h", text: "Tendencias" },
      {
        t: "p",
        text: "Una tendencia alcista hace máximos y mínimos cada vez más altos; una bajista, cada vez más bajos. Cuando no pasa ninguna de las dos, el precio está lateral. Ponerse a favor de la tendencia suele ser más fácil que adivinar cuándo se da la vuelta.",
      },
      { t: "h", text: "Soportes y resistencias" },
      {
        t: "p",
        text: "Son zonas donde el precio se ha frenado varias veces: un soporte por debajo, donde aparecen compradores, y una resistencia por encima, donde aparecen vendedores. No son muros: se rompen. Cuando una resistencia se rompe con fuerza, muchas veces pasa a funcionar como soporte.",
      },
      { t: "h", text: "El volumen y la escala de tiempo" },
      {
        t: "p",
        text: "El volumen dice cuánta gente participó. Un movimiento con mucho volumen es más creíble que uno con poco. Y la escala cambia la historia: lo que en el gráfico diario parece una caída fuerte puede ser un pequeño descanso en el semanal. Mira siempre el panorama largo antes del corto.",
      },
      {
        t: "callout",
        tone: "ojo",
        text: "Para algunos instrumentos colombianos, como ICOLCAP, la fuente de datos solo trae el precio de cierre. En esos casos el analizador muestra una línea en vez de velas.",
      },
      {
        t: "tool",
        href: "/analizar?s=SPY&i=1wk&r=5a",
        label: "Abrir el S&P 500 en semanal",
        text: "Cambia entre diario, semanal y mensual y fíjate cómo cambia la lectura de la tendencia.",
      },
    ],
    quiz: [
      {
        q: "Una vela verde con mecha superior muy larga significa que…",
        options: [
          "El precio cerró en el máximo del día",
          "El precio llegó muy arriba pero lo empujaron hacia abajo antes del cierre",
          "No hubo operaciones",
          "El precio va a subir mañana",
        ],
        answer: 1,
        why: "La mecha superior marca el máximo. Si es larga, el precio estuvo mucho más arriba y los vendedores lo bajaron antes del cierre, aunque terminó por encima de la apertura.",
      },
      {
        q: "¿Qué define una tendencia alcista?",
        options: [
          "Que hoy subió",
          "Máximos y mínimos cada vez más altos",
          "Mucho volumen",
          "Que está por encima del precio de hace un año",
        ],
        answer: 1,
        why: "Un día no hace tendencia. La secuencia de máximos y mínimos crecientes es lo que la define.",
      },
      {
        q: "¿Por qué conviene mirar primero el gráfico semanal o mensual?",
        options: [
          "Porque es más bonito",
          "Porque muestra la dirección de fondo y evita confundir un descanso con un cambio de tendencia",
          "Porque tiene menos datos",
          "Porque el diario siempre está equivocado",
        ],
        answer: 1,
        why: "El panorama largo da contexto. Una caída en el diario puede ser solo un respiro dentro de una tendencia alcista semanal.",
      },
    ],
    mission: {
      title: "Encuentra la tendencia de Colombia",
      text: "Abre ICOLCAP en semanal a 5 años. ¿Dónde ves soportes y resistencias? ¿La tendencia de los últimos 6 meses coincide con la de los 5 años?",
      href: "/analizar?s=ICOLCAP.CL&i=1wk&r=5a",
      cta: "Abrir ICOLCAP",
    },
    prompts: [
      "¿Qué me dice una vela con cuerpo pequeño y mechas largas?",
      "¿Cómo encuentro un soporte en el gráfico?",
      "¿Por qué el volumen confirma un movimiento?",
    ],
  },
  {
    slug: "indicadores",
    level: 3,
    title: "Indicadores: qué dicen y qué no",
    summary: "Medias móviles, Bollinger, Chop Zone, Ichimoku y rango esperado, con sus límites.",
    minutes: 10,
    blocks: [
      {
        t: "p",
        text: "Un indicador es una fórmula sobre los precios pasados. Resume algo que ya está en el gráfico para verlo más fácil: la tendencia, la volatilidad, el impulso. Ninguno ve el futuro, y todos dan señales falsas. Úsalos para ordenar lo que ves, no para que decidan por ti.",
      },
      { t: "h", text: "Medias móviles" },
      {
        t: "p",
        text: "El promedio de los últimos N cierres. Suavizan el ruido y muestran la dirección. Una media corta (por ejemplo 20) reacciona rápido; una larga (50 o 200) muestra la tendencia de fondo. Cuando la corta cruza por encima de la larga, muchos lo leen como señal alcista. El problema: llega tarde, y en mercados laterales los cruces se repiten sin sentido.",
      },
      { t: "h", text: "Bandas de Bollinger" },
      {
        t: "p",
        text: "Una media de 20 periodos con una banda arriba y otra abajo a dos desviaciones estándar. Cuando las bandas se abren, la volatilidad subió; cuando se cierran, el mercado está tranquilo, y eso suele anteceder un movimiento fuerte, en cualquier dirección. Tocar la banda superior no significa que vaya a bajar: en tendencias fuertes el precio puede caminar pegado a ella.",
      },
      { t: "h", text: "Chop Zone" },
      {
        t: "p",
        text: "Mide la pendiente de una media exponencial y la colorea: azules y verdes para subida, naranjas y rojos para bajada, amarillo para lateral. Sirve para saber si hay tendencia antes de usar herramientas que solo funcionan con tendencia.",
      },
      { t: "h", text: "Ichimoku" },
      {
        t: "p",
        text: "Un sistema japonés con varias líneas y una nube proyectada hacia adelante. Precio por encima de la nube suele leerse como tendencia alcista; por debajo, bajista; dentro, indecisión. La nube adelantada se calcula solo con datos pasados: muestra dónde estarían las referencias, no adónde irá el precio.",
      },
      { t: "h", text: "Rango esperado" },
      {
        t: "p",
        text: "No dice si el precio subirá o bajará: dice qué tan lejos suele moverse según su volatilidad reciente. Alrededor de 2 de cada 3 veces el precio termina dentro del rango de una desviación. Sirve para calibrar expectativas y tamaño de las posiciones.",
      },
      {
        t: "callout",
        tone: "ojo",
        text: "Si un indicador funcionara siempre, todos lo usarían y dejaría de funcionar. Combina pocos, entiende qué miden, y desconfía de cualquier señal que no tenga sentido con la tendencia de fondo.",
      },
      {
        t: "tool",
        href: "/analizar?s=QQQ&i=1d&r=2a",
        label: "Probar indicadores en QQQ",
        text: "Activa uno por uno y observa en qué momentos acertaron y en cuáles dieron señales falsas.",
      },
    ],
    quiz: [
      {
        q: "¿Cuál es la principal debilidad de los cruces de medias móviles?",
        options: [
          "Son difíciles de calcular",
          "Llegan tarde y dan muchas señales falsas cuando no hay tendencia",
          "Solo funcionan en Colombia",
          "Siempre aciertan",
        ],
        answer: 1,
        why: "Al promediar el pasado reaccionan con retraso, y en un mercado lateral se cruzan una y otra vez sin que haya una tendencia real.",
      },
      {
        q: "Las bandas de Bollinger se estrechan mucho. Eso suele indicar que…",
        options: [
          "El precio va a subir",
          "El precio va a bajar",
          "La volatilidad está baja y puede venir un movimiento fuerte, sin saber hacia dónde",
          "El activo dejó de cotizar",
        ],
        answer: 2,
        why: "Las bandas miden volatilidad. Estrechas significa calma, y la calma prolongada suele terminar en un movimiento grande, pero la dirección no la dicen.",
      },
      {
        q: "El rango esperado de un activo es ±8 % a 20 días. Eso significa que…",
        options: [
          "Va a subir 8 %",
          "Cerca de 2 de cada 3 veces termina entre −8 % y +8 % en ese plazo",
          "Nunca se moverá más de 8 %",
          "Es una garantía del banco",
        ],
        answer: 1,
        why: "Es una medida de dispersión según la volatilidad pasada. Un tercio de las veces el precio se sale del rango.",
      },
    ],
    mission: {
      title: "Juega solo con medias móviles",
      text: "Haz una partida a ciegas de 6 meses. Regla: compra solo cuando la media de 20 esté por encima de la de 50, y vende cuando cruce hacia abajo. Al final mira si la regla le ganó a quedarse quieto.",
      href: "/simular?ciegas=1&duracion=6m&activos=SPY,QQQ,GLD,TLT&nombre=Medias%20m%C3%B3viles",
      cta: "Empezar la partida",
    },
    prompts: [
      "¿Por qué los indicadores dan señales falsas?",
      "¿Cómo combino la Chop Zone con las medias móviles?",
      "Explícame la nube de Ichimoku en palabras simples",
    ],
  },
  {
    slug: "comparar",
    level: 4,
    title: "Qué comparar antes de invertir",
    summary: "Volatilidad, caída máxima, Sharpe, correlación, costos y riesgo cambiario.",
    minutes: 9,
    blocks: [
      {
        t: "p",
        text: "Dos inversiones pueden haber rendido lo mismo y ser muy distintas: una pudo llegar tranquila y la otra pasar por una caída del 40 %. Comparar solo la rentabilidad es mirar la mitad de la historia.",
      },
      { t: "h", text: "Las medidas que importan" },
      {
        t: "list",
        items: [
          "**Volatilidad:** cuánto se mueve el precio en un año típico. Más volatilidad es más incertidumbre.",
          "**Caída máxima:** la peor caída desde un pico. Es lo que habrías tenido que aguantar sin vender. Pregúntate si de verdad lo aguantarías.",
          "**Sharpe:** rentabilidad por encima de la tasa libre de riesgo, por cada unidad de volatilidad. Sirve para comparar si el riesgo extra valió la pena. Más de 1 es bueno.",
          "**Correlación:** si dos activos suben y bajan juntos (cerca de 1), no se protegen entre sí. Si se mueven distinto (cerca de 0 o negativa), combinarlos reduce el riesgo.",
        ],
      },
      { t: "h", text: "Los costos" },
      {
        t: "p",
        text: "Comisiones del intermediario, costo anual del fondo, diferencial al cambiar pesos por dólares, retención en la fuente. Una diferencia de 1 % al año parece pequeña, pero en 20 años se lleva una parte grande del resultado por el mismo interés compuesto que juega a tu favor.",
      },
      { t: "h", text: "El riesgo cambiario" },
      {
        t: "p",
        text: "Si compras un ETF en dólares, tu resultado en pesos depende de dos cosas: lo que haga el ETF y lo que haga el dólar. Si el ETF sube 10 % pero el peso se revalúa 10 %, en pesos quedas casi igual. Ese riesgo también protege: cuando a Colombia le va mal, el dólar suele subir y amortigua las caídas.",
      },
      {
        t: "callout",
        tone: "idea",
        text: "Compara siempre en la moneda en la que vas a gastar. Si vives en Colombia, la pregunta es cuántos pesos tienes al final.",
      },
      {
        t: "tool",
        href: "/analizar/etfs?s=SPY&plazo=90",
        label: "Comparar un ETF con un CDT",
        text: "Mira el S&P 500 en pesos frente a CDT renovados, con caída máxima y volatilidad.",
      },
    ],
    quiz: [
      {
        q: "Dos fondos rindieron 30 % en 3 años. El A tuvo caída máxima de −8 % y el B de −35 %. ¿Cuál fue mejor para el inversionista?",
        options: [
          "Son iguales",
          "El A: llegó al mismo resultado con mucho menos riesgo",
          "El B: más emoción",
          "No se puede saber",
        ],
        answer: 1,
        why: "Con la misma rentabilidad, el que tuvo menos caída exigió menos aguante. Muchos inversionistas venden en la caída y nunca ven la recuperación.",
      },
      {
        q: "Un ETF en dólares subió 10 % y el dólar bajó 10 % frente al peso. En pesos, tu resultado fue…",
        options: ["+20 %", "+10 %", "Cerca de 0 %", "−10 %"],
        answer: 2,
        why: "1,10 × 0,90 = 0,99: casi igual. El tipo de cambio puede borrar o duplicar lo que hace el activo.",
      },
      {
        q: "¿Para qué sirve mirar la correlación entre dos activos?",
        options: [
          "Para saber cuál rinde más",
          "Para saber si combinarlos reduce el riesgo",
          "Para calcular la retención",
          "Para elegir el banco",
        ],
        answer: 1,
        why: "Activos poco correlacionados no caen juntos, así que combinarlos suaviza el portafolio.",
      },
    ],
    mission: {
      title: "ICOLCAP, S&P 500 o CDT",
      text: "Compara ICOLCAP y SPY contra un CDT desde hace 3 años. ¿Cuál ganó en pesos? ¿Cuál tuvo la peor caída? ¿Cuál habrías aguantado?",
      href: "/analizar/etfs?s=ICOLCAP.CL&plazo=90",
      cta: "Hacer la comparación",
    },
    prompts: [
      "¿Qué es el ratio de Sharpe y cómo lo interpreto?",
      "¿Me conviene invertir en dólares viviendo en Colombia?",
      "¿Cuánto pesa una comisión de 1 % en 20 años?",
    ],
  },
  {
    slug: "portafolio",
    level: 5,
    title: "Diseñar un portafolio",
    summary: "Fondo de emergencia, perfil de riesgo, horizonte, diversificación y rebalanceo.",
    minutes: 10,
    blocks: [
      {
        t: "p",
        text: "Un portafolio es el conjunto de todo lo que tienes invertido. La pregunta no es cuál es la mejor inversión, sino qué combinación te lleva a tu objetivo con un riesgo que puedas aguantar.",
      },
      { t: "h", text: "Antes de invertir" },
      {
        t: "list",
        items: [
          "**Fondo de emergencia:** varios meses de gastos en algo líquido y seguro. Así no te toca vender inversiones en el peor momento.",
          "**Deudas caras primero:** pagar una tarjeta de crédito es una rentabilidad garantizada difícil de igualar.",
          "**Objetivo y plazo:** plata que vas a usar en un año no debería estar en acciones; plata para dentro de 15 años, quizá sí.",
        ],
      },
      { t: "h", text: "Perfil de riesgo y horizonte" },
      {
        t: "p",
        text: "Tu perfil depende de cuánto puedes perder sin que afecte tu vida y de cuánto aguantas emocionalmente. Con horizontes largos hay más tiempo para recuperarse de las caídas, así que se puede tener más renta variable. Con horizontes cortos, más renta fija.",
      },
      { t: "h", text: "Diversificar" },
      {
        t: "p",
        text: "Repartir entre activos que no se mueven igual. Lo que reduce el riesgo no es tener muchos activos, sino que estén poco correlacionados. Mueve los controles y mira cómo baja la volatilidad del portafolio cuando la correlación baja.",
      },
      { t: "widget", name: "diversification" },
      { t: "h", text: "Rebalancear" },
      {
        t: "p",
        text: "Si decides 60 % acciones y 40 % renta fija, con el tiempo las proporciones se mueven. Rebalancear es volver a la mezcla original: vender un poco de lo que subió y comprar de lo que bajó. Obliga a hacer lo contrario de lo que pide la emoción, y por eso funciona.",
      },
      {
        t: "callout",
        tone: "idea",
        text: "Escribe tu plan antes de invertir: qué porcentaje en cada cosa, cada cuánto rebalanceas, qué haces si todo cae 30 %. Cuando llegue el momento difícil, el plan decide por ti.",
      },
    ],
    quiz: [
      {
        q: "¿Qué reduce más el riesgo de un portafolio?",
        options: [
          "Tener 30 acciones del mismo sector",
          "Combinar activos que se mueven distinto entre sí",
          "Comprar solo lo que más subió",
          "Revisarlo todos los días",
        ],
        answer: 1,
        why: "Treinta acciones del mismo sector caen juntas. La diversificación funciona cuando los activos tienen baja correlación.",
      },
      {
        q: "Vas a usar la plata para la cuota inicial de un apartamento en 10 meses. ¿Qué tiene más sentido?",
        options: ["Acciones de tecnología", "Criptomonedas", "Un CDT o renta fija a ese plazo", "Un ETF de mercados emergentes"],
        answer: 2,
        why: "Con un plazo corto y un uso definido, no hay tiempo para recuperarse de una caída. La renta fija a ese plazo da certeza.",
      },
      {
        q: "Rebalancear consiste en…",
        options: [
          "Vender todo cuando cae",
          "Volver a la mezcla objetivo vendiendo lo que subió y comprando lo que bajó",
          "Comprar más de lo que más sube",
          "Cambiar de banco",
        ],
        answer: 1,
        why: "Mantiene el riesgo que elegiste y te obliga a vender caro y comprar barato.",
      },
    ],
    mission: {
      title: "Un 60/40 en 2022",
      text: "Empieza una partida en enero de 2022, cuando subieron las tasas. Arma 60 % en acciones y 40 % en CDT y rebalancea cada 3 meses. ¿Cómo le fue frente a tener todo en acciones?",
      href: "/simular?inicio=2022-01-03&duracion=2a&activos=SPY,ICOLCAP.CL,QQQ,TLT,GLD&nombre=60%2F40%20en%202022",
      cta: "Empezar la partida",
    },
    prompts: [
      "¿Cuánto debería tener en mi fondo de emergencia?",
      "¿Cómo sé cuál es mi perfil de riesgo?",
      "¿Cada cuánto debería rebalancear?",
    ],
  },
  {
    slug: "noticias",
    level: 6,
    title: "Noticias y sentimiento",
    summary: "Cómo afectan los eventos, por qué el precio se adelanta y cómo separar señal de ruido.",
    minutes: 7,
    blocks: [
      {
        t: "p",
        text: "Las noticias mueven los precios, pero no como uno cree. El precio de hoy ya incluye lo que el mercado espera. Por eso una empresa puede anunciar ganancias récord y caer: el mercado esperaba más.",
      },
      { t: "h", text: "El mercado mira hacia adelante" },
      {
        t: "p",
        text: "Lo que mueve el precio es la sorpresa: la diferencia entre lo que pasó y lo que se esperaba. Cuando una noticia llega a los titulares, muchas veces el movimiento grande ya ocurrió. Correr a comprar porque salió una buena noticia suele ser llegar tarde.",
      },
      { t: "h", text: "Las tasas de interés" },
      {
        t: "p",
        text: "Las decisiones del Banco de la República y de la Reserva Federal de EE. UU. afectan casi todo: cuando suben las tasas, los CDT pagan más, los bonos existentes pierden valor y las acciones suelen sufrir. Cuando bajan, pasa lo contrario. Es de las pocas noticias que vale la pena seguir siempre.",
      },
      { t: "h", text: "Ruido y sesgo de confirmación" },
      {
        t: "list",
        items: [
          "La mayoría de titulares del día no cambian el valor de largo plazo de una empresa.",
          "Tendemos a buscar noticias que confirman lo que ya pensamos. Busca a propósito la opinión contraria.",
          "Las redes sociales amplifican la euforia y el pánico. Que algo sea tendencia no lo hace buena inversión.",
        ],
      },
      {
        t: "callout",
        tone: "ojo",
        text: "El análisis de sentimiento del analizador resume titulares con un modelo de lenguaje. Úsalo como contexto, no como señal de compra o venta.",
      },
      {
        t: "tool",
        href: "/analizar/noticias",
        label: "Analizar noticias",
        text: "Busca una empresa, lee el resumen y compáralo con su gráfico: ¿el precio ya se movió?",
      },
    ],
    quiz: [
      {
        q: "Una empresa reporta ganancias 20 % mayores que el año anterior y su acción cae 5 %. ¿Qué es lo más probable?",
        options: [
          "El mercado se equivocó",
          "El mercado esperaba un resultado todavía mejor",
          "Las ganancias no importan",
          "Es un error de los datos",
        ],
        answer: 1,
        why: "El precio ya incluía expectativas altas. Lo que mueve el precio es la diferencia con lo esperado.",
      },
      {
        q: "Si el Banco de la República sube las tasas, normalmente…",
        options: [
          "Los CDT nuevos pagan más",
          "Los CDT nuevos pagan menos",
          "Nada cambia",
          "Suben todas las acciones",
        ],
        answer: 0,
        why: "Las tasas de los CDT siguen de cerca a la tasa del Banco de la República.",
      },
      {
        q: "¿Qué es el sesgo de confirmación?",
        options: [
          "Confirmar la orden antes de comprar",
          "Buscar y creer más la información que apoya lo que ya pensamos",
          "Un tipo de comisión",
          "Una regla del banco",
        ],
        answer: 1,
        why: "Nos hace ignorar señales en contra. Buscar activamente la opinión contraria ayuda a decidir mejor.",
      },
    ],
    mission: {
      title: "¿Ya estaba en el precio?",
      text: "Elige una empresa grande, analiza sus noticias recientes y luego mira su gráfico diario del último mes. ¿El precio se movió antes o después de los titulares?",
      href: "/analizar/noticias",
      cta: "Analizar noticias",
    },
    prompts: [
      "¿Por qué una buena noticia puede hacer caer una acción?",
      "¿Cómo afectan las tasas del Banco de la República a mis inversiones?",
      "¿Qué noticias vale la pena seguir?",
    ],
  },
  {
    slug: "psicologia",
    level: 7,
    title: "Tu peor enemigo eres tú",
    summary: "Los sesgos que más plata cuestan y cómo protegerte de ellos.",
    minutes: 8,
    blocks: [
      {
        t: "p",
        text: "La mayoría de los errores al invertir no son de análisis sino de comportamiento. Saber qué hacer es fácil; hacerlo cuando todo cae o cuando todos ganan menos tú es lo difícil.",
      },
      { t: "h", text: "Los errores más comunes" },
      {
        t: "list",
        items: [
          "**Vender pronto lo que gana y aguantar lo que pierde.** Asegurar ganancias se siente bien y aceptar pérdidas duele, así que hacemos justo lo contrario de lo que conviene.",
          "**Perseguir lo que ya subió.** Llegar tarde a la euforia y comprar caro.",
          "**Vender en pánico.** Convertir una caída temporal en una pérdida definitiva.",
          "**Operar demasiado.** Cada operación cuesta comisión y diferencial; mover mucho rara vez mejora el resultado.",
          "**Exceso de confianza.** Un par de aciertos se sienten como habilidad aunque hayan sido suerte.",
        ],
      },
      { t: "h", text: "Cómo protegerte" },
      {
        t: "list",
        items: [
          "Escribe tu plan antes: qué compras, por qué, y qué te haría vender.",
          "Decide el tamaño de cada posición para que una caída no te quite el sueño.",
          "Automatiza: aportes periódicos y rebalanceo en fechas fijas.",
          "Lleva un diario de decisiones y revísalo. El simulador lo hace por ti al final de cada partida.",
        ],
      },
      {
        t: "callout",
        tone: "idea",
        text: "En el simulador, el modo a ciegas oculta nombres y fechas. Sirve para descubrir cuánto de tus decisiones viene del gráfico y cuánto de lo que ya sabías que pasó.",
      },
    ],
    quiz: [
      {
        q: "Tienes una acción que sube 30 % y otra que cae 25 %. Necesitas plata. ¿Qué hace la mayoría, y por qué es un problema?",
        options: [
          "Vende la que cae, y está bien",
          "Vende la que sube para asegurar ganancia y se queda con la perdedora esperando que se recupere",
          "No vende ninguna",
          "Compra más de ambas",
        ],
        answer: 1,
        why: "Es el efecto disposición. La decisión debería depender de qué esperas de cada una hacia adelante, no de si ganas o pierdes contra tu precio de compra.",
      },
      {
        q: "¿Qué protege mejor contra vender en pánico?",
        options: [
          "Revisar el portafolio cada hora",
          "Un plan escrito y posiciones de un tamaño que puedas aguantar",
          "Seguir a influenciadores",
          "Invertir todo en una sola acción",
        ],
        answer: 1,
        why: "El plan decide por ti cuando la emoción es más fuerte, y el tamaño adecuado evita que una caída sea insoportable.",
      },
      {
        q: "Hiciste 40 operaciones en 6 meses y quedaste igual que el mercado. ¿Qué probablemente pasó?",
        options: [
          "Te fue muy bien",
          "Los costos se comieron parte del resultado",
          "No hubo costos",
          "El mercado se equivocó",
        ],
        answer: 1,
        why: "Cada operación paga comisión y, en dólares, diferencial. Operar mucho rara vez compensa esos costos.",
      },
    ],
    mission: {
      title: "La prueba de la pandemia",
      text: "Juega a ciegas desde febrero de 2020 por un año. Cuando llegue la caída, decide sin saber qué viene. Al final mira la sección Tus hábitos: ¿vendiste en pánico? ¿Aguantaste las pérdidas?",
      href: "/simular?inicio=2020-02-03&duracion=1a&ciegas=1&activos=SPY,ICOLCAP.CL,QQQ,TLT,GLD,EEM&nombre=Prueba%20de%20la%20pandemia",
      cta: "Empezar la partida",
    },
    prompts: [
      "¿Por qué me cuesta tanto vender una acción que está en pérdida?",
      "¿Cómo escribo un plan de inversión simple?",
      "¿Qué hago si el mercado cae 30 %?",
    ],
  },
];

export function getLesson(slug: string) {
  return LESSONS.find((l) => l.slug === slug) ?? null;
}

/** Texto plano de una lección, para dárselo al tutor como contexto. */
export function lessonText(lesson: Lesson): string {
  const parts: string[] = [`# ${lesson.title}`, lesson.summary];
  for (const b of lesson.blocks) {
    if (b.t === "p" || b.t === "callout") parts.push(b.text);
    else if (b.t === "h") parts.push(`## ${b.text}`);
    else if (b.t === "list") parts.push(b.items.map((i) => `- ${i}`).join("\n"));
    else if (b.t === "tool") parts.push(`(Herramienta: ${b.label}. ${b.text})`);
  }
  parts.push(`Misión: ${lesson.mission.title}. ${lesson.mission.text}`);
  return parts.join("\n\n").replaceAll("**", "");
}
