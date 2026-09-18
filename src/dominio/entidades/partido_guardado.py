from datetime import datetime

from pydantic import Field

from .base import EntidadBase, ahora


class PartidoGuardado(EntidadBase):
    """Partido marcado como favorito por un usuario. Único por (usuario_id, partido_id)."""

    usuario_id: str
    partido_id: str
    creado_en: datetime = Field(default_factory=ahora)