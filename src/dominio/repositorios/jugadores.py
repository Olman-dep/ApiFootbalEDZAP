from abc import ABC, abstractmethod

from ..entidades import Jugador


class RepositorioJugadores(ABC):
    @abstractmethod
    async def obtener_por_id(self, jugador_id: str) -> Jugador | None: ...

    @abstractmethod
    async def listar_por_equipo(self, equipo_id: str) -> list[Jugador]: ...

    @abstractmethod
    async def guardar(self, jugador: Jugador) -> Jugador:
        """Upsert por `api_id` cuando está informado."""