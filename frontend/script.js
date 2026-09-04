// Wait for DOM to load
document.addEventListener('DOMContentLoaded', () => {

    // --- Language Switching System ---
    const langSelector = document.getElementById('main-lang-selector');
    
    function applyLanguage(lang) {
        if (!window.translations || !window.translations[lang]) return;
        
        const elements = document.querySelectorAll('[data-i18n]');
        elements.forEach(el => {
            const key = el.getAttribute('data-i18n');
            if (window.translations[lang][key]) {
                el.innerHTML = window.translations[lang][key];
            }
        });

        const placeholders = document.querySelectorAll('[data-i18n-placeholder]');
        placeholders.forEach(el => {
            const key = el.getAttribute('data-i18n-placeholder');
            if (window.translations[lang][key]) {
                el.placeholder = window.translations[lang][key];
            }
        });

        // Set active language on the dropdown
        if (langSelector) {
            langSelector.value = lang;
        }

        // Save preference
        localStorage.setItem('farmer_helps_lang', lang);
    }

    // Initialize Language
    const savedLang = localStorage.getItem('farmer_helps_lang') || 'en';
    
    // Make applyLanguage globally available
    window.applyLanguage = applyLanguage;
    
    if (window.translations) {
        applyLanguage(savedLang);
    }

    if (langSelector) {
        langSelector.addEventListener('change', (e) => {
            applyLanguage(e.target.value);
            
            // Sync with voice assistant language if present
            const voiceLang = e.target.value === 'hi' ? 'hi-IN' : 'en-IN';
            localStorage.setItem('farmer_voice_lang', voiceLang);
            const voiceBtn = document.getElementById(e.target.value === 'hi' ? 'lang-hi' : 'lang-en');
            if (voiceBtn) voiceBtn.click();
        });
    }
    
    // --- Mobile Hamburger Menu ---
    const hamburger = document.getElementById('hamburger');
    const navMenu = document.getElementById('nav-menu');
    const navLinks = document.querySelectorAll('.nav-link');

    // Toggle menu on click
    hamburger.addEventListener('click', () => {
        hamburger.classList.toggle('active');
        navMenu.classList.toggle('active');
        document.body.classList.toggle('no-scroll');
    });

    // Close menu when a link is clicked
    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            hamburger.classList.remove('active');
            navMenu.classList.remove('active');
            document.body.classList.remove('no-scroll');
        });
    });



    // --- Back to Top Button ---
    const backToTopBtn = document.getElementById('backToTop');

    window.addEventListener('scroll', () => {
        // Show button when scrolled down 300px
        if (window.scrollY > 300) {
            backToTopBtn.classList.add('visible');
        } else {
            backToTopBtn.classList.remove('visible');
        }
    });

    // Scroll to top on click
    backToTopBtn.addEventListener('click', () => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    });

    // --- CONFIGURATION ---
    // SECURITY WARNING: In a production environment, never expose real API keys here.
    // Use a backend proxy server to securely fetch data from external APIs.
    const CONFIG = {
        DISEASE_API_URL: "http://127.0.0.1:8000/predict", // Pointing to local FastAPI backend
        WEATHER_API_URL: "http://127.0.0.1:8000/api/weather",
        MANDI_API_URL: "http://127.0.0.1:8000/api/mandi",
        SCHEMES_API_URL: "http://127.0.0.1:8000/api/schemes",
        HELPLINES_API_URL: "http://127.0.0.1:8000/api/helplines"
    };

    // --- Toast Notification System ---
    function showToast(message, type = 'info') {
        const toastContainer = document.getElementById('toast-container');
        if (!toastContainer) return;
        
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        // Icon based on type
        let icon = 'ℹ️';
        if (type === 'success') icon = '✅';
        if (type === 'error') icon = '❌';
        if (type === 'warning') icon = '⚠️';
        
        toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;
        toastContainer.appendChild(toast);
        
        // Auto remove after 3 seconds
        setTimeout(() => {
            toast.classList.add('fade-out');
            setTimeout(() => {
                if (toastContainer.contains(toast)) {
                    toastContainer.removeChild(toast);
                }
            }, 400); // Wait for animation
        }, 3000);
    }

    // --- Scroll Animations ---
    const observerOptions = {
        threshold: 0.1,
        rootMargin: "0px 0px -50px 0px"
    };

    const fadeObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                fadeObserver.unobserve(entry.target);
            }
        });
    }, observerOptions);

    // Attach to all sections
    document.querySelectorAll('.section').forEach(section => {
        section.classList.add('fade-up-element');
        fadeObserver.observe(section);
    });

    // --- AI Crop Disease Detector (FastAPI + model + disease database flow) ---
    const uploadArea = document.getElementById('ai-upload-area');
    const previewArea = document.getElementById('ai-preview-area');
    const loadingArea = document.getElementById('ai-loading-area');
    const resultArea = document.getElementById('ai-result-area');
    
    const btnChooseImage = document.getElementById('btn-choose-image');
    const imageUploadInput = document.getElementById('image-upload');
    const imagePreview = document.getElementById('image-preview');
    const imageScanning = document.getElementById('image-scanning');
    const btnClosePreview = document.getElementById('btn-close-preview');
    const btnAnalyze = document.getElementById('btn-analyze');
    const btnResetDetector = document.getElementById('btn-reset-detector');

    let selectedImageFile = null;
    const CONFIDENCE_THRESHOLD = 0.70;
    let teachableModelPromise = null;

    function getTeachableModel() {
        if (!teachableModelPromise) {
            teachableModelPromise = tmImage.load('./model/model.json', './model/metadata.json');
        }
        return teachableModelPromise;
    }

    // The model labels are the source of truth. Crop groups are inferred from
    // Healthy(Crop) labels, so adding/retraining classes does not require a
    // disease-specific if/else list in the frontend.
    function parseModelLabel(label, classIndex, labels) {
        const starts = labels.map((value, index) => {
            const match = value.trim().match(/^healthy\((.+)\)$/i);
            return match ? { index, crop: match[1].trim() } : null;
        }).filter(Boolean);
        const group = [...starts].reverse().find(item => item.index <= classIndex);
        let disease = label.trim().replace(/[0-9]+\s*$/, '').trim();
        const prefixed = disease.split(/___|::|\|/);
        if (prefixed.length > 1) {
            return { crop: prefixed[0].trim(), disease: prefixed.slice(1).join(' ').trim() };
        }
        if (/^healthy\(/i.test(disease) || (group && disease.toLowerCase() === group.crop.toLowerCase())) {
            disease = 'Healthy';
        }
        return { crop: group?.crop || null, disease };
    }

    function clearDetectionResult() {
        resultArea.style.display = 'none';
        document.getElementById('result-card').style.display = 'none';
        document.getElementById('ai-validation-message').style.display = 'none';
        ['res-crop', 'res-disease', 'res-confidence', 'confidence-value', 'res-severity', 'res-explanation', 'res-action', 'res-prevention'].forEach(id => {
            const node = document.getElementById(id);
            if (node) node.textContent = '—';
        });
        document.querySelectorAll('#result-card p').forEach(node => { node.style.display = ''; });
        document.getElementById('res-progress').value = 0;
        document.getElementById('res-progress').style.width = '0%';
    }

    function showValidationError(message = '⚠️ Please enter crop image only.') {
        clearDetectionResult();
        resultArea.style.display = 'block';
        document.getElementById('ai-validation-message').textContent = message;
        document.getElementById('ai-validation-message').style.display = 'block';
    }

    // This is a conservative content check, not a second ML classifier. It
    // rejects blank/flat images and images with no plausible plant/soil/foliage
    // colors before the database is contacted. The supplied model has no
    // explicit background class, so arbitrary objects cannot be guaranteed to
    // be rejected by classification confidence alone.
    async function passesImageGate(image) {
        if (!image.naturalWidth || !image.naturalHeight) return false;
        const canvas = document.createElement('canvas');
        canvas.width = canvas.height = 64;
        const context = canvas.getContext('2d', { willReadFrequently: true });
        context.drawImage(image, 0, 0, 64, 64);
        const pixels = context.getImageData(0, 0, 64, 64).data;
        let varied = 0;
        let plantLike = 0;
        let greenLeaf = 0;
        let yellowLeaf = 0;
        for (let i = 0; i < pixels.length; i += 4) {
            const r = pixels[i], g = pixels[i + 1], b = pixels[i + 2];
            const max = Math.max(r, g, b), min = Math.min(r, g, b);
            if (max - min > 18) varied++;
            const green = g > r * 1.08 && g > b * 1.05 && g > 45;
            const yellow = r > 80 && g > 70 && b < 90 && Math.abs(r - g) < 70;
            const soil = r > b * 1.25 && g > b * 1.05 && r > 45 && g > 25;
            const leafOrFruit = green || yellow || soil || (r > 90 && g > 35 && b < 80);
            if (green) greenLeaf++;
            if (yellow) yellowLeaf++;
            if (leafOrFruit) plantLike++;
        }
        const variedRatio = varied / 4096;
        const plantRatio = plantLike / 4096;
        const greenRatio = greenLeaf / 4096;
        const yellowRatio = yellowLeaf / 4096;
        // A crop photo should contain actual foliage evidence, not only a
        // similarly colored object/background. This deliberately errs on the
        // side of asking for another image rather than showing a false result.
        const hasFoliageEvidence = greenRatio >= 0.10 || (greenRatio >= 0.045 && yellowRatio >= 0.08);
        return variedRatio >= 0.12 && plantRatio >= 0.16 && hasFoliageEvidence;
    }

    if (btnChooseImage) {
        btnChooseImage.addEventListener('click', () => {
            imageUploadInput.click();
        });
    }

    if (imageUploadInput) {
        imageUploadInput.addEventListener('change', (e) => {
            if (e.target.files && e.target.files[0]) {
                selectedImageFile = e.target.files[0];
                const reader = new FileReader();
                
                reader.onload = (event) => {
                    imagePreview.src = event.target.result;
                    imageScanning.src = event.target.result;
                    
                    // Switch to preview mode
                    uploadArea.style.display = 'none';
                    previewArea.style.display = 'block';
                    loadingArea.style.display = 'none';
                    resultArea.style.display = 'none';
                };
                
                reader.readAsDataURL(selectedImageFile);
            }
        });
    }

    if (btnClosePreview) {
        btnClosePreview.addEventListener('click', () => {
            selectedImageFile = null;
            imageUploadInput.value = "";
            uploadArea.style.display = 'block';
            previewArea.style.display = 'none';
            loadingArea.style.display = 'none';
            resultArea.style.display = 'none';
        });
    }

    if (btnAnalyze) {
        btnAnalyze.addEventListener('click', async () => {
            if (!selectedImageFile) return;
            
            // Show loading state
            const currentLang = localStorage.getItem('farmer_helps_lang') || 'en';
            btnAnalyze.innerHTML = window.translations ? window.translations[currentLang]['ai.btn.loading'] : '⏳ Analyzing...';
            
            // Show loading animation
            previewArea.style.display = 'none';
            loadingArea.style.display = 'block';
            clearDetectionResult();
            
            try {
                const model = await getTeachableModel();
                if (!(await passesImageGate(imagePreview))) {
                    throw new Error('Please enter crop image only. Upload a clear image of a supported crop or plant.');
                }
                const predictions = await model.predict(imagePreview, false);
                const best = predictions.reduce((winner, current) => current.probability > winner.probability ? current : winner);
                if (best.probability < CONFIDENCE_THRESHOLD) {
                    throw new Error('Please enter crop image only. Upload a clearer image of a supported crop or plant.');
                }
                const classIndex = predictions.indexOf(best);
                const parsed = parseModelLabel(best.className, classIndex, model.getClassLabels());
                const response = await fetch(CONFIG.DISEASE_API_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ label: best.className, crop: parsed.crop, disease: parsed.disease, confidence: best.probability })
                });
                const payload = await response.json();
                if (!response.ok || !payload.success) {
                    throw new Error(payload.detail?.message || payload.message || 'Unable to analyze this image.');
                }

                const confidence = Math.round(payload.confidence * 100);
                loadingArea.style.display = 'none';
                resultArea.style.display = 'block';
                document.getElementById('ai-validation-message').style.display = payload.database_match ? 'none' : 'block';
                if (!payload.database_match) {
                    document.getElementById('ai-validation-message').textContent = 'Information not available for this crop/disease yet.';
                }
                document.getElementById('result-card').style.display = 'grid';
                document.getElementById('res-confidence').textContent = confidence;
                document.getElementById('confidence-value').textContent = confidence + '%';
                document.getElementById('res-disease').textContent = payload.database_match ? payload.disease : 'Information Not Available';
                document.getElementById('res-crop').textContent = payload.crop || '—';
                const setResultField = (id, value, fallback = '—') => {
                    const node = document.getElementById(id);
                    node.textContent = Array.isArray(value) ? value.join(' • ') : (value || fallback);
                    node.closest('p').style.display = value ? '' : 'none';
                };
                setResultField('res-severity', payload.severity);
                setResultField('res-explanation', payload.description || payload.symptoms, payload.database_match ? 'No description supplied.' : payload.message);
                setResultField('res-action', payload.recommended_action || payload.treatment);
                setResultField('res-prevention', payload.prevention);
                const progress = document.getElementById('res-progress');
                progress.value = confidence;
                progress.style.width = confidence + '%';

            } catch (error) {
                console.error("Crop disease prediction error:", error);
                loadingArea.style.display = 'none';
                showValidationError(error.message || '⚠️ Please enter crop image only.');
                showToast(error.message || 'Unable to analyze this image.', 'error');
                btnAnalyze.innerHTML = window.translations ? window.translations[currentLang]['ai.btn.analyze'] : '🔍 Analyze Image';
            }
        });
    }

    if (btnResetDetector) {
        btnResetDetector.addEventListener('click', () => {
            selectedImageFile = null;
            imageUploadInput.value = "";
            uploadArea.style.display = 'block';
            previewArea.style.display = 'none';
            loadingArea.style.display = 'none';
            resultArea.style.display = 'none';
            
            const currentLang = localStorage.getItem('farmer_helps_lang') || 'en';
            if (btnAnalyze) {
                btnAnalyze.innerHTML = window.translations ? window.translations[currentLang]['ai.btn.analyze'] : '🔍 Analyze Image';
            }
        });
    }

    // --- Elegant Location Detection Feature ---
    const btnDetectLocation = document.getElementById('btn-detect-location');
    const locationErrorMsg = document.getElementById('location-error-msg');
    const fullLocationCard = document.getElementById('full-location-card');

    if (btnDetectLocation) {
        btnDetectLocation.addEventListener('click', detectMyLocation);
    }

    function showError(msg) {
        locationErrorMsg.textContent = msg;
        locationErrorMsg.style.display = 'block';
        fullLocationCard.style.display = 'none';
        btnDetectLocation.textContent = "📍 Detect My Location";
        btnDetectLocation.disabled = false;
    }

    function hideError() {
        locationErrorMsg.style.display = 'none';
    }

    function setCardValue(id, value, rowId) {
        const el = document.getElementById(id);
        const row = document.getElementById(rowId);
        if (value && value.trim() !== '') {
            if (el) el.textContent = value;
            if (row) row.style.display = 'flex';
        } else {
            if (row) row.style.display = 'none';
        }
    }

    async function fetchWeather(lat, lon, locationData) {
        try {
            // Update UI to loading state
            const locEl = document.getElementById('weather-location');
            const condEl = document.getElementById('weather-condition');
            if (locEl) locEl.textContent = "📍 Detecting location...";
            if (condEl) condEl.textContent = "⏳ Loading weather...";

            const response = await fetch(`${CONFIG.WEATHER_API_URL}?lat=${lat}&lon=${lon}`);
            if (!response.ok) {
                throw new Error("Weather API error");
            }
            
            const data = await response.json();
            console.log("Weather response:", data);
            
            const weather = data.weather;
            
            // Update UI
            if (locEl) {
                let locStr = locationData.city || locationData.district || locationData.state || "Unknown Location";
                if (locationData.state && locStr !== locationData.state) {
                    locStr += `, ${locationData.state}`;
                }
                locEl.textContent = `📍 ${locStr}`;
            }
            
            // Update temp
            let tempStr = weather.temperature || ""; // e.g. "28°C"
            const tempEl = document.getElementById('weather-temp');
            const unitEl = document.getElementById('weather-unit');
            if (tempEl && unitEl) {
                if (tempStr.includes("°")) {
                    let parts = tempStr.split("°");
                    tempEl.textContent = parts[0] + "°";
                    unitEl.textContent = parts[1];
                } else {
                    tempEl.textContent = tempStr;
                    unitEl.textContent = "";
                }
            }
            
            if (condEl) condEl.textContent = weather.description || "Unknown";
            
            const iconEl = document.getElementById('weather-icon');
            if (iconEl) iconEl.textContent = weather.icon || "☁️";
            
            const humEl = document.getElementById('weather-humidity');
            if (humEl) humEl.textContent = weather.humidity || "--%";
            
            const windEl = document.getElementById('weather-wind');
            if (windEl) windEl.textContent = weather.wind_speed || "-- km/h";
            
            const rainEl = document.getElementById('weather-rain');
            if (rainEl) rainEl.textContent = weather.rain_probability || "0%";
            
            // Update Forecast
            if (weather.forecast && weather.forecast.length > 0) {
                const forecastGrid = document.getElementById('weather-forecast-grid');
                if (forecastGrid) {
                    forecastGrid.innerHTML = "";
                    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
                    const today = new Date().getDay();
                    
                    weather.forecast.forEach((day_data) => {
                        const dayName = days[(today + day_data.day_index) % 7];
                        const dayEl = document.createElement("div");
                        dayEl.className = "forecast-day";
                        dayEl.innerHTML = `
                            <span class="f-day">${dayName}</span>
                            <span class="f-icon">${day_data.icon}</span>
                            <span class="f-temp">${day_data.max_temp}° / ${day_data.min_temp}°</span>
                        `;
                        forecastGrid.appendChild(dayEl);
                    });
                }
            }

        } catch (error) {
            console.error("Weather fetch error:", error);
            const locEl = document.getElementById('weather-location');
            const condEl = document.getElementById('weather-condition');
            if (locEl) locEl.textContent = "🌦️ Location detected";
            if (condEl) condEl.textContent = "Weather information currently unavailable.";
        }
    }

    function detectMyLocation() {
        hideError();
        fullLocationCard.style.display = 'none';
        btnDetectLocation.disabled = true;
        const currentLang = localStorage.getItem('farmer_helps_lang') || 'en';
        btnDetectLocation.textContent = window.translations ? window.translations[currentLang]['weather.btn.loading'] : "⏳ Detecting Location...";

        if (!navigator.geolocation) {
            showError("❌ Geolocation is not supported by your browser.");
            return;
        }

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const lat = position.coords.latitude;
                const lon = position.coords.longitude;

                try {
                    // Fetch reverse geocoding from Nominatim API
                    const response = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&addressdetails=1`, {
                        headers: {
                            'Accept-Language': 'en-US,en;q=0.9'
                        }
                    });

                    if (!response.ok) {
                        throw new Error("Network response was not ok");
                    }

                    const data = await response.json();
                    
                    if (data.error) {
                        throw new Error(data.error);
                    }

                    const address = data.address || {};

                    // Extract fields with fallback logic
                    const city = address.city || address.town || address.municipality || address.village || "";
                    const area = address.neighbourhood || address.suburb || address.quarter || address.residential || "";
                    const street = address.road || address.pedestrian || address.footway || "";
                    const district = address.city_district || address.district || address.county || "";
                    const pin = address.postcode || "";
                    const state = address.state || "";
                    const country = address.country || "";
                    
                    // Near Location logic (e.g. village, suburb, landmark if not already used in area)
                    let near = "";
                    if (!area && address.suburb) near = address.suburb;
                    else if (address.hamlet) near = address.hamlet;
                    else if (address.locality) near = address.locality;
                    else if (address.village && address.village !== city) near = address.village;
                    
                    // Set Global Variables for Future Weather Integration
                    window.detectedLocation = {
                        latitude: lat,
                        longitude: lon,
                        city: city,
                        state: state,
                        postcode: pin,
                        country: country
                    };

                    // Populate UI Card
                    const displayNameEl = document.getElementById('loc-display-name');
                    if (displayNameEl) {
                        displayNameEl.textContent = city || district || state || "Unknown Location";
                    }
                    
                    const stateCountryEl = document.getElementById('loc-state-country');
                    if (stateCountryEl) {
                        stateCountryEl.textContent = [state, country].filter(Boolean).join(", ");
                    }

                    setCardValue('loc-area', area, 'loc-row-area');
                    setCardValue('loc-street', street, 'loc-row-street');
                    setCardValue('loc-pin', pin, 'loc-row-pin');
                    setCardValue('loc-city', city, 'loc-row-city');
                    setCardValue('loc-district', district, 'loc-row-district');
                    setCardValue('loc-state', state, 'loc-row-state');
                    setCardValue('loc-near', near, 'loc-row-near');
                    
                    const coordsEl = document.getElementById('loc-coords');
                    if (coordsEl) {
                        coordsEl.textContent = `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
                    }

                    // Show Success Card
                    fullLocationCard.style.display = 'block';
                    
                    // Button Success State
                    const currentLang = localStorage.getItem('farmer_helps_lang') || 'en';
                    btnDetectLocation.innerHTML = window.translations ? window.translations[currentLang]['weather.btn.detected'] : '✅ Location Detected';
                    
                    // Reset Button text after 3 seconds
                    setTimeout(() => {
                        btnDetectLocation.disabled = false;
                        btnDetectLocation.textContent = "📍 Detect My Location";
                    }, 3000);

                    // Fetch weather automatically
                    console.log("Detected coordinates:", lat, lon);
                    console.log("Detected location:", window.detectedLocation);
                    fetchWeather(lat, lon, window.detectedLocation);

                } catch (error) {
                    console.error("Reverse geocoding error:", error);
                    showError("❌ We detected your coordinates but couldn't find the address.");
                }
            },
            (error) => {
                console.error("Geolocation error:", error);
                switch(error.code) {
                    case error.PERMISSION_DENIED:
                        showError("❌ Location permission denied. Please allow location access.");
                        break;
                    case error.POSITION_UNAVAILABLE:
                        showError("❌ Unable to determine your location.");
                        break;
                    case error.TIMEOUT:
                        showError("⏱️ Location request timed out. Please try again.");
                        break;
                    default:
                        showError("❌ An unknown error occurred while detecting location.");
                        break;
                }
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0
            }
        );
    }

    // --- Elegant Mandi / Market Rates Feature (Mock) ---
    const mandiSearchInput = document.getElementById('mandi-search-mock');
    const mandiCropFilter = document.getElementById('mandi-crop-mock');
    const mandiStateFilter = document.getElementById('mandi-state-mock');
    const mandiDistrictFilter = document.getElementById('mandi-district-mock');
    const mandiTbody = document.getElementById('mandi-tbody-mock');

    // Hardcoded mock data for Elegant Theme
    const mockMandiData = [
        { crop: "Tomato", mandi: "Nashik", state: "Maharashtra", price: 2400, trend: "up" },
        { crop: "Tomato", mandi: "Pune", state: "Maharashtra", price: 2600, trend: "up" },
        { crop: "Wheat", mandi: "Ludhiana", state: "Punjab", price: 2125, trend: "down" },
        { crop: "Wheat", mandi: "Amritsar", state: "Punjab", price: 2100, trend: "up" },
        { crop: "Cotton", mandi: "Surat", state: "Gujarat", price: 7200, trend: "up" },
        { crop: "Cotton", mandi: "Rajkot", state: "Gujarat", price: 7150, trend: "down" },
        { crop: "Onion", mandi: "Nashik", state: "Maharashtra", price: 1800, trend: "up" },
        { crop: "Rice", mandi: "Ludhiana", state: "Punjab", price: 3200, trend: "up" }
    ];

    function renderMandiTable(data) {
        if (!mandiTbody) return;
        mandiTbody.innerHTML = '';
        
        if (data.length === 0) {
            mandiTbody.innerHTML = `<tr><td colspan="4" style="text-align: center; padding: 20px;">No matching records found.</td></tr>`;
            return;
        }

        data.forEach(item => {
            const row = document.createElement('tr');
            
            const trendHtml = item.trend === 'up' 
                ? `<span class="trend-up">↑ +2.5%</span>` 
                : `<span class="trend-down">↓ -1.2%</span>`;
                
            row.innerHTML = `
                <td><strong>${item.crop}</strong></td>
                <td>${item.mandi}, ${item.state}</td>
                <td><strong>₹${item.price}</strong></td>
                <td>${trendHtml}</td>
            `;
            mandiTbody.appendChild(row);
        });
    }

    function applyMandiFilters() {
        if (!mandiSearchInput || !mandiCropFilter || !mandiStateFilter || !mandiDistrictFilter) return;

        const searchTerm = mandiSearchInput.value.toLowerCase();
        const selectedCrop = mandiCropFilter.value;
        const selectedState = mandiStateFilter.value;
        const selectedDistrict = mandiDistrictFilter.value;

        const filtered = mockMandiData.filter(item => {
            const matchesSearch = item.crop.toLowerCase().includes(searchTerm) || item.mandi.toLowerCase().includes(searchTerm);
            const matchesCrop = selectedCrop === "" || item.crop === selectedCrop;
            const matchesState = selectedState === "" || item.state === selectedState;
            const matchesDistrict = selectedDistrict === "" || item.mandi === selectedDistrict;
            return matchesSearch && matchesCrop && matchesState && matchesDistrict;
        });

        renderMandiTable(filtered);
    }

    if (mandiSearchInput) {
        mandiSearchInput.addEventListener('input', applyMandiFilters);
        mandiCropFilter.addEventListener('change', applyMandiFilters);
        mandiStateFilter.addEventListener('change', applyMandiFilters);
        mandiDistrictFilter.addEventListener('change', applyMandiFilters);
        
        // Initial load
        renderMandiTable(mockMandiData);
    }

    // --- Government Schemes Feature ---
    // (Now handled entirely via static HTML to match the Elegant Theme)

    // --- Voice Assistant Feature ---
    const voiceFab = document.getElementById('voice-fab');
    const voiceOverlay = document.getElementById('voice-overlay');
    const voiceClose = document.getElementById('voice-close');
    const langEnBtn = document.getElementById('lang-en');
    const langHiBtn = document.getElementById('lang-hi');
    const voiceStartBtn = document.getElementById('voice-start-btn');
    const voiceStatus = document.getElementById('voice-status');
    const voiceText = document.getElementById('voice-text');
    const voiceUnsupported = document.getElementById('voice-unsupported');
    
    // Initialize Speech Recognition
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    let recognition = null;
    let isListening = false;

    // Load language preference from localStorage, default to Hindi
    let currentLang = localStorage.getItem('farmer_voice_lang') || 'hi-IN';

    // Update Language UI
    function updateLangUI() {
        if (currentLang === 'en-IN') {
            langEnBtn.classList.add('active');
            langHiBtn.classList.remove('active');
        } else {
            langHiBtn.classList.add('active');
            langEnBtn.classList.remove('active');
        }
    }
    updateLangUI();

    // Language Toggle Listeners
    langEnBtn.addEventListener('click', () => {
        currentLang = 'en-IN';
        localStorage.setItem('farmer_voice_lang', currentLang);
        updateLangUI();
        if (recognition) recognition.lang = currentLang;
    });

    langHiBtn.addEventListener('click', () => {
        currentLang = 'hi-IN';
        localStorage.setItem('farmer_voice_lang', currentLang);
        updateLangUI();
        if (recognition) recognition.lang = currentLang;
    });

    // Setup Recognition
    if (SpeechRecognition) {
        recognition = new SpeechRecognition();
        recognition.continuous = false; // Stop after a single sentence
        recognition.interimResults = true; // Show results while speaking
        recognition.lang = currentLang;

        recognition.onstart = () => {
            isListening = true;
            voiceStartBtn.classList.add('listening');
            voiceStatus.textContent = currentLang === 'hi-IN' ? "सुन रहा हूँ..." : "Listening...";
            voiceText.textContent = "";
        };

        recognition.onresult = async (event) => {
            let transcript = '';
            for (let i = event.resultIndex; i < event.results.length; i++) {
                transcript += event.results[i][0].transcript;
            }
            transcript = transcript.trim();
            voiceText.textContent = `"${transcript}"`;

            const last = event.results[event.results.length - 1];
            if (last.isFinal && transcript) {
                await askGemini(transcript);
            }
        };

        recognition.onerror = (event) => {
            console.error("Speech recognition error:", event.error);
            isListening = false;
            voiceStartBtn.classList.remove('listening');
            voiceStatus.textContent = currentLang === 'hi-IN' ? "त्रुटि हुई। कृपया पुनः प्रयास करें।" : "Error occurred. Please try again.";
        };

        recognition.onend = () => {
            isListening = false;
            voiceStartBtn.classList.remove('listening');
            if (voiceStatus.textContent === "सुन रहा हूँ..." || voiceStatus.textContent === "Listening...") {
                voiceStatus.textContent = currentLang === 'hi-IN' ? "सुनना बंद किया" : "Stopped listening";
            }
        };
    } else {
        voiceStartBtn.disabled = true;
        voiceStartBtn.style.opacity = '0.5';
        voiceUnsupported.style.display = 'block';
    }

    // Overlay Controls
    voiceFab.addEventListener('click', () => {
        voiceOverlay.classList.add('active');
        voiceText.textContent = currentLang === 'hi-IN' 
            ? `"मौसम, मंडी भाव या फसल की बीमारी के बारे में पूछें..."` 
            : `"Ask me about weather, mandi rates, or crop diseases..."`;
        voiceStatus.textContent = currentLang === 'hi-IN' ? "बोलने के लिए माइक दबाएं" : "Click microphone to speak";
    });

    voiceClose.addEventListener('click', () => {
        voiceOverlay.classList.remove('active');
        if (isListening && recognition) {
            recognition.stop();
        }
        if ("speechSynthesis" in window) {
            window.speechSynthesis.cancel();
        }
    });

    // Toggle Listening
    voiceStartBtn.addEventListener('click', () => {
        if (!recognition) return;
        
        if (isListening) {
            recognition.stop();
        } else {
            try {
                recognition.lang = currentLang; // Ensure correct lang is set
                recognition.start();
            } catch (err) {
                console.error("Failed to start recognition", err);
            }
        }
    });

    async function askGemini(question) {
        voiceStatus.textContent = currentLang === 'hi-IN'
            ? "🤖 Gemini जवाब तैयार कर रहा है..."
            : "🤖 Gemini is preparing your answer...";

        try {
            const response = await fetch("http://127.0.0.1:8000/api/voice", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    message: question,
                    language: currentLang,
                    context: "Farmer Helps agricultural assistant"
                })
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.detail || "Voice API request failed");

            const answer = data.answer || "No answer received.";
            voiceText.textContent = answer;
            voiceStatus.textContent = currentLang === 'hi-IN' ? "✅ जवाब मिल गया" : "✅ Answer received";

            if ("speechSynthesis" in window) {
                window.speechSynthesis.cancel();
                const utterance = new SpeechSynthesisUtterance(answer);
                utterance.lang = currentLang;
                utterance.rate = 0.95;
                window.speechSynthesis.speak(utterance);
            }
        } catch (error) {
            console.error("Gemini voice error:", error);
            voiceText.textContent = currentLang === 'hi-IN'
                ? "माफ़ कीजिए, अभी जवाब नहीं मिल सका।"
                : "Sorry, I couldn't get an answer right now.";
            voiceStatus.textContent = currentLang === 'hi-IN'
                ? "❌ Voice AI unavailable"
                : "❌ Voice AI unavailable";
        }
    }

    // --- Farmer Helplines Feature ---
    // (Now handled entirely via static HTML CTA to match the Elegant Theme)

    // --- Login / Signup Form Switcher Logic ---
    window.switchTab = function(tab) {
        const loginForm = document.getElementById('login-form');
        const signupForm = document.getElementById('signup-form');
        const loginTab = document.getElementById('login-tab');
        const signupTab = document.getElementById('signup-tab');
        const formTitle = document.getElementById('form-title');

        if (!loginForm) return;

        if (tab === 'login') {
            loginForm.classList.remove('hidden');
            signupForm.classList.add('hidden');
            loginTab.classList.add('active');
            signupTab.classList.remove('active');
            formTitle.textContent = 'Farmer Portal';
        } else {
            loginForm.classList.add('hidden');
            signupForm.classList.remove('hidden');
            signupTab.classList.add('active');
            loginTab.classList.remove('active');
            formTitle.textContent = 'Farmer Registration';
        }
    };

    // Redirect to home website after login/signup
    const loginForm = document.getElementById("login-form");
    const signupForm = document.getElementById("signup-form");

    if (loginForm) {
        loginForm.addEventListener("submit", (e) => {
            e.preventDefault();
            window.location.hash = "#home";
        });
    }

    if (signupForm) {
        signupForm.addEventListener("submit", (e) => {
            e.preventDefault();
            window.location.hash = "#home";
        });
    }

    // --- Feedback Widget Logic ---
    const feedbackBtn = document.getElementById('feedback-btn');
    const feedbackBox = document.getElementById('feedback-box');
    const feedbackClose = document.getElementById('feedback-close');
    const feedbackSubmit = document.getElementById('feedback-submit');
    const feedbackBody = document.querySelector('.feedback-body');
    const feedbackSuccess = document.getElementById('feedback-success');
    const stars = document.querySelectorAll('.feedback-stars span');

    if (feedbackBtn && feedbackBox) {
        feedbackBtn.addEventListener('click', () => {
            feedbackBox.classList.toggle('hidden');
        });

        feedbackClose.addEventListener('click', () => {
            feedbackBox.classList.add('hidden');
        });

        stars.forEach((star, index) => {
            star.addEventListener('click', () => {
                stars.forEach((s, i) => {
                    if (i <= index) s.classList.add('active');
                    else s.classList.remove('active');
                });
            });
        });

        if (feedbackSubmit) {
            feedbackSubmit.addEventListener('click', () => {
                feedbackBody.style.display = 'none';
                feedbackSuccess.classList.remove('hidden');
                setTimeout(() => {
                    feedbackBox.classList.add('hidden');
                    setTimeout(() => {
                        feedbackBody.style.display = 'block';
                        feedbackSuccess.classList.add('hidden');
                        stars.forEach(s => s.classList.remove('active'));
                        document.getElementById('feedback-text').value = '';
                    }, 300);
                }, 2000);
            });
        }
    }

});

function showDiseaseResult(prediction) {

    const diseaseName = prediction.disease;
    const confidence = Math.round(prediction.confidence * 100);

    document.getElementById("res-disease").textContent =
        diseaseName;

    document.getElementById("res-confidence").textContent =
        confidence;

    document.getElementById("confidence-value").textContent =
        confidence + "%";

    document.getElementById("res-progress").style.width =
        confidence + "%";


    // Update circular confidence
    const circle =
        document.querySelector(".confidence-circle");

    circle.style.background =
        `conic-gradient(
            #219653 ${confidence}%,
            #e5eee8 0
        )`;


    // Show result
    document.getElementById("result-card").style.display =
        "grid";
}
