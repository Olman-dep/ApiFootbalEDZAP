from datetime import datetime
from enum import StrEnum
from typing import Any

from pydantic import BaseModel, EmailStr, Field, field_validator

from .base import EntidadBase, a_utc, ahora


class RolUsuario(StrEnum):
    USUARIO = "USER"
    ADMIN = "ADMIN"


class PlanSuscripcion(StrEnum):
    FREE = "FREE"
    PREMIUM = "PREMIUM"


class EstadoSuscripcion(StrEnum):
    ACTIVA = "ACTIVE"
    INACTIVA = "INACTIVE"
    CANCELADA = "CANCELLED"
    EXPIRADA = "EXPIRED"


class Suscripcion(BaseModel):
    """Plan del usuario. Va embebida en el documento Usuario."""

    plan: PlanSuscripcion = PlanSuscripcion.FREE
    estado: EstadoSuscripcion = EstadoSuscripcion.ACTIVA
    fecha_inicio: datetime = Field(default_factory=ahora)
    fecha_fin: datetime | None = None

    @property
    def esta_vigente(self) -> bool:
        if self.estado != EstadoSuscripcion.ACTIVA:
            return False
        return self.fecha_fin is None or a_utc(self.fecha_fin) > ahora()


class Usuario(EntidadBase):
    email: EmailStr
    nombre_completo: str | None = Field(default=None, max_length=255)
    hash_contrasena: str = Field(repr=False, exclude=True)  # nunca se serializa a la API
    rol: RolUsuario = RolUsuario.USUARIO
    activo: bool = True
    suscripcion: Suscripcion = Field(default_factory=Suscripcion)
    creado_en: datetime = Field(default_factory=ahora)
    actualizado_en: datetime = Field(default_factory=ahora)

    @field_validator("email")
    @classmethod
    def _email_en_minusculas(cls, valor: str) -> str:
        return valor.lower()

    def a_documento(self) -> dict[str, Any]:
        """El hash está excluido de la serialización normal (API); aquí se incluye explícitamente para guardarlo."""
        doc = super().a_documento()
        doc["hash_contrasena"] = self.hash_contrasena
        return doc

    @property
    def es_premium(self) -> bool:
        if self.rol == RolUsuario.ADMIN:
            return True
        return self.suscripcion.plan == PlanSuscripcion.PREMIUM and self.suscripcion.esta_vigente

    def __str__(self) -> str:
        return f"{self.email} ({self.rol})"