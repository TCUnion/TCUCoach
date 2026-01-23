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

class SyncRequest(BaseModel):
    object_id: int
    owner_id: int
    aspect_type: str = "create"
    object_type: str = "activity"

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

@router.post("/sync")
async def sync_strava_activity(request: SyncRequest):
    """
    Proxy request to n8n webhook to bypass CORS and provide status tracking.
    """
    payload = {
        "aspect_type": request.aspect_type,
        "event_time": int(httpx.QueryParams({"t": 0}).get("t") or 0) or 1700000000, # Placeholder or current
        "object_id": request.object_id,
        "object_type": request.object_type,
        "owner_id": request.owner_id,
        "subscription_id": 123456,
        "updates": {}
    }
    
    # Use real timestamp
    import time
    payload["event_time"] = int(time.time())

    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(
                "https://n8n.criterium.tw/webhook/strava-activity-webhook",
                json=payload,
                timeout=30.0
            )
            
            if response.status_code >= 500:
                raise HTTPException(status_code=503, detail="n8n 服務暫時不可用 (503)")
            
            if response.status_code != 200:
                raise HTTPException(status_code=response.status_code, detail=f"n8n 回傳錯誤: {response.text}")

            return {"status": "success", "message": "同步請求已轉發至 n8n"}
            
        except httpx.RequestError as exc:
            raise HTTPException(status_code=502, detail=f"無法連線至 n8n 伺服器: {str(exc)}")

