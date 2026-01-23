from supabase import create_client, Client
from app.core.config import settings

def get_supabase() -> Client:
    url: str = settings.SUPABASE_URL
    key: str = settings.SUPABASE_SERVICE_KEY or settings.SUPABASE_ANON_KEY
    
    if not url or not key:
        print("Warning: Supabase credentials not found in settings.")
        return None
        
    return create_client(url, key)

supabase_client = get_supabase()
