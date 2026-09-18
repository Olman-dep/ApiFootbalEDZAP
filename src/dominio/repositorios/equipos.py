from abc import ABC, abstractmethod

from ..entidades import Equipo


class RepositorioEquipos(ABC):
    @abstractmethod
    async def obtener_por_id(self, equipo_id: str) -> Equipo | None: ...

    @abstractmethod
    async def obtener_por_api_id(self, api_id: int) -> Equipo | None: ...

    @abstractmethod
    async def listar(self, *, limite: int = 100, saltar: int = 0) -> list[Equipo]: ...

    @abstractmethod
    async def guardar(self, equipo: Equipo) -> Equipo:
        """Upsert por `api_id` cuando está informado."""