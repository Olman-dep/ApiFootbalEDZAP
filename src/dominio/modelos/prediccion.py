from django.db import models
from .partido import Partido
from .jugador import Jugador


class Prediccion(models.Model):
    partido = models.ForeignKey(Partido, on_delete=models.CASCADE, related_name="predicciones")
    jugador = models.ForeignKey(
        Jugador, 
        on_delete=models.CASCADE, 
        blank=True, 
        null=True, 
        related_name="predicciones",
        help_text="Usado exclusivamente para Player Props (ej: tiros de Luis Díaz)"
    )
    mercado = models.CharField(max_length=50)  # ej: 'corners', 'goals', 'player_shots'
    seleccion = models.CharField(max_length=50)  # ej: 'over_8.5', 'over_1.5'
    probabilidad = models.FloatField()          # Estimación del modelo (0.0 a 1.0)
    confianza = models.FloatField()             # Métrica de calidad del modelo (0.0 a 1.0)
    cuota = models.FloatField(blank=True, null=True)
    probabilidad_implicita = models.FloatField(blank=True, null=True)
    valor_esperado = models.FloatField(blank=True, null=True)  # EV = (Prob * Cuota) - 1
    es_valor_positivo = models.BooleanField(default=False)
    
    # Versionado (Sección 19 del README)
    nombre_modelo = models.CharField(max_length=50, default="xgboost")
    version_modelo = models.CharField(max_length=20, default="1.0.0")
    version_features = models.CharField(max_length=20, default="1.0.0")
    creado_en = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Predicción"
        verbose_name_plural = "Predicciones"

    def __str__(self):
        sujeto = self.jugador.nombre if self.jugador else self.partido
        return f"{sujeto} | {self.mercado} - {self.seleccion} (EV: {self.valor_esperado})"