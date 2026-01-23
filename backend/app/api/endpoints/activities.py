from fastapi import APIRouter, HTTPException, Header, Query
from app.db.client import supabase_client
from typing import List, Optional
from pydantic import BaseModel
import httpx

router = APIRouter()

class ActivityRO(BaseModel):
    id: int
    name: str
    start_date_local: str
    distance: float
    moving_time: int
    total_elevation_gain: float
    average_watts: Optional[float] = None
    isSynced: bool = False

@router.get("/activities", response_model=List[ActivityRO])
async def get_db_activities(
    athlete_id: int = Query(..., description="The Strava Athlete ID to fetch activities for"),
    # In a fully secure system, we would get athlete_id from the verified session/token, not a query param.
    # For this step, we are moving the DB query to backend. 
    # TODO: Add Session/Token verification here to ensure requester owns athlete_id.
    authorization: str = Header(None) 
):
    """
    Fetch activities from Supabase database via Backend (Service Role).
    This allows us to enable RLS on the table later.
    """
    if not supabase_client:
        raise HTTPException(status_code=503, detail="Database connection unavailable")

    # 1. Fetch activities
    try:
        # Calculate 30 days ago
        # We can do this in Python or SQL. Supabase filter 'gte' works with string ISO.
        # Let's keep it simple and consistent with frontend logic.
        from datetime import datetime, timedelta
        thirty_days_ago = (datetime.now() - timedelta(days=30)).isoformat()

        response = supabase_client.table('strava_activities')\
            .select('id, name, start_date_local, distance, moving_time, total_elevation_gain, average_watts')\
            .eq('athlete_id', athlete_id)\
            .gte('start_date_local', thirty_days_ago)\
            .order('start_date_local', desc=True)\
            .limit(10)\
            .execute()
        
        activities = response.data
        if not activities:
            return []

        # 2. Check sync status (streams)
        activity_ids = [a['id'] for a in activities]
        if activity_ids:
            streams_response = supabase_client.table('strava_streams')\
                .select('activity_id')\
                .in_('activity_id', activity_ids)\
                .execute()
            
            synced_ids = set(item['activity_id'] for item in streams_response.data)
            
            # Merge status
            for act in activities:
                act['isSynced'] = act['id'] in synced_ids

        return activities

    except Exception as e:
        print(f"Error fetching activities: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/activities/latest")
async def get_latest_activity(
    athlete_id: int = Query(..., description="The Strava Athlete ID"),
    authorization: str = Header(None)
):
    """
    Fetch the latest activity with full details: bike, streams, etc.
    Replaces frontend direct query in useDrTcu.ts.
    """
    if not supabase_client:
        raise HTTPException(status_code=503, detail="Database connection unavailable")

    try:
        from datetime import datetime, timedelta
        thirty_days_ago = (datetime.now() - timedelta(days=30)).isoformat()

        # 1. Fetch latest activity
        response = supabase_client.table('strava_activities')\
            .select('id, athlete_id, name, moving_time, average_watts, weighted_average_watts, start_date, start_date_local, gear_id, device_name, average_heartrate, max_heartrate, average_temp, distance, total_elevation_gain, suffer_score, kilojoules')\
            .eq('athlete_id', athlete_id)\
            .gte('start_date', thirty_days_ago)\
            .order('start_date', desc=True)\
            .limit(1)\
            .execute()
        
        if not response.data:
            return None
        
        activity = response.data[0]
        
        # 2. Fetch Bike Name
        bike_name = '未知單車'
        if activity.get('gear_id'):
            bike_resp = supabase_client.table('bikes')\
                .select('name')\
                .eq('id', activity['gear_id'])\
                .maybe_single()\
                .execute()
            if bike_resp.data:
                bike_name = bike_resp.data['name']
        
        activity['bike_name'] = bike_name

        # 3. Fetch Streams
        streams_resp = supabase_client.table('strava_streams')\
            .select('streams')\
            .eq('activity_id', activity['id'])\
            .maybe_single()\
            .execute()
        
        activity['streams'] = streams_resp.data['streams'] if streams_resp.data else None

        # 3.1 If streams missing and token present, try to sync (Server-side Proxy fetch)
        if not activity['streams'] and authorization:
            try:
                token = authorization.replace("Bearer ", "")
                async with httpx.AsyncClient() as client:
                    strava_resp = await client.get(
                        f"https://www.strava.com/api/v3/activities/{activity['id']}/streams?keys=time,distance,latlng,altitude,velocity_smooth,heartrate,cadence,watts,temp,moving,grade_smooth&key_by_type=true",
                        headers={"Authorization": f"Bearer {token}"}
                    )
                    if strava_resp.status_code == 200:
                        raw_streams = strava_resp.json()
                        streams_array = [{"type": k, **v} for k, v in raw_streams.items()]
                        
                        # Save to DB (Server-side)
                        # supabase_client uses SERVICE_KEY so it bypasses RLS.
                        supabase_client.table('strava_streams').upsert({
                            "activity_id": activity['id'],
                            "streams": streams_array
                        }).execute()
                        
                        activity['streams'] = streams_array
            except Exception as sync_err:
                print(f"Server-side stream sync failed: {sync_err}")

        return activity

    except Exception as e:
        print(f"Error fetching latest activity: {e}")
        raise HTTPException(status_code=500, detail=str(e))
