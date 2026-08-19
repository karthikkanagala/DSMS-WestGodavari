"""
Flask extension singletons — initialised in app factory.
Provides seamless fallback to in-memory mongomock if local mongod is not reachable.
"""
from flask_jwt_extended import JWTManager
from flask_cors import CORS
import pymongo
import mongomock

class MongoWrapper:
    def __init__(self):
        self.client = None
        self.db = None

    def init_app(self, app):
        uri = app.config.get("MONGO_URI", "mongodb://localhost:27017/dsms_db")
        db_name = uri.split("/")[-1].split("?")[0] or "dsms_db"
        try:
            client = pymongo.MongoClient(uri, serverSelectionTimeoutMS=2000)
            client.admin.command('ping')
            self.client = client
            self.db = client[db_name]
            print(f"[DB] Connected to MongoDB at {uri}")
        except Exception:
            print("[DB] Local MongoDB server not reachable. Initializing in-memory mongomock database...")
            # mongomock client singleton
            if not hasattr(MongoWrapper, "_mock_client"):
                MongoWrapper._mock_client = mongomock.MongoClient()
            self.client = MongoWrapper._mock_client
            self.db = self.client[db_name]

mongo = MongoWrapper()
jwt   = JWTManager()
cors  = CORS()
