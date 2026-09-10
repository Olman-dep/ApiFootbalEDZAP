# ⚽ Plataforma de Pronósticos Deportivos con IA

## 1. Resumen Ejecutivo

Plataforma web de analítica deportiva orientada a generar **pronósticos predictivos para partidos de fútbol** mediante modelos estadísticos, Machine Learning e Inteligencia Artificial.

El sistema estará enfocado principalmente en mercados deportivos de mayor profundidad que el tradicional resultado **1X2**, incluyendo:

* Goles.
* Tiros totales.
* Tiros al arco.
* Tiros de esquina.
* Tarjetas.
* Props de jugadores.
* Comparación entre jugadores y defensas rivales.
* Valor esperado (`Expected Value / EV`) de las cuotas.

El objetivo es construir una plataforma **B2C monetizable**, capaz de transformar grandes cantidades de datos deportivos en información predictiva comprensible para el usuario.

> **Nota:** Los pronósticos son estimaciones probabilísticas y no garantizan ganancias. El sistema debe presentar sus resultados como análisis estadístico, no como certeza sobre el resultado de una apuesta.

---

# 2. Objetivos

## 2.1 Objetivo principal

Desarrollar una plataforma web capaz de recopilar datos deportivos, procesarlos mediante modelos estadísticos y Machine Learning, generar pronósticos y presentarlos mediante una interfaz web intuitiva.

## 2.2 Objetivos específicos

* Obtener datos históricos y actuales de partidos.
* Obtener estadísticas individuales de jugadores.
* Obtener información de equipos, alineaciones y eventos.
* Obtener cuotas deportivas.
* Construir modelos estadísticos utilizando Poisson.
* Construir modelos de Machine Learning.
* Realizar backtesting de los modelos.
* Calcular probabilidades estimadas.
* Comparar probabilidades contra cuotas disponibles.
* Identificar oportunidades con valor esperado positivo.
* Crear un dashboard web.
* Implementar autenticación de usuarios.
* Implementar planes gratuitos y premium.
* Preparar una arquitectura escalable.

---

# 3. Stack Tecnológico

## 3.1 Backend

| Tecnología      | Uso                      |
| --------------- | ------------------------ |
| Python 3.12+    | Lenguaje principal       |
| FastAPI         | Framework REST API       |
| Pydantic        | Validación de datos      |
| Motor / PyMongo | Comunicación con MongoDB |
| pandas          | Procesamiento de datos   |
| NumPy           | Cálculos numéricos       |
| scikit-learn    | Machine Learning         |
| XGBoost         | Modelos predictivos      |
| SciPy           | Modelos estadísticos     |
| JWT             | Autenticación            |
| bcrypt / Argon2 | Hash de contraseñas      |
| pytest          | Testing                  |

### Framework principal

**FastAPI**

Se utilizará FastAPI como framework principal del backend debido a:

* Alto rendimiento.
* Soporte nativo para APIs REST.
* Validación mediante Pydantic.
* Documentación automática mediante OpenAPI.
* Excelente integración con Python.
* Facilidad para integrar modelos de Machine Learning.

---

# 4. Frontend

## React + Gatsby

El frontend será desarrollado utilizando:

* React.
* Gatsby.
* TypeScript.
* Tailwind CSS.
* React Router cuando sea necesario.
* Axios o Fetch API.
* Recharts para gráficos.
* TanStack Query para manejo de datos remotos.

### Responsabilidades

El frontend será responsable de:

* Mostrar partidos.
* Mostrar probabilidades.
* Mostrar estadísticas.
* Mostrar gráficos.
* Mostrar información de jugadores.
* Mostrar comparación de cuotas.
* Gestionar autenticación.
* Mostrar planes premium.
* Gestionar preferencias del usuario.
* Mostrar historial de pronósticos.

---

# 5. Base de Datos

## MongoDB Atlas

MongoDB será la base de datos principal del sistema.

La elección de MongoDB se debe a que los datos deportivos pueden variar considerablemente entre:

* Partidos.
* Equipos.
* Jugadores.
* Competiciones.
* Eventos.
* Estadísticas.
* Cuotas.

MongoDB permitirá almacenar estos documentos con estructuras flexibles.

## Colecciones principales

```text
users
teams
players
competitions
matches
match_statistics
player_statistics
odds
predictions
models
backtests
subscriptions
notifications
```

---

