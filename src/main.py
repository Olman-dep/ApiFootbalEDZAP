import os
from contextlib import asynccontextmanager
from datetime import timedelta
from typing import Annotated

from fastapi import Depends, FastAPI, HTTPException, Query, Request
from motor.motor_asyncio import AsyncIOMotorClient

from dominio.entidades import EstadoPartido, Partido
from dominio.entidades.base import ahora
from dominio.repositorios import RepositorioPartidos
from infraestructura.database.memoria import RepositorioPartidosMemoria
from infraestructura.database.mongodb.repositorio_partidos import RepositorioPartidosMongo
from infraestructura.external.mock_data import MOCK_PARTIDOS


@asynccontextmanager
async def lifespan(app: FastAPI):
    uri = os.getenv("MONGODB_URI")
    cliente = None
    if uri:
        cliente = AsyncIOMotorClient(uri, tz_aware=True)
        repo = RepositorioPartidosMongo(cliente[os.getenv("DATABASE_NAME", "sports_predictions")])
        await repo.asegurar_indices()
    else:  # modo mock
        repo = RepositorioPartidosMemoria(MOCK_PARTIDOS)

    app.state.repo_partidos = repo
    yield
    if cliente:
        cliente.close()


app = FastAPI(title="Plataforma de Pronósticos Deportivos", lifespan=lifespan)


def get_repo_partidos(request: Request) -> RepositorioPartidos:
    return request.app.state.repo_partidos


RepoPartidos = Annotated[RepositorioPartidos, Depends(get_repo_partidos)]


@app.get("/api/v1/matches", response_model=list[Partido], response_model_by_alias=False)
async def listar_partidos(
    repo: RepoPartidos,
    estado: EstadoPartido | None = None,
    limite: int = Query(100, ge=1, le=500),
    saltar: int = Query(0, ge=0),
):
    return await repo.listar(estado=estado, limite=limite, saltar=saltar)


# Debe ir ANTES de /matches/{match_id}, o "today" se interpretaría como un id
@app.get("/api/v1/matches/today", response_model=list[Partido], response_model_by_alias=False)
async def partidos_de_hoy(repo: RepoPartidos):
    inicio = ahora().replace(hour=0, minute=0, second=0, microsecond=0)
    return await repo.listar(desde=inicio, hasta=inicio + timedelta(days=1))


@app.get("/api/v1/matches/{match_id}", response_model=Partido, response_model_by_alias=False)
async def obtener_partido(match_id: str, repo: RepoPartidos):
    partido = await repo.obtener_por_id(match_id)
    if partido is None:
        raise HTTPException(status_code=404, detail="Partido no encontrado")
    return partido