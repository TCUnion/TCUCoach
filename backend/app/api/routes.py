from app.api.endpoints import auth, strava_api, activities

router = APIRouter()
router.include_router(auth.router, prefix="/auth", tags=["auth"])
router.include_router(strava_api.router, prefix="/strava", tags=["strava"])
router.include_router(activities.router, prefix="/db", tags=["database"])