# 6. Arquitectura

El sistema utilizará una arquitectura modular basada en principios de **Clean Architecture / Hexagonal Architecture**, permitiendo posteriormente separar componentes en microservicios.

```text
                    ┌──────────────────────┐
                    │      React/Gatsby    │
                    │       Frontend       │
                    └──────────┬───────────┘
                               │
                               │ HTTP/REST
                               ▼
                    ┌──────────────────────┐
                    │       FastAPI        │
                    │       Backend        │
                    └──────────┬───────────┘
                               │
              ┌────────────────┼────────────────┐
              │                │                │
              ▼                ▼                ▼
       ┌────────────┐   ┌─────────────┐  ┌──────────────┐
       │   Auth     │   │ Predictions │  │    Odds      │
       │   Module   │   │   Module    │  │    Module    │
       └────────────┘   └──────┬──────┘  └──────────────┘
                               │
                               ▼
                     ┌──────────────────┐
                     │   ML / AI Engine │
                     │     Python       │
                     └────────┬─────────┘
                              │
                              ▼
                     ┌──────────────────┐
                     │   MongoDB Atlas  │
                     └──────────────────┘

             External Data Providers
                       │
          ┌────────────┼─────────────┐
          ▼            ▼             ▼
    API-Football   Sportmonks   Odds API
```

---

# 7. Estructura del Backend

Se propone la siguiente estructura:

```text
backend/
│
├── app/
│   │
│   ├── main.py
│   │
│   ├── config/
│   │   ├── settings.py
│   │   └── database.py
│   │
│   ├── domain/
│   │   ├── entities/
│   │   │   ├── user.py
│   │   │   ├── match.py
│   │   │   ├── player.py
│   │   │   ├── team.py
│   │   │   └── prediction.py
│   │   │
│   │   └── repositories/
│   │       ├── user_repository.py
│   │       ├── match_repository.py
│   │       └── prediction_repository.py
│   │
│   ├── application/
│   │   ├── services/
│   │   │   ├── prediction_service.py
│   │   │   ├── match_service.py
│   │   │   ├── odds_service.py
│   │   │   └── user_service.py
│   │   │
│   │   └── use_cases/
│   │       ├── generate_prediction.py
│   │       ├── get_match_prediction.py
│   │       └── calculate_value.py
│   │
│   ├── infrastructure/
│   │   ├── database/
│   │   │   └── mongodb/
│   │   │       ├── user_repository.py
│   │   │       ├── match_repository.py
│   │   │       └── prediction_repository.py
│   │   │
│   │   ├── external/
│   │   │   ├── football_api.py
│   │   │   ├── odds_api.py
│   │   │   └── sportmonks_api.py
│   │   │
│   │   └── ml/
│   │       ├── poisson_model.py
│   │       ├── random_forest_model.py
│   │       ├── xgboost_model.py
│   │       ├── feature_engineering.py
│   │       └── prediction_engine.py
│   │
│   ├── presentation/
│   │   ├── routes/
│   │   │   ├── auth.py
│   │   │   ├── matches.py
│   │   │   ├── predictions.py
│   │   │   ├── players.py
│   │   │   └── odds.py
│   │   │
│   │   └── schemas/
│   │       ├── user_schema.py
│   │       ├── match_schema.py
│   │       └── prediction_schema.py
│   │
│   └── utils/
│       ├── security.py
│       ├── dates.py
│       └── calculations.py
│
├── tests/
│
├── models/
│   ├── trained/
│   └── datasets/
│
├── scripts/
│   ├── import_data.py
│   ├── train_models.py
│   └── run_backtest.py
│
├── requirements.txt
├── .env
├── .env.example
├── Dockerfile
└── README.md
```

---

# 8. Motor de Inteligencia Artificial

El motor predictivo será desarrollado completamente en Python.

## 8.1 Pipeline

```text
Datos externos
      │
      ▼
Recolección
      │
      ▼
Limpieza
      │
      ▼
Feature Engineering
      │
      ▼
Modelo estadístico
      │
      ▼
Modelo Machine Learning
      │
      ▼
Ensemble / combinación
      │
      ▼
Probabilidad
      │
      ▼
Expected Value
      │
      ▼
Predicción
```

---

# 9. Modelo de Poisson

La distribución de Poisson será utilizada como línea base para eventos discretos.

```math
P(X=k) = \frac{\lambda^k e^{-\lambda}}{k!}
```

