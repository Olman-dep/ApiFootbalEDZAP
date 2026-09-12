import os
from typing import List, Dict, Any
from motor.motor_asyncio import AsyncIOMotorClient
from ...external.mock_data import MOCK_MATCHES


class MongoRepository:
    def __init__(self):
        self.mongodb_uri = os.getenv("MONGODB_URI", "")
        self.db_name = os.getenv("DATABASE_NAME", "sports_predictions")
        self.client = None
        self.db = None
        self.is_mock = False

        if self.mongodb_uri:
            self.client = AsyncIOMotorClient(self.mongodb_uri)
            self.db = self.client[self.db_name]
        else:
            self.is_mock = True

    async def get_matches(self) -> List[Dict[str, Any]]:
        """Recupera partidos desde MongoDB o devuelve mock_data si MONGODB_URI está vacía."""
        if self.is_mock:
            return MOCK_MATCHES

        cursor = self.db["matches"].find({})
        return await cursor.to_list(length=100)