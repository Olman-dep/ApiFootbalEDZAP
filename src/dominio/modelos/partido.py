from django.db import models
from .equipo import Equipo
from .usuario import Usuario


class EstadoPartido(models.TextChoices):
    PROGRAMADO = 'SCHEDULED', 'Programado'
    EN_VIVO = 'LIVE', 'En Vivo'
    FINALIZADO = 'FINISHED', 'Finalizado'
    APLAZADO = 'POSTPONED', 'Aplazado'
    CANCELADO = 'CANCELLED', 'Cancelado'


class Partido(models.Model):
    equipo_local = models.ForeignKey(Equipo, on_delete=models.CASCADE, related_name="partidos_local")
    equipo_visitante = models.ForeignKey(Equipo, on_delete=models.CASCADE, related_name="partidos_visitante")
    competicion = models.CharField(max_length=100, blank=True, null=True)  # Ej: Premier League
    fecha = models.DateTimeField()
    estado = models.CharField(max_length=15, choices=EstadoPartido.choices, default=EstadoPartido.PROGRAMADO)
    
    # Marcador
    goles_local = models.PositiveIntegerField(default=0)
    goles_visitante = models.PositiveIntegerField(default=0)

    # Estadísticas para ML (Córners, Tiros, Tarjetas, xG)
    corners_local = models.PositiveIntegerField(blank=True, null=True)
    corners_visitante = models.PositiveIntegerField(blank=True, null=True)
    tiros_local = models.PositiveIntegerField(blank=True, null=True)
    tiros_visitante = models.PositiveIntegerField(blank=True, null=True)
    tiros_arco_local = models.PositiveIntegerField(blank=True, null=True)
    tiros_arco_visitante = models.PositiveIntegerField(blank=True, null=True)
    tarjetas_amarillas_local = models.PositiveIntegerField(blank=True, null=True)
    tarjetas_amarillas_visitante = models.PositiveIntegerField(blank=True, null=True)
    tarjetas_rojas_local = models.PositiveIntegerField(blank=True, null=True)
    tarjetas_rojas_visitante = models.PositiveIntegerField(blank=True, null=True)
    xg_local = models.FloatField(blank=True, null=True)
    xg_visitante = models.FloatField(blank=True, null=True)

    # Contexto
    arbitro = models.CharField(max_length=100, blank=True, null=True)
    clima = models.CharField(max_length=100, blank=True, null=True)

    creado_en = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Partido"
        verbose_name_plural = "Partidos"

    def __str__(self):
        return f"{self.equipo_local.nombre} vs {self.equipo_visitante.nombre} ({self.fecha.strftime('%Y-%m-%d')})"

    @property
    def esta_finalizado(self):
        return self.estado == EstadoPartido.FINALIZADO


class PartidoGuardado(models.Model):
    usuario = models.ForeignKey(Usuario, on_delete=models.CASCADE, related_name="partidos_guardados")
    partido = models.ForeignKey(Partido, on_delete=models.CASCADE, related_name="guardado_por_usuarios")
    creado_en = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('usuario', 'partido')
        verbose_name = "Partido Guardado"
        verbose_name_plural = "Partidos Guardados"