Donde:

* `X` = número de eventos.
* `k` = cantidad específica de eventos.
* `λ` = cantidad esperada de eventos.
* `e` = constante de Euler.

Puede utilizarse inicialmente para:

* Goles.
* Córners.
* Algunos eventos estadísticos.

Ejemplo:

```text
Equipo A:

Córners esperados = 5.2

P(X = 5)
P(X = 6)
P(X = 7)
...
```

Posteriormente, el modelo será mejorado utilizando Machine Learning.

---

# 10. Machine Learning

Los modelos de Machine Learning tendrán como objetivo capturar relaciones que un modelo de Poisson básico no puede representar correctamente.

## Modelos iniciales

### Random Forest

Se utilizará como modelo de referencia para problemas de clasificación y regresión.

### XGBoost

Será uno de los modelos principales debido a su capacidad para trabajar con datos tabulares y relaciones no lineales.

---

# 11. Variables del modelo

El sistema podrá utilizar variables como:

## Equipos

* Goles por partido.
* xG.
* xGA.
* Tiros.
* Tiros al arco.
* Córners.
* Posesión.
* Ataques.
* Ataques peligrosos.
* Tarjetas.
* Rendimiento local.
* Rendimiento visitante.

## Jugadores

* Minutos jugados.
* Tiros por partido.
* Tiros al arco.
* Goles.
* Asistencias.
* Faltas recibidas.
* Faltas cometidas.
* Participaciones recientes.
* Titularidades.

## Contexto

* Días de descanso.
* Localía.
* Importancia del partido.
* Competición.
* Clima.
* Lesiones.
* Suspensiones.
* Cambios recientes en alineación.

---

# 12. Feature Engineering

Antes de entrenar los modelos se deberán generar características útiles.

Ejemplo:

```text
team_avg_shots_last_5
team_avg_corners_last_5
team_avg_xg_last_5
player_shots_last_5
player_shots_on_target_last_5
days_rest
home_advantage
opponent_defensive_strength
```

También se deberán evitar **data leakage**.

Por ejemplo:

> Para predecir un partido del 15 de septiembre no se pueden utilizar estadísticas generadas después del 15 de septiembre.

---

# 13. Player Props

El sistema permitirá generar predicciones individuales.

Ejemplos:

```text
Jugador:
Luis Díaz

Tiros esperados:
3.1

Tiros al arco esperados:
1.4

Probabilidad de:

Más de 2.5 tiros
67%

Más de 1.5 tiros al arco
58%
```

El modelo deberá tener en cuenta:

* Minutos esperados.
* Probabilidad de titularidad.
* Historial reciente.
* Rival.
* Posición.
* Estilo de juego.
* Volumen ofensivo.
* Contexto del partido.

---

# 14. Predicción de Córners

Variables potenciales:

```text
xG
Posesión
Ataques peligrosos
Tiros
Tiros bloqueados
Centros
Presión ofensiva
Córners históricos
Córners concedidos
Localía
```

El sistema podrá generar:

```text
Córners esperados:

Equipo A: 5.4
Equipo B: 4.1

Total esperado: 9.5
```

---

# 15. Predicción de Tarjetas

Variables potenciales:

```text
Faltas por partido
Tarjetas por partido
Árbitro
Rivalidad
Importancia del partido
Posición en la tabla
Historial disciplinario
Estilo de juego
```

Ejemplo:

```text
Tarjetas esperadas: 4.7

Over 3.5
Probabilidad: 71%

Over 4.5
Probabilidad: 54%
```

---

# 16. Sistema de Probabilidades

Cada predicción deberá almacenar:

```json
{
  "market": "player_shots",
  "selection": "over_2.5",
  "probability": 0.67,
  "model_version": "xgboost_v1",
  "confidence": 0.74
}
```

Es importante diferenciar:

### Probabilidad

Qué tan probable estima el modelo que ocurra un evento.

### Confianza

Qué tan confiable es la predicción según la calidad de los datos y el desempeño histórico del modelo.

No deben tratarse como el mismo concepto.

---

# 17. Expected Value

Para comparar la predicción con una cuota:

```text
Probabilidad implícita = 1 / cuota
```

Ejemplo:

```text
Probabilidad IA = 60%

Cuota = 2.00

Probabilidad implícita = 50%
```

Existe una diferencia entre ambas probabilidades.

