⚽ Backend — Plataforma de Pronósticos Deportivos con IA Backend en FastAPI + MongoDB (motor Poisson / Monte Carlo) para una plataforma de analítica y pronósticos deportivos, con ingesta de datos vía scraping y/o API de fútbol.

⚠️ Los pronósticos son estimaciones probabilísticas, no garantías de resultado.

1. Resumen
Este backend expone una API REST para:

Consultar partidos, equipos y jugadores.
Generar pronósticos probabilísticos (goles, córners, tiros, tarjetas, player props) usando un motor Poisson + Monte Carlo.
Comparar las probabilidades del modelo contra cuotas de mercado y calcular Expected Value (EV).
Gestionar usuarios, autenticación (JWT) y planes Free/Premium.
Alimentarse de datos deportivos obtenidos por scraping propio y/o por APIs de terceros (API-Football, Odds API, Sportmonks), seleccionables por configuración.
2. Stack
Tecnología	Uso
Python 3.12+	Lenguaje principal
FastAPI	Framework principal — async nativo, Pydantic v2, Swagger/OpenAPI automático
Uvicorn	Servidor ASGI
Pydantic v2 / pydantic-settings	Validación de schemas y configuración
Motor / PyMongo	Cliente MongoDB async
(opcional) Beanie	ODM async sobre Motor + Pydantic, si se prefiere no escribir repositorios a mano
NumPy / SciPy	Cálculo numérico y distribución de Poisson
pandas	Procesamiento de datos
scikit-learn / XGBoost	Modelos ML (fase posterior al MVP)
python-jose / passlib[bcrypt]	JWT y hash de contraseñas
httpx	Cliente HTTP async — consumo de APIs y scraping
selectolax / BeautifulSoup4	Parseo de HTML para scraping
playwright (opcional)	Scraping de sitios con renderizado JS (SPA)
APScheduler (o Celery + Redis)	Jobs periódicos de ingesta de datos (scraping/API)
pytest / pytest-asyncio / httpx	Testing
¿Por qué FastAPI y no Django + Django Ninja?
Todo el dominio del proyecto vive en MongoDB (partidos, equipos, cuotas, pronósticos) y no hay necesidad real del ORM relacional, el admin ni las migraciones de Django — solo se usaban para el modelo de usuarios. FastAPI da lo mismo que se buscaba con Ninja (async nativo, schemas Pydantic, Swagger automático) sin cargar con una segunda base de datos relacional ni con un framework completo por encima. Los usuarios y la autenticación se resuelven directamente contra Mongo, igual que el resto del dominio, lo que simplifica infraestructura y despliegue.

Si en algún momento se necesita algo estrictamente relacional (facturación, suscripciones con integridad transaccional fuerte), se puede sumar SQLAlchemy async + Postgres solo para ese módulo, sin tocar el resto.

Modo mock: si MONGODB_URI no está configurada, el backend arranca con datos de ejemplo en memoria (equipos, jugadores, partidos, cuotas), para poder correr el MVP sin credenciales reales.

3. Estructura de carpetas
backend/
├── app/
│   ├── main.py                       # instancia FastAPI, routers, middlewares, lifespan
│   ├── core/
│   │   ├── config.py                 # settings (pydantic-settings)
│   │   ├── security.py               # JWT + hashing
│   │   └── database.py               # conexión Motor, gestionada en el lifespan
│   ├── domain/
│   │   ├── entities/                 # User, Team, Player, Match, Prediction (Pydantic)
│   │   └── repositories/             # interfaces (contratos) de repositorios
│   ├── application/
│   │   ├── services/                 # auth_service, match_service, prediction_service, odds_service
│   │   └── use_cases/                # generate_prediction, get_match_prediction, calculate_value
│   ├── infrastructure/
│   │   ├── database/mongodb/         # implementación real de repositorios (Motor)
│   │   ├── external/
│   │   │   ├── providers/            # ApiFootballProvider, OddsApiProvider, SportmonksProvider
│   │   │   ├── scraping/             # scrapers por fuente (httpx + selectolax / playwright)
│   │   │   ├── data_source_factory.py# elige provider según DATA_SOURCE (api | scraping | mock)
│   │   │   └── mock_data.py
│   │   └── ml/
│   │       ├── poisson_model.py      # distribución de Poisson: lambda, P(exact), over/under, 1X2
│   │       ├── monte_carlo.py        # simulación Monte Carlo de goles/córners/tiros/tarjetas
│   │       └── prediction_engine.py  # orquesta Poisson + Monte Carlo + EV
│   ├── presentation/
│   │   ├── routes/                   # APIRouter por dominio: auth, matches, predictions, players, odds
│   │   ├── schemas/                  # schemas Pydantic de request/response
│   │   └── dependencies.py           # Depends(): auth actual, conexión a db, etc.
│   └── jobs/
│       └── scheduler.py              # APScheduler: refresca datos periódicamente (ingesta desacoplada)
├── tests/
├── models/{trained,datasets}
├── scripts/
│   ├── seed_data.py                  # carga datos de ejemplo en Mongo
│   ├── import_data.py
│   └── train_models.py
├── requirements.txt
├── .env.example
├── Dockerfile
└── README.md
4. Fuentes de datos: scraping y/o API de fútbol
El dato deportivo (partidos, alineaciones, estadísticas, cuotas) puede venir de dos orígenes intercambiables, definidos por un patrón Provider (Strategy):

