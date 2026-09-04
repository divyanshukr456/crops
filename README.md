# Crop Disease Detection

This project keeps browser ML, the website, and FastAPI separate. The browser evaluates the supplied Teachable Machine model, sends its label and confidence to FastAPI, and FastAPI matches that prediction against the JSON disease database.

## Project layout

```text
crop_disease_detection/
├── frontend/                 # HTML, CSS, browser JavaScript, model/
└── backend/
    ├── main.py               # FastAPI routes, including POST /predict
    ├── database_service.py   # JSON database loading and matching
    └── database/             # Supplied crop disease JSON files
```

## Requirements

Python 3.10+ is sufficient for the API. The browser loads the TensorFlow.js model directly from `frontend/model/`; no TensorFlow or model conversion is required on the backend.

## Start the backend

Open a terminal in `crop_disease_detection/backend` and run:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

## Start the frontend

In a second terminal, run from `frontend`:

```powershell
python -m http.server 8080
```

Then open `http://127.0.0.1:8080`. Do not open `index.html` with `file://`.

## API

`POST http://127.0.0.1:8000/predict` accepts JSON containing `label`, `crop`, `disease`, and `confidence`. It returns the matching database fields dynamically; fields absent from the JSON are omitted.

Successful responses include the actual model confidence plus crop, disease, and only the information fields present in the JSON database. Low-confidence predictions and missing database matches return a safe response instead of invented advice.

## Validation limitation

The included model has 45 crop/disease classes and no dedicated non-crop/background class. The frontend therefore performs a conservative image-quality and plant-like-color gate, then applies the configurable confidence threshold before contacting FastAPI. This rejects many blank, unclear, and obviously unrelated images, but no classifier-only approach can guarantee rejection of every car, person, animal, or object. For reliable non-crop detection, retrain the existing model with a background/non-crop class; the supplied model itself is not replaced.

The threshold is configured once with `CROP_CONFIDENCE_THRESHOLD` (default `0.70`) and is enforced by FastAPI as well as the browser.
