"""FastAPI entry point for the crop disease detection system."""
from contextlib import asynccontextmanager
import os

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

try:  # Supports both `uvicorn backend.main:app` and running inside backend/.
    from .database_service import disease_database
    from .location import get_location, search_location
    from .weather import get_weather as fetch_weather
    from .voice_fixed import router as voice_router
except ImportError:
    from database_service import disease_database
    from location import get_location, search_location
    from weather import get_weather as fetch_weather
    from voice_fixed import router as voice_router


@asynccontextmanager
async def lifespan(_: FastAPI):
    disease_database.load()
    yield


app = FastAPI(title="Farmer Helps API", lifespan=lifespan)
app.include_router(voice_router)
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])
CONFIDENCE_THRESHOLD = float(os.getenv("CROP_CONFIDENCE_THRESHOLD", "0.70"))


def api_error(error_type: str, message: str, status_code: int) -> HTTPException:
    return HTTPException(status_code=status_code, detail={"success": False, "error_type": error_type, "message": message})


@app.get("/")
def read_root():
    return {"message": "Farmer Helps API is running"}


@app.get("/location")
def location(lat: float, lon: float):
    try:
        return {"location": get_location(lat, lon), "weather": fetch_weather(lat, lon)}
    except Exception as exc:
        raise HTTPException(status_code=502, detail="Location or weather service is unavailable") from exc


@app.get("/weather")
def weather(lat: float | None = None, lon: float | None = None, city: str | None = None):
    try:
        if city and (lat is None or lon is None):
            location_data = search_location(city)
            lat, lon = location_data["latitude"], location_data["longitude"]
        elif lat is None or lon is None:
            raise HTTPException(status_code=400, detail="Provide lat/lon or city")
        else:
            location_data = get_location(lat, lon)
        return {"location": location_data, "weather": fetch_weather(lat, lon)}
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=502, detail="Weather service is unavailable") from exc


@app.get("/api/weather")
def api_weather(lat: float | None = None, lon: float | None = None, city: str | None = None):
    return weather(lat, lon, city)


class PredictionRequest(BaseModel):
    label: str = Field(min_length=1, max_length=200)
    crop: str | None = Field(default=None, max_length=100)
    disease: str | None = Field(default=None, max_length=200)
    confidence: float = Field(ge=0, le=1)


@app.post("/predict")
def predict_disease(request: PredictionRequest):
    try:
        if request.confidence < CONFIDENCE_THRESHOLD:
            raise api_error("low_confidence", "Low confidence. Please upload a clearer image of the crop or leaf.", 422)
        crop = request.crop.strip() if request.crop else None
        disease = request.disease.strip() if request.disease else request.label.strip()
        match = disease_database.find(crop, disease) if crop else disease_database.find_any_crop(disease)
        if not match:
            return {"success": True, "database_match": False, "label": request.label, "crop": crop, "disease": disease, "confidence": request.confidence, "message": "We identified the crop/disease, but detailed information is not available in the database yet."}
        disease = match["disease"]
        result = {"success": True, "database_match": True, "crop": match["crop"]["crop_name"], "disease": disease["disease_name"], "confidence": request.confidence}
        for key in ("severity", "description", "symptoms", "treatment", "recommended_action", "prevention", "causes", "pathogen", "pathogen_type", "escalate_when"):
            if key in disease and disease[key] not in (None, "", [], {}):
                result[key] = disease[key]
        return result
    except HTTPException:
        raise
    except Exception as exc:
        print(f"Prediction error ({type(exc).__name__}): {exc}")
        raise api_error("server_error", "The disease detector is temporarily unavailable. Please try again.", 500) from exc