# app/infrastructure/external/providers/base.py
from typing import Protocol

class MatchDataProvider(Protocol):
    async def get_today_matches(self) -> list[dict]: ...
    async def get_match_stats(self, match_id: str) -> dict: ...
    async def get_odds(self, match_id: str) -> dict: ...
Implementaciones posibles:

ApiFootballProvider / OddsApiProvider / SportmonksProvider — consumen la API oficial correspondiente vía httpx. Es la opción más estable y con menos mantenimiento; recomendada como fuente principal, sobre todo para cuotas de mercado (dato sensible a cambios de estructura de la página si se scrapea).
ScrapingProvider — obtiene datos de sitios públicos con httpx + selectolax/BeautifulSoup4 para HTML estático, o playwright si el sitio renderiza con JS. Útil para complementar datos que la API no cubre (ej. estadísticas avanzadas, lesiones) o como fuente principal si no hay presupuesto para una API paga.
MockProvider — datos de ejemplo en memoria, igual que antes, para desarrollo sin credenciales.
La fuente activa se elige por configuración, sin tocar el resto del código:

DATA_SOURCE=api_football   # api_football | scraping | mock
# app/infrastructure/external/data_source_factory.py
def get_provider(settings) -> MatchDataProvider:
    if settings.DATA_SOURCE == "api_football":
        return ApiFootballProvider(api_key=settings.FOOTBALL_API_KEY)
    if settings.DATA_SOURCE == "scraping":
        return ScrapingProvider()
    return MockProvider()
Ingesta desacoplada del request (importante)
Scrapear o llamar a una API externa dentro del request del usuario es frágil y lento (si la fuente cae o tarda, tu API cae o tarda con ella). El patrón correcto:

Un job periódico (app/jobs/scheduler.py, con APScheduler o Celery + Redis si se necesita escalar a varios workers) corre el provider activo cada N minutos, normaliza los datos al esquema propio (Match, Team, Odds, etc.) y los persiste en Mongo.
Los endpoints de la API siempre leen de Mongo (nunca scrapean ni llaman a la API externa en tiempo real dentro de un request). Esto da velocidad constante y aísla al usuario de fallos de la fuente.
Si un endpoint necesita un dato que aún no fue ingerido, se dispara la ingesta puntual de ese partido en background (BackgroundTasks de FastAPI), respondiendo igual con lo último disponible en caché mientras se actualiza.
Notas prácticas sobre scraping:

Revisar los Términos de Servicio del sitio antes de scrapearlo; si el uso es comercial (vender pronósticos), preferir una API oficial de pago para cuotas de mercado en lugar de depender de scraping.
Respetar robots.txt, aplicar rate-limiting y cachear agresivamente para minimizar la carga sobre el sitio origen.
Identificar tu scraper con un User-Agent propio y logs de lo que se consulta, para poder auditar y ajustar si el sitio cambia de estructura.
5. Motor de predicción (Poisson + Monte Carlo)
5.1 Paso 1 — Estimación de lambda (Poisson)
lambda = promedio( ataque_propio , debilidad_defensiva_rival ) * factor_localia
Se usa como línea base analítica para goles, córners y tarjetas, y para un cálculo rápido de 1X2 mediante una matriz de Poisson bivariada.

5.2 Paso 2 — Simulación Monte Carlo
En vez de asumir independencia perfecta entre eventos (goles, tiros, córners, tarjetas), el motor:

Toma los lambdas estimados por Poisson para cada equipo/mercado.
Simula N partidos virtuales (por defecto MONTE_CARLO_SIMULATIONS=20000) muestreando de distribuciones de Poisson correlacionadas (ej. más posesión y ataques peligrosos → más tiros y más córners).
Cuenta la frecuencia de cada resultado (victoria/empate/derrota, over/under de goles, córners, tarjetas, tiros de jugador) sobre el total de simulaciones.
Esa frecuencia relativa es la probabilidad estimada del evento.
Datos (lambdas por mercado)
        ↓
