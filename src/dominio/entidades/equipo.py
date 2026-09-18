from pydantic import Field

from .base import EntidadBase


class Equipo(EntidadBase):
    api_id: int | None = Field(default=None, description="ID en API-Football; permite importar sin duplicar")
    nombre: str = Field(min_length=1, max_length=100)
    pais: str = Field(min_length=1, max_length=100)
    logo_url: str | None = None
    estadio: str | None = Field(default=None, max_length=150)

    def __str__(self) -> str:
        return self.nombre
    