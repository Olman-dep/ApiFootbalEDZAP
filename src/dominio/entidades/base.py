"""Base común de las entidades del dominio (Pydantic, sin dependencias de framework web ni de BD)."""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Self

from pydantic import BaseModel, ConfigDict, Field


def ahora() -> datetime:
    """Fecha y hora actual en UTC (siempre con zona horaria)."""
    return datetime.now(timezone.utc)


def a_utc(fecha: datetime) -> datetime:
    """Normaliza a UTC. MongoDB devuelve fechas 'naive' si el cliente no usa tz_aware=True."""
    if fecha.tzinfo is None:
        return fecha.replace(tzinfo=timezone.utc)
    return fecha.astimezone(timezone.utc)


class EntidadBase(BaseModel):
    """Entidad con identificador. En Mongo el id vive en `_id`; en el dominio y la API es `id` (str)."""

    model_config = ConfigDict(
        populate_by_name=True,
        str_strip_whitespace=True,
        validate_assignment=True,
    )

    id: str | None = Field(default=None, alias="_id")

    def a_documento(self) -> dict[str, Any]:
        """Convierte la entidad a un documento listo para insertar en MongoDB."""
        doc = self.model_dump(by_alias=True)
        if doc.get("_id") is None:
            doc.pop("_id", None)  # deja que Mongo genere el ObjectId
        return doc

    @classmethod
    def desde_documento(cls, doc: dict[str, Any]) -> Self:
        """Construye la entidad desde un documento de MongoDB (convierte ObjectId a str)."""
        datos = dict(doc)
        if datos.get("_id") is not None:
            datos["_id"] = str(datos["_id"])
        return cls.model_validate(datos)
    