El sistema puede calcular:

```text
EV = (Probabilidad × Cuota) - 1
```

Ejemplo:

```text
EV = (0.60 × 2.00) - 1

EV = 0.20

EV = +20%
```

El sistema podrá marcarlo como:

```text
Valor positivo
```

sin presentar esto como garantía de beneficio.

---

# 18. Backtesting

Antes de mostrar públicamente las predicciones, los modelos deberán someterse a backtesting.

El sistema deberá simular qué habría ocurrido utilizando únicamente la información disponible antes de cada partido.

## Métricas

### Machine Learning

* Accuracy.
* Precision.
* Recall.
* F1 Score.
* ROC-AUC.
* Log Loss.
* Brier Score.
* Calibration.

### Predicciones deportivas

* ROI.
* Yield.
* Hit Rate.
* Maximum Drawdown.
* Número de predicciones.
* EV promedio.
* Resultado acumulado.

---

# 19. Versionado de Modelos

Cada predicción deberá identificar el modelo utilizado.

```json
{
  "model": "xgboost",
  "version": "1.2.0",
  "trained_at": "2026-09-01",
  "features_version": "2.0"
}
```

Esto permitirá comparar modelos y detectar cuándo una nueva versión mejora o empeora el sistema.

---

# 20. API REST

## Autenticación

```http
POST /api/v1/auth/register
POST /api/v1/auth/login
POST /api/v1/auth/refresh
GET  /api/v1/auth/me
```

## Partidos

```http
GET /api/v1/matches
GET /api/v1/matches/{match_id}
GET /api/v1/matches/today
```

## Predicciones

```http
GET /api/v1/predictions
GET /api/v1/predictions/{match_id}
GET /api/v1/predictions/value
```

## Jugadores

```http
GET /api/v1/players
GET /api/v1/players/{player_id}
GET /api/v1/players/{player_id}/statistics
```

## Cuotas

```http
GET /api/v1/odds/{match_id}
GET /api/v1/odds/value
```

---

# 21. Ejemplo de respuesta API

```json
{
  "match": {
    "id": "12345",
    "home_team": "Liverpool",
    "away_team": "Arsenal"
  },
  "predictions": [
    {
      "market": "corners",
      "selection": "over_8.5",
      "probability": 0.68,
      "odds": 1.85,
      "implied_probability": 0.54,
      "expected_value": 0.258
    }
  ],
  "model": {
    "name": "xgboost",
    "version": "1.2.0"
  }
}
```

---

# 22. Dashboard

El dashboard principal tendrá:

```text
┌─────────────────────────────────────────────┐
│             PRONÓSTICOS DE HOY              │
├─────────────────────────────────────────────┤
│                                             │
│ Liverpool        vs        Arsenal          │
│                                             │
│ Victoria Liverpool     51%                  │
│ Empate                25%                   │
│ Victoria Arsenal      24%                   │
│                                             │
│ ─────────────────────────────────────────── │
│                                             │
│ Córners Over 8.5                            │
│ Probabilidad IA: 68%                        │
│ Cuota: 1.85                                 │
│ EV: +25.8%                                  │
│                                             │
└─────────────────────────────────────────────┘
```

---

# 23. Frontend

Estructura propuesta:

```text
frontend/
│
├── src/
│   ├── components/
│   ├── layouts/
│   ├── pages/
│   ├── features/
│   │   ├── matches/
│   │   ├── predictions/
│   │   ├── players/
│   │   ├── odds/
│   │   └── auth/
│   │
│   ├── services/
│   │   └── api.ts
│   │
│   ├── hooks/
│   ├── types/
│   ├── utils/
│   └── styles/
│
├── gatsby-config.ts
├── gatsby-node.ts
├── package.json
└── tsconfig.json
```

---

# 24. Usuarios y autenticación

Los usuarios podrán:

* Registrarse.
* Iniciar sesión.
* Recuperar contraseña.
* Consultar pronósticos.
* Guardar partidos.
* Consultar historial.
* Gestionar suscripción.

Roles:

```text
USER
PREMIUM
ADMIN
```

---

# 25. Modelo Freemium

## Free

Acceso limitado a:

* Partidos.
* Estadísticas básicas.
* Pronósticos básicos.
* Algunos mercados.

## Premium

Acceso a:

