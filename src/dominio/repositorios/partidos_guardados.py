from abc import ABC, abstractmethod

from ..entidades import PartidoGuardado


class RepositorioPartidosGuardados(ABC):
    @abstractmethod
    async def agregar(self, usuario_id: str, partido_id: str) -> PartidoGuardado:
        """Idempotente: si ya estaba guardado devuelve el existente (índice único usuario+partido)."""

    @abstractmethod
    async def quitar(self, usuario_id: str, partido_id: str) -> bool:
        """True si existía y se eliminó."""

    @abstractmethod
    async def listar_por_usuario(self, usuario_id: str) -> list[PartidoGuardado]: ...