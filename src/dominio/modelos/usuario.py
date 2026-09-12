from django.contrib.auth.models import AbstractUser
from django.db import models


class RolUsuario(models.TextChoices):
    USUARIO = 'USER', 'Usuario'
    PREMIUM = 'PREMIUM', 'Premium'
    ADMIN = 'ADMIN', 'Administrador'


class EstadoSuscripcion(models.TextChoices):
    ACTIVA = 'ACTIVE', 'Activa'
    INACTIVA = 'INACTIVE', 'Inactiva'
    CANCELADA = 'CANCELLED', 'Cancelada'
    EXPIRADA = 'EXPIRED', 'Expirada'


class Usuario(AbstractUser):
    email = models.EmailField(unique=True, verbose_name="Correo electrónico")
    nombre_completo = models.CharField(max_length=255, blank=True, null=True)
    rol = models.CharField(max_length=10, choices=RolUsuario.choices, default=RolUsuario.USUARIO)
    esta_activo = models.BooleanField(default=True)
    creado_en = models.DateTimeField(auto_now_add=True)
    actualizado_en = models.DateTimeField(auto_now=True)

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username', 'first_name', 'last_name']

    class Meta:
        verbose_name = "Usuario"
        verbose_name_plural = "Usuarios"

    def __str__(self):
        return f"{self.email} ({self.rol})"

    @property
    def es_premium(self):
        return self.rol in [RolUsuario.PREMIUM, RolUsuario.ADMIN]


class SuscripcionUsuario(models.Model):
    usuario = models.OneToOneField(Usuario, on_delete=models.CASCADE, related_name="suscripcion")
    plan = models.CharField(max_length=10, choices=RolUsuario.choices, default=RolUsuario.USUARIO)
    estado = models.CharField(max_length=10, choices=EstadoSuscripcion.choices, default=EstadoSuscripcion.INACTIVA)
    fecha_inicio = models.DateTimeField(auto_now_add=True)
    fecha_fin = models.DateTimeField(blank=True, null=True)

    def __str__(self):
        return f"Suscripción {self.usuario.email} - {self.estado}"