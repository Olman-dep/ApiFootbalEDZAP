from enum import StrEnum

from pydantic import Field

from .base import EntidadBase


class PosicionJugador(StrEnum):
    PORTERO = "POR"
    DEFENSA = "DEF"
    CENTROCAMPISTA = "MED"
    DELANTERO = "DEL"


class Jugador(EntidadBase):
    api_id: int | None = None
    equipo_id: str
    nombre: str = Field(min_length=1, max_length=150)
    posicion: PosicionJugador
    nacionalidad: str | None = Field(default=None, max_length=100)
    dorsal: int | None = Field(default=None, ge=1, le=99)

    def __str__(self) -> str:
        return self.nombre