Generar N simulaciones de partido
        ↓
Contar frecuencia de cada resultado
        ↓
Probabilidad = frecuencia / N simulaciones
Esto permite capturar mercados combinados (ej. "Liverpool gana Y over 2.5 goles") que el modelo analítico puro no resuelve fácilmente.

5.3 Paso 3 — Expected Value (EV)
Probabilidad implícita = 1 / cuota
EV = (Probabilidad_modelo × Cuota) - 1
Si EV > 0 se marca como valor positivo, sin presentarlo como garantía de ganancia.

5.4 Salida del motor
{
  "match_id": "12345",
  "simulations_run": 20000,
  "lambdas": {
    "home_goals": 1.8,
    "away_goals": 1.1,
    "home_corners": 5.4,
    "away_corners": 4.1
  },
  "markets": [
    {
      "market": "corners",
      "selection": "over_8.5",
      "probability": 0.68,
      "confidence": 0.74,
      "odds": 1.85,
      "implied_probability": 0.54,
      "expected_value": 0.258,
      "is_value_bet": true
    }
  ],
  "model": { "name": "poisson_monte_carlo", "version": "1.0.0" }
}
6. Endpoints (MVP)
# Autenticación
POST /api/v1/auth/register
POST /api/v1/auth/login
POST /api/v1/auth/refresh
GET  /api/v1/auth/me

# Partidos
GET  /api/v1/matches
GET  /api/v1/matches/today
GET  /api/v1/matches/{match_id}

# Predicciones
GET  /api/v1/predictions/{match_id}      # recupera Poisson + Monte Carlo + EV (desde Mongo)
GET  /api/v1/predictions/value           # solo mercados con EV positivo
GET  /api/v1/predictions/history

# Jugadores
GET  /api/v1/players/{player_id}
GET  /api/v1/players/{player_id}/props   # tiros / tiros al arco esperados

# Cuotas
GET  /api/v1/odds/{match_id}

# Ingesta (uso interno/admin)
POST /api/v1/admin/ingest/{match_id}     # dispara refresco puntual (BackgroundTasks)

# Sistema
GET  /api/v1/health                      # estado del servicio, conexión a Mongo y último ingest exitoso
7. Mercados incluidos en el MVP
Resultado 1X2.
Total de goles (over/under).
Córners totales (over/under).
Tiros / tiros al arco de jugadores (props).
Tarjetas, props avanzados, alertas y notificaciones quedan para fases posteriores.

8. Variables de entorno
MONGODB_URI=
DATABASE_NAME=sports_predictions

JWT_SECRET=
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60
REFRESH_TOKEN_EXPIRE_DAYS=7

DATA_SOURCE=mock                # mock | api_football | scraping
FOOTBALL_API_KEY=
ODDS_API_KEY=
SPORTMONKS_API_KEY=
SCRAPING_USER_AGENT=sports-predictions-bot/1.0
INGEST_INTERVAL_MINUTES=15

MONTE_CARLO_SIMULATIONS=20000
RANDOM_SEED=42

ENVIRONMENT=development
CORS_ORIGINS=*
Si MONGODB_URI queda vacío, el backend usa datos de ejemplo en memoria (modo mock) para poder ejecutarse sin infraestructura externa.

9. Cómo correr el backend
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env

uvicorn app.main:app --reload
La documentación interactiva (Swagger, generada automáticamente por FastAPI) queda disponible en:

http://localhost:8000/docs
y el esquema OpenAPI crudo en http://localhost:8000/openapi.json.

10. Notas de arquitectura
Todo el dominio (usuarios, partidos, equipos, jugadores, pronósticos, cuotas) vive en MongoDB vía Motor; no hay una segunda base de datos relacional salvo que se agregue explícitamente para un módulo que la necesite (ej. facturación).
El cliente de Motor se crea en el lifespan de FastAPI (no como variable global al importar el módulo), para evitar problemas de event loop al correr bajo ASGI y para poder cerrarlo limpiamente al apagar el servidor.
La ingesta de datos (scraping y/o API de fútbol) está desacoplada del ciclo request/response: corre en jobs periódicos y deja los datos listos en Mongo; los endpoints solo leen. Esto hace que la API responda rápido y no dependa de la disponibilidad de la fuente externa en cada request.
El motor de predicción (Poisson + Monte Carlo) es indiferente al origen del dato: solo necesita los lambdas normalizados, así que cambiar de proveedor de datos (o combinar varios) no afecta al prediction_engine.py.
El servidor corre sobre Uvicorn (u otro servidor ASGI); no requiere manage.py ni ningún comando de migración, ya que no hay ORM relacional en el MVP.
