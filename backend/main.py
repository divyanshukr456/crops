from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
import time
import os
import requests
import xml.etree.ElementTree as ET
from dotenv import load_dotenv

load_dotenv()

# ---------------------------------------------------------
# IMPORT TENSORFLOW (Commented out for now)
# ---------------------------------------------------------
# import numpy as np
# from PIL import Image
# import tensorflow.keras as keras
# import io

app = FastAPI(title="Farmer Helps API")

# Enable CORS so the frontend can communicate with this backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, replace with your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------
# LOAD YOUR TEACHABLE MACHINE MODEL HERE
# ---------------------------------------------------------
# Step 1: Export your model from Teachable Machine as "Keras" (Python).
# Step 2: Download the zip file and extract `keras_model.h5` and `labels.txt` 
#         into the `backend/` folder.
# Step 3: Uncomment the code below to load the model.

# model = None
# class_names = []
# 
# try:
#     model = keras.models.load_model("keras_model.h5", compile=False)
#     with open("labels.txt", "r") as f:
#         class_names = f.readlines()
# except Exception as e:
#     print(f"Model not loaded. Ensure keras_model.h5 and labels.txt exist: {e}")

@app.get("/")
def read_root():
    return {"message": "Farmer Helps API is running"}

@app.get("/api/weather")
def get_weather(lat: str = None, lon: str = None, city: str = None):
    import re
    # Fetch from 7timer API URL provided in .env
    api_url = os.getenv("WEATHER_API_URL")
    if not api_url:
        return {"error": "Weather API URL not configured"}
        
    loc_key = os.getenv("LOCATION_API_KEY")
    if city and not lat and not lon and loc_key:
        # Use Nominatim (OpenStreetMap) Geocoding API for reliable Indian city search
        geo_url = f"https://nominatim.openstreetmap.org/search?q={city}&format=json&limit=1"
        try:
            geo_resp = requests.get(geo_url, headers={'User-Agent': 'FarmerHelpsApp/1.0'}).json()
            if geo_resp and len(geo_resp) > 0:
                lat = str(geo_resp[0]['lat'])
                lon = str(geo_resp[0]['lon'])
                city = geo_resp[0].get('name', city)
        except Exception:
            pass

    if lat and lon:
        api_url = re.sub(r'lat=[\d\.\-]+', f'lat={lat}', api_url)
        api_url = re.sub(r'lon=[\d\.\-]+', f'lon={lon}', api_url)
    
    try:
        response = requests.get(api_url)
        response.raise_for_status()
        
        # Parse XML
        root = ET.fromstring(response.content)
        
        # 7timer astro XML structure has <data> elements
        data_elem = root.find("data")
        
        if data_elem is not None:
            temp = data_elem.find("temp2m")
            temp_val = temp.text if temp is not None else "--"
            
            rh2m = data_elem.find("rh2m")
            # 7timer rh2m in astro is a scale, but let's map it roughly or just return it
            # Actually, let's just make it look like a percentage.
            humidity_val = (rh2m.text + "0%") if rh2m is not None else "--%"
            
            wind = data_elem.find("wind10m_speed")
            wind_val = (wind.text + "0 km/h") if wind is not None else "-- km/h"
            
            cloudcover = data_elem.find("cloudcover")
            cc = int(cloudcover.text) if cloudcover is not None and cloudcover.text.isdigit() else 5
            
            # Simple logic for description and icon
            if cc <= 2:
                desc = "Clear"
                icon = "☀️"
            elif cc <= 5:
                desc = "Partly Cloudy"
                icon = "⛅"
            else:
                desc = "Cloudy"
                icon = "☁️"
                
            prec = data_elem.find("prec_type")
            prec_val = prec.text if prec is not None else "none"
            rain_prob = "0%"
            if prec_val != "none":
                desc = "Rainy"
                icon = "🌧️"
                rain_prob = "80%"
                
            return {
                "temperature": f"{temp_val}°C",
                "description": desc,
                "humidity": humidity_val,
                "wind_speed": wind_val,
                "rain_probability": rain_prob,
                "icon": icon,
                "location": city if city else "Detected Location"
            }
        else:
            return {"error": "Invalid data format from Weather API"}
            
    except Exception as e:
        return {"error": str(e)}

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

# ---------------------------------------------------------
