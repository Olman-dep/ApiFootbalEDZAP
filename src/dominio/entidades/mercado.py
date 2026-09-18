from enum import StrEnum


class Mercado(StrEnum):
    """Mercados del MVP. Los valores son el contrato de la API (ver README, sección 4.4)."""

    RESULTADO_1X2 = "1x2"
    GOLES = "goals"
    CORNERS = "corners"
    TARJETAS = "cards"
    TIROS_JUGADOR = "player_shots"
    TIROS_ARCO_JUGADOR = "player_shots_on_target"


MERCADOS_DE_JUGADOR = frozenset({Mercado.TIROS_JUGADOR, Mercado.TIROS_ARCO_JUGADOR})
