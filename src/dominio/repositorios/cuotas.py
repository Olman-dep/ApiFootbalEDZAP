from abc import ABC, abstractmethod

from ..entidades import Cuota, Mercado


class RepositorioCuotas(ABC):
    """Las cuotas son snapshots inmutables: solo se agregan, nunca se actualizan."""

    @abstractmethod
    async def agregar(self, cuota: Cuota) -> Cuota: ...

    @abstractmethod
    async def agregar_varias(self, cuotas: list[Cuota]) -> int:
        """Inserta en lote y devuelve cuántas se guardaron."""

    @abstractmethod
    async def ultimas_por_partido(self, partido_id: str) -> list[Cuota]:
        """La cuota más reciente por cada (casa, mercado, selección) del partido."""

    @abstractmethod
    async def historial(
        self,
        partido_id: str,
        mercado: Mercado,
        seleccion: str,
        casa_apuestas: str | None = None,
    ) -> list[Cuota]:
        """Evolución de la cuota en el tiempo, de más antigua a más reciente."""