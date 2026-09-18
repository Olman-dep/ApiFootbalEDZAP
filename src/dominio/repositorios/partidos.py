from abc import ABC, abstractmethod
from datetime import datetime

from ..entidades import EstadoPartido, Partido


class RepositorioPartidos(ABC):
    @abstractmethod
    async def obtener_por_id(self, partido_id: str) -> Partido | None: ...

    @abstractmethod
    async def obtener_por_api_id(self, api_id: int) -> Partido | None: ...

    @abstractmethod
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
        """Partidos ordenados por fecha ascendente. `/matches/today` = desde 00:00 hasta 23:59."""

    @abstractmethod
    async def guardar(self, partido: Partido) -> Partido:
        """Upsert: si `api_id` ya existe actualiza ese partido; si no, inserta uno nuevo."""