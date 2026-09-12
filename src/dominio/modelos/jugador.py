from django.db import models
from .equipo import Equipo


class PosicionJugador(models.TextChoices):
    PORTERO = 'POR', 'Portero'
    DEFENSA = 'DEF', 'Defensa'
    CENTROCAMPISTA = 'MED', 'Centrocampista'
    DELANTERO = 'DEL', 'Delantero'


class Jugador(models.Model):
    equipo = models.ForeignKey(Equipo, on_delete=models.CASCADE, related_name="jugadores")
    nombre = models.CharField(max_length=150)
    posicion = models.CharField(max_length=3, choices=PosicionJugador.choices)
    nacionalidad = models.CharField(max_length=100, blank=True, null=True)
    dorsal = models.PositiveIntegerField(blank=True, null=True)

    class Meta:
        verbose_name = "Jugador"
        verbose_name_plural = "Jugadores"

    def __str__(self):
        return f"{self.nombre} ({self.equipo.nombre})"