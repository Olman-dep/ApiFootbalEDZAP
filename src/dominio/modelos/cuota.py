from django.db import models
from .partido import Partido


class Cuota(models.Model):
    partido = models.ForeignKey(Partido, on_delete=models.CASCADE, related_name="cuotas")
    casa_apuestas = models.CharField(max_length=50)  # Ej: Bet365, Rushbet
    mercado = models.CharField(max_length=50)        # Ej: corners_over_8.5, player_shots
    seleccion = models.CharField(max_length=50)      # Ej: over_2.5
    cuota = models.FloatField()                      # Ej: 1.85
    probabilidad_implicita = models.FloatField(blank=True, null=True)  # 1 / cuota
    actualizado_en = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Cuota"
        verbose_name_plural = "Cuotas"

    def save(self, *args, **kwargs):
        if self.cuota and self.cuota > 0:
            self.probabilidad_implicita = round(1.0 / self.cuota, 4)
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.casa_apuestas} | {self.mercado} ({self.seleccion}): {self.cuota}"