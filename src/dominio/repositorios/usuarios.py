from abc import ABC, abstractmethod

from ..entidades import Usuario


class RepositorioUsuarios(ABC):
    @abstractmethod
    async def obtener_por_id(self, usuario_id: str) -> Usuario | None: ...

    @abstractmethod
    async def obtener_por_email(self, email: str) -> Usuario | None:
        """Búsqueda insensible a mayúsculas (el email se guarda en minúsculas)."""

    @abstractmethod
    async def crear(self, usuario: Usuario) -> Usuario:
        """Lanza `EntidadDuplicada` si el email ya está registrado."""

    @abstractmethod
    async def actualizar(self, usuario: Usuario) -> Usuario:
        """Actualiza `actualizado_en`. Lanza `EntidadNoEncontrada` si no existe."""