* Player Props.
* Córners.
* Tarjetas.
* Tiros al arco.
* Análisis avanzado.
* Historial.
* Alertas.
* Mercados con EV.
* Estadísticas avanzadas.

---

# 26. Notificaciones

En una fase posterior se podrá implementar:

```text
Telegram Bot
Discord Bot
Email
Push Notifications
```

Ejemplo:

```text
🔥 NUEVO VALOR DETECTADO

Partido:
Liverpool vs Arsenal

Mercado:
Over 8.5 córners

Probabilidad:
68%

Cuota:
1.85

EV:
+25.8%
```

---

# 27. Proveedores de Datos

Se evaluarán proveedores como:

* API-Football.
* Sportmonks.
* The Odds API.

La arquitectura deberá utilizar interfaces para evitar acoplar el sistema a un único proveedor.

Ejemplo:

```python
class FootballDataProvider:

    def get_matches(self):
        pass

    def get_match_statistics(self, match_id):
        pass

    def get_player_statistics(self, player_id):
        pass
```

Posteriormente:

```python
class ApiFootballProvider(FootballDataProvider):
    pass
```

Esto permitirá cambiar de proveedor sin modificar todo el sistema.

---

# 28. Jobs y procesamiento automático

El sistema necesitará tareas programadas para:

```text
Actualizar partidos
        ↓
Actualizar estadísticas
        ↓
Actualizar alineaciones
        ↓
Actualizar cuotas
        ↓
Generar features
        ↓
Ejecutar modelos
        ↓
Generar predicciones
        ↓
Guardar en MongoDB
```

Para estas tareas podrán utilizarse:

* Railway Cron Jobs.
* AWS Lambda.
* Workers.
* Celery en una etapa posterior.

---

# 29. Infraestructura

## MVP

```text
Frontend
    │
    ▼
Gatsby
    │
    ▼
Railway / Hosting
     
Backend
    │
    ▼
FastAPI
    │
    ▼
MongoDB Atlas

ML
    │
    ▼
Python
```

## Escalabilidad futura

```text
                ┌───────────────┐
                │   Frontend    │
                │ React/Gatsby  │
                └───────┬───────┘
                        │
                        ▼
                ┌───────────────┐
                │ API Gateway   │
                └───────┬───────┘
                        │
       ┌────────────────┼────────────────┐
       ▼                ▼                ▼
   Auth API       Prediction API     Odds API
       │                │                │
       └────────────────┼────────────────┘
                        ▼
                 MongoDB Atlas
                        │
                        ▼
                 ML Processing
                        │
                        ▼
                Data Providers
```

---

# 30. Variables de entorno

El proyecto deberá utilizar `.env`.

Ejemplo:

```env
MONGODB_URI=
DATABASE_NAME=

JWT_SECRET=

FOOTBALL_API_KEY=
ODDS_API_KEY=
SPORTMONKS_API_KEY=

TELEGRAM_BOT_TOKEN=

ENVIRONMENT=development
```

El archivo `.env` nunca deberá subirse al repositorio.

Se deberá proporcionar:

```text
.env.example
```

---

# 31. Seguridad

Se implementará:

* JWT.
* Hash seguro de contraseñas.
* Validación mediante Pydantic.
* Rate limiting.
* CORS configurado.
* Variables de entorno.
* Sanitización de entradas.
* Protección de endpoints privados.
* Control de roles.
* Logs.
* Manejo centralizado de excepciones.

---

# 32. Testing

El backend utilizará:

```text
pytest
pytest-asyncio
httpx
```

Se realizarán pruebas de:

### Unitarias

* Cálculos matemáticos.
* Poisson.
* EV.
* Feature engineering.
* Predicciones.

### Integración

* MongoDB.
* APIs externas.
* FastAPI.

### End-to-End

```text
Usuario
   ↓
Frontend
   ↓
FastAPI
   ↓
MongoDB
   ↓
Respuesta
```

---

# 33. Roadmap

## Fase 1 — Investigación y datos

**Semanas 1-2**

* Seleccionar proveedor.
* Crear MongoDB Atlas.
* Obtener histórico.
* Definir esquema de datos.
* Crear pipeline de ingestión.
* Limpiar datos.

---

## Fase 2 — Modelo estadístico

**Semanas 3-4**

* Implementar Poisson.
* Crear features.
* Crear dataset de entrenamiento.
* Implementar backtesting.
* Medir resultados.

---

## Fase 3 — Machine Learning

