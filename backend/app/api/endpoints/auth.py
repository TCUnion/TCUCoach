from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import RedirectResponse
from app.core.config import settings
import httpx
from pydantic import BaseModel

router = APIRouter()

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    expires_at: int
    athlete: dict

@router.get("/strava/login")
async def strava_login():
    """
    Redirects user to Strava's OAuth page
    """
    params = {
        "client_id": settings.STRAVA_CLIENT_ID,
        "redirect_uri": settings.STRAVA_REDIRECT_URI,
        "response_type": "code",
        "approval_prompt": "auto",
        "scope": "activity:read_all",
    }
    url = f"https://www.strava.com/oauth/authorize?client_id={params['client_id']}&redirect_uri={params['redirect_uri']}&response_type={params['response_type']}&approval_prompt={params['approval_prompt']}&scope={params['scope']}"
    return RedirectResponse(url)

@router.get("/strava/callback")
async def strava_callback(code: str):
    """
    Exchanges authorization code for access token
    """
    async with httpx.AsyncClient() as client:
        response = await client.post(
            "https://www.strava.com/oauth/token",
            data={
                "client_id": settings.STRAVA_CLIENT_ID,
                "client_secret": settings.STRAVA_CLIENT_SECRET,
                "code": code,
                "grant_type": "authorization_code",
            },
        )
        
        if response.status_code != 200:
            raise HTTPException(status_code=400, detail="Failed to retrieve token from Strava")
            
        token_data = response.json()
        
        # In a real app, we would store this token in DB associated with the user.
        # For this MVP, we might return it to frontend or store in a secure cookie.
        # Since we are building an SPA interaction, returning to frontend via redirect with params is one way,
        # but better is to render a "success" page that posts message to opener or redirect to frontend app with token param.
        
        # START SIMPLIFICATION -> Redirect to frontend with token (NOT SECURE FOR PROD but ok for MVP local)
        # Assuming Frontend is at localhost:5173
        frontend_url = f"http://localhost:5173/strava-success?access_token={token_data['access_token']}&refresh_token={token_data['refresh_token']}&expires_at={token_data['expires_at']}"
        return RedirectResponse(frontend_url)

