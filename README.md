# ⚽ Backend — Plataforma de Pronósticos Deportivos con IA

Backend en **Django + Django Ninja + MongoDB** (motor Poisson / Monte Carlo) para una plataforma de analítica y pronósticos deportivos.

> ⚠️ Los pronósticos son estimaciones probabilísticas, no garantías de resultado.

---

## 1. Resumen

Este backend expone una API REST para:

- Consultar partidos, equipos y jugadores.
- Generar pronósticos probabilísticos (goles, córners, tiros, tarjetas, player props) usando un motor **Poisson + Monte Carlo**.
- Comparar las probabilidades del modelo contra cuotas de mercado y calcular **Expected Value (EV)**.
- Gestionar usuarios, autenticación (JWT) y planes Free/Premium.

---

## 2. Stack

| Tecnología | Uso |
|---|---|
| Python 3.12+ | Lenguaje principal |
| **Django** | Framework base (ORM de usuarios, migraciones, admin) |
| **Django Ninja** | Capa de API REST — async nativo, schemas Pydantic, Swagger automático |
| Pydantic / pydantic-settings | Validación de schemas y configuración |
| Motor / PyMongo | Cliente MongoDB async |
| NumPy / SciPy | Cálculo numérico y distribución de Poisson |
| pandas | Procesamiento de datos |
| scikit-learn / XGBoost | Modelos ML (fase posterior al MVP) |
| python-jose / passlib (bcrypt) | JWT y hash de contraseñas |
| pytest / pytest-asyncio / httpx | Testing |
| uvicorn | Servidor ASGI (necesario para que el async funcione) |

**¿Por qué Django Ninja y no Django REST Framework?** DRF tiene soporte async limitado y no combina bien con Motor (Mongo async). Ninja soporta `async def` de forma nativa, usa Pydantic para los schemas (igual que las entidades de este proyecto) y genera Swagger sin configuración extra — encaja directo con un stack basado en Mongo async.

**Modo mock**: si `MONGODB_URI` no está configurada, el backend arranca con datos de ejemplo en memoria (equipos, jugadores, partidos, cuotas), para poder correr el MVP sin credenciales reales.

---

## 3. Estructura de carpetas

```
backend/
├── config/
│   ├── settings.py                # settings de Django + configuración propia (pydantic-settings)
│   ├── urls.py                    # conecta la API de Ninja al proyecto Django
│   └── asgi.py                    # punto de entrada ASGI (requerido para async)
├── app/
│   ├── api.py                     # instancia de NinjaAPI, routers, manejo de errores
│   ├── config/
│   │   └── database.py            # conexión perezosa a Mongo (Motor) / fallback a modo mock
│   ├── domain/
│   │   ├── entities/               # User, Team, Player, Match, Prediction (Pydantic)
│   │   └── repositories/           # interfaces (contratos) de repositorios
│   ├── application/
│   │   ├── services/                # auth_service, match_service, prediction_service, odds_service
│   │   └── use_cases/                # generate_prediction, get_match_prediction, calculate_value
│   ├── infrastructure/
│   │   ├── database/mongodb/        # implementación real de repositorios (Motor)
│   │   ├── external/                # mock_data.py + adaptadores (API-Football, Odds API, Sportmonks)
│   │   └── ml/
│   │       ├── poisson_model.py     # distribución de Poisson: lambda, P(exact), over/under, 1X2
│   │       ├── monte_carlo.py       # simulación Monte Carlo de goles/córners/tiros/tarjetas
│   │       └── prediction_engine.py # orquesta Poisson + Monte Carlo + EV
│   ├── presentation/
│   │   ├── routes/                  # routers de Ninja: auth, matches, predictions, players, odds
│   │   └── schemas/                  # schemas Pydantic de request/response
│   └── utils/
│       ├── security.py              # JWT + hashing
│       ├── dates.py
│       └── calculations.py
├── tests/
├── models/{trained,datasets}
├── scripts/
│   ├── seed_data.py                 # carga datos de ejemplo en Mongo
│   ├── import_data.py
│   └── train_models.py
├── manage.py
├── requirements.txt
├── .env.example
├── Dockerfile
└── README.md
```

---

## 4. Motor de predicción (Poisson + Monte Carlo)

### 4.1 Paso 1 — Estimación de lambda (Poisson)

