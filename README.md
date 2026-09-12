# ⚽ Backend — Plataforma de Pronósticos Deportivos con IA

Documentación técnica del backend (DJANGO + MongoDB + motor Poisson/Monte Carlo) para la plataforma de analítica y pronósticos deportivos.

---

## 1. Resumen

Backend en **Python 3.12 / DJANGO** que expone una API REST para:

- Consultar partidos, equipos y jugadores.
- Generar pronósticos probabilísticos (goles, córners, tiros, tarjetas, player props) usando un motor **Poisson + Monte Carlo**.
- Comparar las probabilidades del modelo contra cuotas de mercado y calcular **Expected Value (EV)**.
- Gestionar usuarios, autenticación (JWT) y planes Free/Premium.

> Los pronósticos son estimaciones probabilísticas, no garantías de resultado.

---

## 2. Stack

| Tecnología | Uso |
|---|---|
| Python 3.12+ | Lenguaje principal |
| Django | Framework REST API |
| Pydantic / pydantic-settings | Validación y configuración |
| Motor / PyMongo | Cliente MongoDB async |
| NumPy / SciPy | Cálculo numérico y distribución de Poisson |
| pandas | Procesamiento de datos |
| scikit-learn / XGBoost | Modelos ML (fase posterior al MVP) |
| python-jose / passlib(bcrypt) | JWT y hash de contraseñas |
| pytest / pytest-asyncio / httpx | Testing |

**Modo mock**: si `MONGODB_URI` no está configurada, el backend arranca con datos de ejemplo en memoria (equipos, jugadores, partidos, cuotas), para poder correr el MVP sin credenciales reales.

---

## 3. Estructura de carpetas

```text
backend/
├── app/
│   ├── main.py                     # instancia DJANGO, routers, CORS, startup/shutdown
│   ├── config/
│   │   ├── settings.py             # variables de entorno (pydantic-settings)
│   │   └── database.py             # conexión Mongo / fallback a modo mock
│   ├── domain/
│   │   ├── entities/                # User, Team, Player, Match, Prediction (Pydantic)
│   │   └── repositories/            # interfaces (contratos) de repositorios
│   ├── application/
│   │   ├── services/                 # auth_service, match_service, prediction_service, odds_service
│   │   └── use_cases/                 # generate_prediction, get_match_prediction, calculate_value
│   ├── infrastructure/
│   │   ├── database/mongodb/         # implementación real de repositorios (Motor)
│   │   ├── external/                 # mock_data.py + adaptadores a proveedores (API-Football, Odds API, Sportmonks)
│   │   └── ml/
│   │       ├── poisson_model.py      # distribución de Poisson: lambda, P(exact), over/under, 1X2
│   │       ├── monte_carlo.py        # simulación Monte Carlo de goles/córners/tiros/tarjetas
│   │       └── prediction_engine.py  # orquesta Poisson + Monte Carlo + EV
│   ├── presentation/
│   │   ├── routes/                   # auth, matches, predictions, players, odds
│   │   └── schemas/                  # DTOs de request/response
│   └── utils/
│       ├── security.py               # JWT + hashing
│       ├── dates.py
│       └── calculations.py
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
```

---

## 4. Motor de predicción (Poisson + Monte Carlo)

### 4.1 Paso 1 — Estimación de lambda (Poisson)

```text
lambda = promedio( ataque_propio , debilidad_defensiva_rival ) * factor_localia
```

Se usa como línea base analítica para goles, córners y tarjetas, y para un cálculo rápido de 1X2 mediante una matriz de Poisson bivariada.

### 4.2 Paso 2 — Simulación Monte Carlo

En vez de asumir independencia perfecta entre eventos (goles, tiros, córners, tarjetas), el motor:

1. Toma los lambdas estimados por Poisson para cada equipo/mercado.
2. Simula **N partidos virtuales** (por defecto `MONTE_CARLO_SIMULATIONS=20000`) muestreando de distribuciones de Poisson correlacionadas (ej. más posesión y ataques peligrosos → más tiros y más córners).
3. Cuenta la frecuencia de cada resultado (victoria/empate/derrota, over/under de goles, córners, tarjetas, tiros de jugador) sobre el total de simulaciones.
4. Esa frecuencia relativa **es** la probabilidad estimada del evento.

```text
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

```text
Probabilidad implícita = 1 / cuota
EV = (Probabilidad_modelo × Cuota) - 1
```

Si `EV > 0` se marca como **valor positivo**, sin presentarlo como garantía de ganancia.

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

```http
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
```

---

## 6. Mercados incluidos en el MVP

1. Resultado 1X2.
2. Total de goles (over/under).
3. Córners totales (over/under).
4. Tiros / tiros al arco de jugadores (props).

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

## 8. Cómo correr el backend (cuando el código esté generado)

```bash
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload
```

La documentación interactiva (Swagger) queda disponible en `http://localhost:8000/docs`.
