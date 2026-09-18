from datetime import datetime
from typing import Self

from pydantic import Field, computed_field, model_validator

from .base import EntidadBase, ahora
from .mercado import MERCADOS_DE_JUGADOR, Mercado


class Prediccion(EntidadBase):
    partido_id: str
    jugador_id: str | None = Field(default=None, description="Solo para player props")
    mercado: Mercado
    seleccion: str = Field(min_length=1, max_length=50)  # Ej: over_8.5
    probabilidad: float = Field(ge=0.0, le=1.0, description="Estimación del modelo")
    confianza: float = Field(ge=0.0, le=1.0, description="Calidad del modelo para esta predicción")
    cuota: float | None = Field(default=None, gt=1.0)

    # Trazabilidad del modelo
    nombre_modelo: str = "poisson_monte_carlo"
    version_modelo: str = "1.0.0"
    version_features: str = "1.0.0"
    simulaciones: int | None = Field(default=None, gt=0)
    creado_en: datetime = Field(default_factory=ahora)

    @model_validator(mode="after")
    def _validar_jugador(self) -> Self:
        es_prop = self.mercado in MERCADOS_DE_JUGADOR
        if es_prop and self.jugador_id is None:
            raise ValueError(f"El mercado '{self.mercado}' requiere jugador_id")
        if not es_prop and self.jugador_id is not None:
            raise ValueError(f"El mercado '{self.mercado}' no admite jugador_id")
        return self

    # Se derivan de probabilidad y cuota: no pueden quedar desincronizados.
    @computed_field  # type: ignore[prop-decorator]
    @property
    def probabilidad_implicita(self) -> float | None:
        return None if self.cuota is None else round(1.0 / self.cuota, 4)

    @computed_field  # type: ignore[prop-decorator]
    @property
    def valor_esperado(self) -> float | None:
        """EV = (probabilidad_modelo × cuota) − 1"""
        return None if self.cuota is None else round(self.probabilidad * self.cuota - 1.0, 4)

    @computed_field  # type: ignore[prop-decorator]
    @property
    def es_valor_positivo(self) -> bool:
        ev = self.valor_esperado
        return ev is not None and ev > 0.0