```
lambda = promedio( ataque_propio , debilidad_defensiva_rival ) * factor_localia
```

Se usa como línea base analítica para goles, córners y tarjetas, y para un cálculo rápido de 1X2 mediante una matriz de Poisson bivariada.

### 4.2 Paso 2 — Simulación Monte Carlo

En vez de asumir independencia perfecta entre eventos (goles, tiros, córners, tarjetas), el motor:

1. Toma los lambdas estimados por Poisson para cada equipo/mercado.
2. Simula N partidos virtuales (por defecto `MONTE_CARLO_SIMULATIONS=20000`) muestreando de distribuciones de Poisson correlacionadas (ej. más posesión y ataques peligrosos → más tiros y más córners).
3. Cuenta la frecuencia de cada resultado (victoria/empate/derrota, over/under de goles, córners, tarjetas, tiros de jugador) sobre el total de simulaciones.
4. Esa frecuencia relativa es la probabilidad estimada del evento.

```
Datos (lambdas por mercado)
        ↓
Generar N simulaciones de partido
        ↓
Contar frecuencia de cada resultado
        ↓
Probabilidad = frecuencia / N simulaciones
```

Esto permite capturar mercados combinados (ej. "Liverpool gana Y over 2.5 goles") que el modelo analítico puro no resuelve fácilmente.

### 4.3 Paso 3 — Expected Value (EV)

```
Probabilidad implícita = 1 / cuota
EV = (Probabilidad_modelo × Cuota) - 1
```

Si `EV > 0` se marca como valor positivo, sin presentarlo como garantía de ganancia.

### 4.4 Salida del motor

```json
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
```

---

## 5. Endpoints (MVP)

```
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
GET  /api/v1/predictions/{match_id}      # corre/recupera Poisson + Monte Carlo + EV
GET  /api/v1/predictions/value           # solo mercados con EV positivo
GET  /api/v1/predictions/history

# Jugadores
GET  /api/v1/players/{player_id}
GET  /api/v1/players/{player_id}/props   # tiros / tiros al arco esperados

# Cuotas
GET  /api/v1/odds/{match_id}

# Sistema
GET  /api/v1/health                      # estado del servicio y de la conexión a Mongo
```

---

## 6. Mercados incluidos en el MVP

- Resultado 1X2.
- Total de goles (over/under).
- Córners totales (over/under).
- Tiros / tiros al arco de jugadores (props).

Tarjetas, props avanzados, alertas y notificaciones quedan para fases posteriores.

---

## 7. Variables de entorno

```env
MONGODB_URI=
DATABASE_NAME=sports_predictions

JWT_SECRET=
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60
REFRESH_TOKEN_EXPIRE_DAYS=7

FOOTBALL_API_KEY=
ODDS_API_KEY=
SPORTMONKS_API_KEY=

MONTE_CARLO_SIMULATIONS=20000
RANDOM_SEED=42

ENVIRONMENT=development
CORS_ORIGINS=*
```

Si `MONGODB_URI` queda vacío, el backend usa datos de ejemplo en memoria (modo mock) para poder ejecutarse sin infraestructura externa.

---

## 8. Cómo correr el backend

```bash
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env

# Migraciones de Django (usuarios, sesiones, admin — no de Mongo)
python manage.py migrate

# Servidor ASGI (uvicorn, NO manage.py runserver, porque necesitamos async)
uvicorn config.asgi:application --reload
```

La documentación interactiva (Swagger, generada por Django Ninja) queda disponible en:

```
http://localhost:8000/api/v1/docs
```

---

## 9. Notas de arquitectura

- **Django** se encarga de lo que hace bien de fábrica: usuarios, autenticación, admin, migraciones — todo respaldado por una base relacional (Postgres/SQLite) vía su ORM habitual.
- **Mongo (vía Motor)** se usa específicamente para los datos de dominio deportivo (partidos, equipos, jugadores, pronósticos, cuotas), donde el esquema flexible de documentos encaja mejor que filas rígidas.
- El cliente de Motor se crea de forma **perezosa** (no en el arranque de Django), para evitar el error `Future attached to a different loop` que ocurre si Motor se inicializa fuera del event loop activo bajo ASGI.
- El servidor **debe** correr sobre ASGI (`uvicorn`, `daphne` o similar). Con WSGI (`manage.py runserver` tradicional) las vistas `async def` no se ejecutan de forma asíncrona real.