**Semanas 5-6**

* Random Forest.
* XGBoost.
* Comparación de modelos.
* Optimización.
* Calibration.
* Backtesting.
* Versionado de modelos.

---

## Fase 4 — Backend

**Semanas 7-8**

* Crear FastAPI.
* Crear arquitectura hexagonal.
* MongoDB.
* Autenticación.
* Endpoints.
* Integración con ML.
* Integración con proveedores.

---

## Fase 5 — Frontend

**Semanas 9-10**

* Gatsby.
* React.
* TypeScript.
* Dashboard.
* Partidos.
* Predicciones.
* Player Props.
* Cuotas.
* Gráficos.

---

## Fase 6 — Monetización

**Semana 11**

* Usuarios Premium.
* Suscripciones.
* Control de acceso.
* Historial.
* Notificaciones.

---

## Fase 7 — Producción

**Semana 12**

* Deploy.
* Configuración de dominio.
* HTTPS.
* Monitoring.
* Logs.
* Optimización.
* Pruebas de carga.
* Lanzamiento MVP.

---

# 34. MVP

La primera versión NO deberá intentar predecir todos los mercados.

El MVP se enfocará en:

### Mercados

1. Goles.
2. Córners.
3. Tiros de jugadores.

### Funcionalidades

```text
✓ Partidos del día
✓ Estadísticas
✓ Predicciones
✓ Probabilidades
✓ Cuotas
✓ Expected Value
✓ Historial
✓ Backtesting
✓ Dashboard
✓ Registro/Login
```

Posteriormente:

```text
→ Tarjetas
→ Props avanzados
→ Alertas
→ Premium
→ Telegram
→ Discord
→ API B2B
```

---

# 35. Principio fundamental del proyecto

La plataforma no deberá intentar simplemente:

> "adivinar quién va a ganar".

El objetivo será construir un sistema capaz de estimar **probabilidades calibradas** y compararlas con las probabilidades implícitas en las cuotas.

El flujo principal será:

```text
DATOS
  ↓
FEATURE ENGINEERING
  ↓
MODELO ESTADÍSTICO
  ↓
MACHINE LEARNING
  ↓
PROBABILIDAD
  ↓
CALIBRACIÓN
  ↓
COMPARACIÓN CON CUOTA
  ↓
EXPECTED VALUE
  ↓
PRONÓSTICO
```

La calidad del producto dependerá principalmente de:

1. Calidad de los datos.
2. Calidad de las features.
3. Evitar data leakage.
4. Correcto backtesting.
5. Calibración de probabilidades.
6. Control del overfitting.
7. Evaluación fuera de muestra.
8. Consistencia del pipeline de datos.
9. Latencia de actualización.
10. Transparencia sobre el rendimiento histórico.

---

# 36. Resultado esperado

Al finalizar el MVP se deberá disponer de una plataforma donde un usuario pueda ingresar y consultar:

```text
Partidos de hoy
       ↓
Seleccionar partido
       ↓
Ver estadísticas
       ↓
Ver predicciones
       ↓
Ver probabilidades
       ↓
Ver cuotas
       ↓
Comparar probabilidad vs cuota
       ↓
Consultar EV
       ↓
Analizar el mercado
```

El sistema deberá estar preparado para evolucionar posteriormente hacia una plataforma deportiva de analítica avanzada, incorporando nuevos modelos, competiciones, mercados, proveedores de datos y servicios B2B.

# Autenticación
POST /api/v1/auth/register
POST /api/v1/auth/login
POST /api/v1/auth/refresh
GET  /api/v1/auth/me

# Partidos
GET  /api/v1/matches
GET  /api/v1/matches/today
GET  /api/v1/matches/{match_id}
GET  /api/v1/matches/{match_id}/h2h

# Predicciones
GET  /api/v1/predictions
GET  /api/v1/predictions/{match_id}
GET  /api/v1/predictions/value
GET  /api/v1/predictions/history

# Jugadores
GET  /api/v1/players
GET  /api/v1/players/{player_id}
GET  /api/v1/players/{player_id}/statistics
GET  /api/v1/players/{player_id}/props

# Cuotas
GET  /api/v1/odds/{match_id}
GET  /api/v1/odds/value

# Usuarios
GET  /api/v1/users/preferences
PUT  /api/v1/users/preferences
GET  /api/v1/users/saved-matches
POST /api/v1/users/subscription
