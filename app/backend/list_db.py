import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os

async def main():
    mongo_url = "mongodb://localhost:27017"
    client = AsyncIOMotorClient(mongo_url)
    db = client["test_database"]
    users = await db.users.find().to_list(100)
    print("USERS IN DB:")
    for u in users:
        print(f"- {u['email']} (name: {u.get('name')})")

asyncio.run(main())
