"""
Application configuration — reads from environment variables.
"""
import os
from datetime import timedelta


class Config:
    SECRET_KEY = os.environ.get("SECRET_KEY", "dsms-dev-secret")
    JWT_SECRET_KEY = os.environ.get("JWT_SECRET_KEY", "dsms-jwt-secret")
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(
        seconds=int(os.environ.get("JWT_ACCESS_TOKEN_EXPIRES", 86400))
    )
    JWT_TOKEN_LOCATION = ["headers"]
    JWT_HEADER_NAME = "Authorization"
    JWT_HEADER_TYPE = "Bearer"

    MONGO_URI = os.environ.get("MONGO_URI", "mongodb://localhost:27017/dsms_db")

    UPLOAD_FOLDER = os.environ.get("UPLOAD_FOLDER", "uploads")
    MAX_CONTENT_LENGTH = int(os.environ.get("MAX_CONTENT_LENGTH", 16 * 1024 * 1024))

    FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:5173")
