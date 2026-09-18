from datetime import datetime

from bson import ObjectId
from bson.errors import InvalidId
from motor.motor_asyncio import AsyncIOMotorDatabase
from pymongo import ReturnDocument

from dominio.entidades import EstadoPartido, Partido
from dominio.excepciones import EntidadNoEncontrada
from dominio.repositorios import RepositorioPartidos


class RepositorioPartidosMongo(RepositorioPartidos):
    def __init__(self, db: AsyncIOMotorDatabase):
        self._col = db["partidos"]

    async def asegurar_indices(self) -> None:
        """Llamar una vez al iniciar la app."""
        await self._col.create_index(
            "api_id", unique=True, partialFilterExpression={"api_id": {"$type": "number"}}
        )
        await self._col.create_index([("fecha", 1), ("estado", 1)])

    async def obtener_por_id(self, partido_id: str) -> Partido | None:
        try:
            oid = ObjectId(partido_id)
        except (InvalidId, TypeError):
            return None
        doc = await self._col.find_one({"_id": oid})
        return Partido.desde_documento(doc) if doc else None

    async def obtener_por_api_id(self, api_id: int) -> Partido | None:
        doc = await self._col.find_one({"api_id": api_id})
        return Partido.desde_documento(doc) if doc else None

    async def listar(
        self,
        *,
        estado: EstadoPartido | None = None,
        liga_id: str | None = None,
        desde: datetime | None = None,
        hasta: datetime | None = None,
        limite: int = 100,
        saltar: int = 0,
    ) -> list[Partido]:
        filtro: dict = {}
        if estado:
            filtro["estado"] = estado.value
        if liga_id:
            filtro["liga_id"] = liga_id
        if desde or hasta:
            filtro["fecha"] = {}
            if desde:
                filtro["fecha"]["$gte"] = desde
            if hasta:
                filtro["fecha"]["$lte"] = hasta

        cursor = self._col.find(filtro).sort("fecha", 1).skip(saltar).limit(limite)
        return [Partido.desde_documento(doc) async for doc in cursor]

    async def guardar(self, partido: Partido) -> Partido:
        doc = partido.a_documento()
        doc.pop("_id", None)
        creado_en = doc.pop("creado_en")  # no se pisa al actualizar

        if partido.id:
            filtro, upsert = {"_id": ObjectId(partido.id)}, False
        elif partido.api_id is not None:
            filtro, upsert = {"api_id": partido.api_id}, True
        else:
            res = await self._col.insert_one({**doc, "creado_en": creado_en})
            return partido.model_copy(update={"id": str(res.inserted_id)})

        actualizado = await self._col.find_one_and_update(
            filtro,
            {"$set": doc, "$setOnInsert": {"creado_en": creado_en}},
            upsert=upsert,
            return_document=ReturnDocument.AFTER,
        )
        if actualizado is None:
            raise EntidadNoEncontrada(f"No existe el partido {partido.id}")
        return Partido.desde_documento(actualizado)