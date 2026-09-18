from datetime import datetime
from enum import StrEnum
from typing import Literal, Self

from pydantic import BaseModel, Field, model_validator

from .base import EntidadBase, ahora


class EstadoPartido(StrEnum):
    PROGRAMADO = "SCHEDULED"
    EN_VIVO = "LIVE"
    FINALIZADO = "FINISHED"
    APLAZADO = "POSTPONED"
    CANCELADO = "CANCELLED"


class EstadisticasEquipo(BaseModel):
    """Estadísticas de un equipo en un partido. Todo es opcional: los partidos futuros no las tienen."""

    corners: int | None = Field(default=None, ge=0)
    tiros: int | None = Field(default=None, ge=0)
    tiros_arco: int | None = Field(default=None, ge=0)
    tarjetas_amarillas: int | None = Field(default=None, ge=0)
    tarjetas_rojas: int | None = Field(default=None, ge=0)
    xg: float | None = Field(default=None, ge=0)


class Partido(EntidadBase):
    api_id: int | None = None
    liga_id: str | None = None
    temporada: int | None = Field(default=None, ge=1900, le=2200)
    equipo_local_id: str
    equipo_visitante_id: str
    fecha: datetime
    estado: EstadoPartido = EstadoPartido.PROGRAMADO

    # None = todavía no se jugó (distinto de un 0-0)
    goles_local: int | None = Field(default=None, ge=0)
    goles_visitante: int | None = Field(default=None, ge=0)

    estadisticas_local: EstadisticasEquipo | None = None
    estadisticas_visitante: EstadisticasEquipo | None = None

    arbitro: str | None = Field(default=None, max_length=100)
    clima: str | None = Field(default=None, max_length=100)
    creado_en: datetime = Field(default_factory=ahora)

    @model_validator(mode="after")
    def _validar_consistencia(self) -> Self:
        if self.equipo_local_id == self.equipo_visitante_id:
            raise ValueError("El equipo local y el visitante no pueden ser el mismo")
        if (self.goles_local is None) != (self.goles_visitante is None):
            raise ValueError("Los goles del local y del visitante deben informarse juntos")
        if self.estado == EstadoPartido.FINALIZADO and self.goles_local is None:
            raise ValueError("Un partido finalizado debe tener marcador")
        return self

    @property
    def esta_finalizado(self) -> bool:
        return self.estado == EstadoPartido.FINALIZADO

    @property
    def total_goles(self) -> int | None:
        if self.goles_local is None or self.goles_visitante is None:
            return None
        return self.goles_local + self.goles_visitante

    @property
    def resultado(self) -> Literal["home", "draw", "away"] | None:
        if self.goles_local is None or self.goles_visitante is None:
            return None
        if self.goles_local > self.goles_visitante:
            return "home"
        if self.goles_local < self.goles_visitante:
            return "away"
        return "draw"