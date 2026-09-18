"""Contratos (puertos) que la infraestructura debe implementar. El dominio solo conoce estas interfaces."""
from .cuotas import RepositorioCuotas
from .equipos import RepositorioEquipos
from .jugadores import RepositorioJugadores
from .ligas import RepositorioLigas
from .partidos import RepositorioPartidos
from .partidos_guardados import RepositorioPartidosGuardados
from .predicciones import RepositorioPredicciones
from .usuarios import RepositorioUsuarios

__all__ = [
    "RepositorioCuotas", "RepositorioEquipos", "RepositorioJugadores", "RepositorioLigas",
    "RepositorioPartidos", "RepositorioPartidosGuardados", "RepositorioPredicciones", "RepositorioUsuarios",
]