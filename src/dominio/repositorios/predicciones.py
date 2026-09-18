from abc import ABC, abstractmethod
from datetime import datetime

from ..entidades import Mercado, Prediccion


class RepositorioPredicciones(ABC):
    @abstractmethod
    async def guardar(self, prediccion: Prediccion) -> Prediccion: ...

    @abstractmethod
    async def obtener_ultima(
        self, partido_id: str, mercado: Mercado, seleccion: str, jugador_id: str | None = None
    ) -> Prediccion | None:
        """Sirve como caché: `/predictions/{match_id}` recupera en vez de recalcular."""

    @abstractmethod
    async def listar_por_partido(self, partido_id: str) -> list[Prediccion]: ...

    @abstractmethod
    async def listar_valor_positivo(self, *, limite: int = 100) -> list[Prediccion]:
        """Solo predicciones con EV > 0 (`/predictions/value`), mayor EV primero."""

    @abstractmethod
    async def listar_historial(
        self,
        *,
        desde: datetime | None = None,
        hasta: datetime | None = None,
        limite: int = 100,
        saltar: int = 0,
    ) -> list[Prediccion]:
        """Más recientes primero (`/predictions/history`)."""