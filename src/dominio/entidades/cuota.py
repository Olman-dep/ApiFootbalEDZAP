from datetime import datetime

from pydantic import Field

from .base import EntidadBase, ahora
from .mercado import Mercado


class Cuota(EntidadBase):
    """Snapshot de una cuota en un instante. Nunca se actualiza: cada lectura inserta un documento nuevo.

    Así se conserva el historial de movimiento de la línea (necesario para backtesting).
    """

    partido_id: str
    casa_apuestas: str = Field(min_length=1, max_length=50)  # Ej: Bet365, Rushbet
    mercado: Mercado
    seleccion: str = Field(min_length=1, max_length=50)  # Ej: over_2.5
    cuota: float = Field(gt=1.0, description="Cuota decimal (> 1.0)")
    capturado_en: datetime = Field(default_factory=ahora)

    @property
    def probabilidad_implicita(self) -> float:
        return round(1.0 / self.cuota, 4)

    def __str__(self) -> str:
        return f"{self.casa_apuestas} | {self.mercado} ({self.seleccion}): {self.cuota}"