from datetime import timedelta

from dominio.entidades import EstadoPartido, Partido
from dominio.entidades.base import ahora

_base = ahora().replace(minute=0, second=0, microsecond=0)

MOCK_PARTIDOS = [
    Partido(
        id="12345",
        liga_id="laliga",
        equipo_local_id="real-madrid",
        equipo_visitante_id="barcelona",
        fecha=_base + timedelta(hours=3),
        estado=EstadoPartido.PROGRAMADO,
    ),
    Partido(
        id="67890",
        liga_id="premier-league",
        equipo_local_id="liverpool",
        equipo_visitante_id="manchester-city",
        fecha=_base + timedelta(days=1),
        estado=EstadoPartido.PROGRAMADO,
    ),
]

MOCK_PLAYERS = [
    {
        "id": "p1",
        "name": "Vinícius Jr.",
        "team": "Real Madrid",
        "position": "DEL",
        "expected_shots": 3.2,
    }
]