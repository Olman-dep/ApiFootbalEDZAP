from django.db import models


class Equipo(models.Model):
    nombre = models.CharField(max_length=100, verbose_name="Nombre del equipo")
    pais = models.CharField(max_length=100, verbose_name="País")
    logo_url = models.URLField(blank=True, null=True)
    estadio = models.CharField(max_length=150, blank=True, null=True)

    class Meta:
        verbose_name = "Equipo"
        verbose_name_plural = "Equipos"

    def __str__(self):
        return self.nombre