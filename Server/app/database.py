import os

from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

load_dotenv()

MONGODB_URI = os.getenv("MONGODB_URI")
MONGODB_DB = os.getenv("MONGODB_DB", "manthan_ai")

if not MONGODB_URI:
    raise RuntimeError("MONGODB_URI is not configured")

client = AsyncIOMotorClient(MONGODB_URI)
db = client[MONGODB_DB]

users_collection = db["users"]
sessions_collection = db["sessions"]
password_resets_collection = db["password_resets"]
analyses_collection = db["analyses"]


async def ensure_indexes() -> None:
    await users_collection.create_index("email", unique=True)
    await sessions_collection.create_index("session_token_hash", unique=True)
    await sessions_collection.create_index("expires_at", expireAfterSeconds=0)
    await password_resets_collection.create_index("token_hash", unique=True)
    await password_resets_collection.create_index("expires_at", expireAfterSeconds=0)
    await analyses_collection.create_index([("user_id", 1), ("created_at", -1)])
