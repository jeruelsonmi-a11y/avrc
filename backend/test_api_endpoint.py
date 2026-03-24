#!/usr/bin/env python3
"""
Test by actually calling the API endpoint
"""
import asyncio
import json
from fastapi.testclient import TestClient
from main import app
from utils import create_access_token

def main():
    client = TestClient(app)
    
    # Create a test token for user ID 1
    token = create_access_token(subject="1")
    
    # Call the API
    headers = {"Authorization": f"Bearer {token}"}
    response = client.get("/reservations/", headers=headers)
    
    print(f"Status Code: {response.status_code}")
    print(f"Response JSON:")
    print(json.dumps(response.json(), indent=2, default=str))

if __name__ == "__main__":
    main()
