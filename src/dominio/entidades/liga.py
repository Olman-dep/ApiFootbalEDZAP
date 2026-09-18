from pydantic import Field

from .base import EntidadBase


class Liga(EntidadBase):
    """Competición (Premier League, LaLiga...). Necesaria para calcular promedios por liga en el modelo."""

    api_id: int | None = None
    nombre: str = Field(min_length=1, max_length=100)
    pais: str | None = Field(default=None, max_length=100)
    temporada_actual: int | None = Field(default=None, ge=1900, le=2200)

    def __str__(self) -> str:
        return self.nombre
    