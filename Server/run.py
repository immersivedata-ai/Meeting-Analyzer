import uvicorn
from dotenv import load_dotenv
import os

# Load environment variables
load_dotenv()

if __name__ == "__main__":
    # Get configuration from environment or use defaults
    host = os.getenv("HOST", "127.0.0.1")
    port = int(os.getenv("PORT", 8000))
    reload = os.getenv("RELOAD", "true").lower() == "true"
    
    print(f"Starting Meeting Analysis API on {host}:{port}")
    print(f"Reload mode: {reload}")
    print(f"Gemini configured: {'yes' if os.getenv('GEMINI_API_KEY') else 'no'}")
    
    uvicorn.run(
        "app.main:app",
        host=host,
        port=port,
        reload=reload
    )
