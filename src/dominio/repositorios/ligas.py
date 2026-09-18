from abc import ABC, abstractmethod

from ..entidades import Liga


class RepositorioLigas(ABC):
    @abstractmethod
    async def obtener_por_id(self, liga_id: str) -> Liga | None: ...

    @abstractmethod
    async def listar(self) -> list[Liga]: ...

    @abstractmethod
    async def guardar(self, liga: Liga) -> Liga:
        """Upsert por `api_id` cuando está informado."""
        