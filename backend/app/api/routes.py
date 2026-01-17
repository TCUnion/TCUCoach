from fastapi import APIRouter
from app.api.endpoints import auth, strava_api

router = APIRouter()
router.include_router(auth.router, prefix="/auth", tags=["auth"])
router.include_router(strava_api.router, prefix="/strava", tags=["strava"])
