"""Errores del dominio. La capa de presentación los traduce a códigos HTTP."""


class ErrorDominio(Exception):
    """Base de todos los errores del dominio."""


class EntidadNoEncontrada(ErrorDominio):
    """La entidad solicitada no existe."""


class EntidadDuplicada(ErrorDominio):
    """Ya existe una entidad con la misma clave única (por ejemplo, el email)."""