from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import time
from location import get_location, search_location
from weather import get_weather as fetch_weather
from voice import router as voice_router


app = FastAPI(title="Farmer Helps API")
app.include_router(voice_router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"message": "Farmer Helps API is running"}


@app.get("/location")
def location(lat: float, lon: float):
    """Detect the location and fetch weather for the SAME GPS coordinates."""
    try:
        location_data = get_location(lat, lon)
        weather_data = fetch_weather(lat, lon)
        return {
            "location": location_data,
            "weather": weather_data,
        }
    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc))


@app.get("/weather")
def weather(lat: float = None, lon: float = None, city: str = None):
    """Get weather by GPS coordinates or by a city name."""
    try:
        if city and (lat is None or lon is None):
            location_data = search_location(city)
            lat = location_data["latitude"]
            lon = location_data["longitude"]
        elif lat is None or lon is None:
            raise HTTPException(status_code=400, detail="Provide lat/lon or city")
        else:
            location_data = get_location(lat, lon)

        weather_data = fetch_weather(lat, lon)
        return {
            "location": location_data,
            "weather": weather_data,
        }
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc))


@app.get("/api/weather")
def api_weather(lat: float = None, lon: float = None, city: str = None):
    # Backward-compatible alias for the existing frontend.
    return weather(lat, lon, city)


@app.post("/predict")
async def predict_disease(image: UploadFile = File(...)):
    """
    Accepts an image and returns a prediction using the Teachable Machine model.
    Currently runs in DEMO mode unless the model code is uncommented.
    """
    
    # Simulate processing delay
    time.sleep(1.5)
    
    # ---------------------------------------------------------
    # REAL PREDICTION LOGIC (Commented out for now)
    # ---------------------------------------------------------
    # if model is not None:
    #     try:
    #         # Read the image file
    #         contents = await image.read()
    #         img = Image.open(io.BytesIO(contents)).convert("RGB")
    #         
    #         # Resize image to match model's expected input (224x224)
    #         size = (224, 224)
    #         img = img.resize(size, Image.Resampling.LANCZOS)
    #         
    #         # Turn the image into a numpy array
    #         image_array = np.asarray(img)
    #         
    #         # Normalize the image
    #         normalized_image_array = (image_array.astype(np.float32) / 127.5) - 1
    #         
    #         # Load the image into the array
    #         data = np.ndarray(shape=(1, 224, 224, 3), dtype=np.float32)
    #         data[0] = normalized_image_array
    #         
    #         # Predict
    #         prediction = model.predict(data)
    #         index = np.argmax(prediction)
    #         class_name = class_names[index].strip()
    #         confidence = prediction[0][index]
    #         
    #         return {
    #             "disease": class_name[2:] if class_name.startswith(str(index)) else class_name, # Removes index from label if present
    #             "confidence": float(confidence),
    #             "is_demo": False
    #         }
    #     except Exception as e:
    #         return {"error": str(e)}

    # ---------------------------------------------------------
    # DEMO RESPONSE (Used while model is not connected)
    # ---------------------------------------------------------
    
    # Demo logic based on filename as a simple simulation
    filename = image.filename.lower()
    
    disease_name = "Healthy Crop"
    confidence = 0.98
    
    if "wheat" in filename:
        disease_name = "Wheat Rust"
        confidence = 0.87
    elif "tomato" in filename:
        disease_name = "Tomato Early Blight"
        confidence = 0.92
    
    return {
        "disease": disease_name,
        "confidence": confidence,
        "is_demo": True
    }
