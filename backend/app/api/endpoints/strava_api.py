from fastapi import APIRouter, HTTPException, Depends, Header
from app.core.config import settings
import httpx
from pydantic import BaseModel
from typing import List, Optional

router = APIRouter()

class StravaActivity(BaseModel):
    id: int
    name: str
    distance: float
    moving_time: int
    total_elevation_gain: float
    start_date: str
    suffer_score: Optional[float] = None
    average_watts: Optional[float] = None
    weighted_average_watts: Optional[float] = None
    kilojoules: Optional[float] = None

@router.get("/activities", response_model=List[StravaActivity])
async def get_strava_activities(authorization: str = Header(None)):
    """
    Fetch recent activities from Strava for the authenticated user.
    Requires 'Authorization: Bearer <access_token>' header.
    """
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing Authorization header")

    token = authorization.replace("Bearer ", "")
    
    async with httpx.AsyncClient() as client:
        response = await client.get(
            "https://www.strava.com/api/v3/athlete/activities",
            headers={"Authorization": f"Bearer {token}"},
            params={"per_page": 5} # Get last 5 activities
        )
        
        if response.status_code != 200:
             # If 401, client should refresh token (not implemented here for brevity, usually frontend handles 401 logout/refresh)
            raise HTTPException(status_code=response.status_code, detail="Failed to fetch activities from Strava")
            
        data = response.json()
        return data

