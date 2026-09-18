"""Implementación en memoria para el modo mock (MONGODB_URI vacío)."""
from datetime import datetime
from uuid import uuid4

from dominio.entidades import EstadoPartido, Partido
from dominio.entidades.base import a_utc
from dominio.repositorios import RepositorioPartidos


class RepositorioPartidosMemoria(RepositorioPartidos):
    def __init__(self, partidos: list[Partido] | None = None):
        self._partidos: dict[str, Partido] = {p.id: p.model_copy(deep=True) for p in (partidos or []) if p.id}

    async def obtener_por_id(self, partido_id: str) -> Partido | None:
        p = self._partidos.get(partido_id)
        return p.model_copy(deep=True) if p else None

    async def obtener_por_api_id(self, api_id: int) -> Partido | None:
        for p in self._partidos.values():
            if p.api_id == api_id:
                return p.model_copy(deep=True)
        return None

    async def listar(
        self,
        *,
        estado: EstadoPartido | None = None,
        liga_id: str | None = None,
        desde: datetime | None = None,
        hasta: datetime | None = None,
        limite: int = 100,
        saltar: int = 0,
    ) -> list[Partido]:
        res = list(self._partidos.values())
        if estado:
            res = [p for p in res if p.estado == estado]
        if liga_id:
            res = [p for p in res if p.liga_id == liga_id]
        if desde:
            res = [p for p in res if a_utc(p.fecha) >= a_utc(desde)]
        if hasta:
            res = [p for p in res if a_utc(p.fecha) <= a_utc(hasta)]
        res.sort(key=lambda p: a_utc(p.fecha))
        return [p.model_copy(deep=True) for p in res[saltar : saltar + limite]]

    async def guardar(self, partido: Partido) -> Partido:
        existente = await self.obtener_por_api_id(partido.api_id) if partido.api_id is not None else None
        nuevo_id = partido.id or (existente.id if existente else uuid4().hex)
        guardado = partido.model_copy(update={"id": nuevo_id}, deep=True)
        self._partidos[nuevo_id] = guardado
        return guardado.model_copy(deep=True)