// Wait for DOM to load
document.addEventListener('DOMContentLoaded', () => {
    
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

    // --- AI Crop Disease Detector ---

    const detectorOptions = document.getElementById('detector-options');
    const previewArea = document.getElementById('preview-area');
    const resultCard = document.getElementById('result-card');
    
    // Upload Elements
    const btnTriggerUpload = document.getElementById('btn-trigger-upload');
    const imageUploadInput = document.getElementById('image-upload');
    const imagePreviewWrapper = document.getElementById('image-preview-wrapper');
    const imagePreview = document.getElementById('image-preview');
    const fileNameDisplay = document.getElementById('file-name');
    const btnReplaceImage = document.getElementById('btn-replace-image');
    
    // Camera Elements
    const btnTriggerCamera = document.getElementById('btn-trigger-camera');
    const cameraWrapper = document.getElementById('camera-wrapper');
    const cameraStream = document.getElementById('camera-stream');
    const btnCancelCamera = document.getElementById('btn-cancel-camera');
    const btnCapture = document.getElementById('btn-capture');

    // Analysis Elements
    const btnAnalyze = document.getElementById('btn-analyze');
    const btnResetDetector = document.getElementById('btn-reset-detector');

    let currentStream = null;
    let selectedImageFile = null;

    // Trigger file input
    btnTriggerUpload.addEventListener('click', () => {
        imageUploadInput.click();
    });

    btnReplaceImage.addEventListener('click', () => {
        imageUploadInput.click();
    });

    // Handle file selection
    imageUploadInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files[0]) {
            selectedImageFile = e.target.files[0];
            const reader = new FileReader();
            
            reader.onload = (event) => {
                imagePreview.src = event.target.result;
                fileNameDisplay.textContent = selectedImageFile.name;
                
                // Update UI state
                detectorOptions.style.display = 'none';
                previewArea.style.display = 'block';
                imagePreviewWrapper.style.display = 'block';
                cameraWrapper.style.display = 'none';
                resultCard.style.display = 'none';
            };
            
            reader.readAsDataURL(selectedImageFile);
        }
    });

    // Open Camera
    btnTriggerCamera.addEventListener('click', async () => {
        try {
            currentStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
            cameraStream.srcObject = currentStream;
            
            // Update UI state
            detectorOptions.style.display = 'none';
            previewArea.style.display = 'block';
            cameraWrapper.style.display = 'block';
            imagePreviewWrapper.style.display = 'none';
            resultCard.style.display = 'none';
            
        } catch (error) {
            console.error("Camera access error:", error);
            showToast("Unable to access the camera. Please check permissions.", "error");
        }
    });

    // Stop Camera Stream
    function stopCamera() {
        if (currentStream) {
            currentStream.getTracks().forEach(track => track.stop());
            currentStream = null;
        }
    }

    // Cancel Camera
    btnCancelCamera.addEventListener('click', () => {
        stopCamera();
        detectorOptions.style.display = 'grid';
        previewArea.style.display = 'none';
    });

    // Capture Photo
    btnCapture.addEventListener('click', () => {
        const canvas = document.createElement('canvas');
        canvas.width = cameraStream.videoWidth;
        canvas.height = cameraStream.videoHeight;
        
        const context = canvas.getContext('2d');
        context.drawImage(cameraStream, 0, 0, canvas.width, canvas.height);
        
        // Convert to file
        canvas.toBlob((blob) => {
            selectedImageFile = new File([blob], "camera_capture.jpg", { type: "image/jpeg" });
            
            imagePreview.src = canvas.toDataURL('image/jpeg');
            fileNameDisplay.textContent = "Camera Capture";
            
            stopCamera();
            
            // Switch to preview mode
            cameraWrapper.style.display = 'none';
            imagePreviewWrapper.style.display = 'block';
        }, 'image/jpeg');
    });

    // Analyze Photo
    btnAnalyze.addEventListener('click', async () => {
        if (!selectedImageFile) return;
        
        const originalText = btnAnalyze.textContent;
        btnAnalyze.textContent = "Analyzing...";
        btnAnalyze.disabled = true;
        
        try {
            const result = await predictDisease(selectedImageFile);
            displayResult(result);
        } catch (error) {
            console.error("Analysis failed:", error);
            showToast("Analysis failed. Please try again.", "error");
        } finally {
            btnAnalyze.textContent = originalText;
            btnAnalyze.disabled = false;
        }
    });

    // Reset Detector
    btnResetDetector.addEventListener('click', () => {
        selectedImageFile = null;
        imageUploadInput.value = "";
        
        detectorOptions.style.display = 'grid';
        previewArea.style.display = 'none';
        resultCard.style.display = 'none';
        
        // Scroll back to detector
        document.getElementById('disease-detector').scrollIntoView({ behavior: 'smooth' });
    });

    // AI Prediction Logic
    async function predictDisease(imageFile) {
        // If API URL is empty, use the DEMO result
        if (!CONFIG.DISEASE_API_URL || CONFIG.DISEASE_API_URL.trim() === "") {
            return new Promise((resolve) => {
                setTimeout(() => {
                    resolve({
                        isDemo: true,
                        crop: "Wheat",
                        disease: "Yellow Rust",
                        confidence: "94%",
                        severity: "High",
                        explanation: "Yellow stripes appearing on leaves indicate a fungal infection caused by Puccinia striiformis.",
                        action: "Apply Propiconazole or Tebuconazole fungicide immediately.",
                        prevention: "Use rust-resistant wheat varieties for the next season and ensure proper crop rotation."
                    });
                }, 1500); // Simulate network delay
            });
        }
        
        // Real API Call
        try {
            const formData = new FormData();
            formData.append('image', imageFile);
            
            const response = await fetch(CONFIG.DISEASE_API_URL, {
                method: 'POST',
                body: formData
            });
            
            if (!response.ok) {
                throw new Error("Network response was not ok");
            }
            
            const backendData = await response.json();
            
            // Map FastAPI backend response to UI expected fields
            return {
                isDemo: backendData.is_demo || false,
                crop: backendData.disease.includes(" ") ? backendData.disease.split(" ")[0] : "Crop",
                disease: backendData.disease,
                confidence: (backendData.confidence * 100).toFixed(1) + "%",
                severity: backendData.disease.toLowerCase().includes("healthy") ? "Low" : "High",
                explanation: backendData.disease.toLowerCase().includes("healthy") ? "No signs of disease detected." : "Potential infection detected. Requires attention.",
                action: backendData.disease.toLowerCase().includes("healthy") ? "Continue normal farming practices." : "Consult a local agricultural expert for targeted fungicide application.",
                prevention: "Maintain crop rotation and use disease-resistant seeds."
            };
        } catch (error) {
            console.error("API Error:", error);
            throw error;
        }
    }

    function displayResult(result) {
        // Update UI elements
        document.getElementById('res-crop').textContent = result.crop || 'Unknown';
        document.getElementById('res-disease').textContent = result.disease || 'Unknown';
        document.getElementById('res-confidence').textContent = result.confidence || 'N/A';
        
        const severityEl = document.getElementById('res-severity');
        severityEl.textContent = result.severity || 'Unknown';
        
        // Adjust severity color class
        severityEl.className = 'result-value';
        if (result.severity && result.severity.toLowerCase() === 'high') {
            severityEl.classList.add('danger');
        } else if (result.severity && result.severity.toLowerCase() === 'medium') {
            severityEl.classList.add('warning');
        }

        document.getElementById('res-explanation').textContent = result.explanation || 'No explanation available.';
        document.getElementById('res-action').textContent = result.action || 'No action specified.';
        document.getElementById('res-prevention').textContent = result.prevention || 'No prevention tips available.';
        
        // Show demo badge if applicable
        const demoBadge = document.getElementById('demo-badge');
        if (result.isDemo) {
            demoBadge.style.display = 'block';
        } else {
            demoBadge.style.display = 'none';
        }
        
        // Switch views
        previewArea.style.display = 'none';
        resultCard.style.display = 'block';
    }

    // --- Weather & Location Feature ---
    const btnDetectLocation = document.getElementById('btn-detect-location');
    const weatherLocation = document.getElementById('location');
    const manualLocation = document.getElementById('manual-location');
    const cityInput = document.getElementById('city-input');
    const btnSearchWeather = document.getElementById('btn-search-weather');

    const uiTemp = document.getElementById('weather-temp');
    const uiDesc = document.getElementById('weather-desc');
    const uiHumidity = document.getElementById('weather-humidity');
    const uiWind = document.getElementById('weather-wind');
    const uiRain = document.getElementById('weather-rain');
    const uiIcon = document.getElementById('weather-icon');

    const LOCATION_API_URL = "http://127.0.0.1:8000/location";
    const WEATHER_API_URL = "http://127.0.0.1:8000/weather";

    function setWeatherLoading() {
        uiTemp.textContent = "--°C";
        uiDesc.textContent = "Loading...";
        uiHumidity.textContent = "--%";
        uiWind.textContent = "-- km/h";
        uiRain.textContent = "--";
        uiIcon.textContent = "☁️";
    }

    function showWeatherData(data) {
        const weather = data.weather || {};
        const location = data.location || {};

        weatherLocation.textContent =
            location.display_name ||
            location.city ||
            location.town ||
            "Detected Location";

        uiTemp.textContent = weather.temperature || "--°C";
        uiDesc.textContent = weather.description || "Unknown";
        uiHumidity.textContent = weather.humidity || "--%";
        uiWind.textContent = weather.wind_speed || "-- km/h";
        uiRain.textContent = weather.rain_probability || "--";
        uiIcon.textContent = weather.icon || "☁️";
    }

    async function detectLocationAndWeather() {
        weatherLocation.textContent = "Detecting location...";
        manualLocation.style.display = 'none';
        setWeatherLoading();
        btnDetectLocation.disabled = true;
        btnDetectLocation.textContent = "Detecting...";

        if (!navigator.geolocation) {
            weatherLocation.textContent = "Geolocation not supported";
            manualLocation.style.display = 'block';
            btnDetectLocation.disabled = false;
            btnDetectLocation.textContent = "Detect My Location";
            return;
        }

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const lat = position.coords.latitude;
                const lon = position.coords.longitude;

                try {
                    const response = await fetch(
                        `${LOCATION_API_URL}?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}`
                    );

                    const data = await response.json();

                    if (!response.ok) {
                        throw new Error(data.detail || "Location/weather API failed");
                    }

                    console.log("Location + Weather:", data);
                    showWeatherData(data);
                } catch (error) {
                    console.error("Location/weather error:", error);
                    weatherLocation.textContent = "Could not load location";
                    uiDesc.textContent = "Error loading data";
                    manualLocation.style.display = 'block';
                    showToast("Backend could not fetch location/weather.", "error");
                } finally {
                    btnDetectLocation.disabled = false;
                    btnDetectLocation.textContent = "Detect My Location";
                }
            },
            (error) => {
                console.error("Geolocation error:", error);
                weatherLocation.textContent = "Location permission denied";
                manualLocation.style.display = 'block';
                btnDetectLocation.disabled = false;
                btnDetectLocation.textContent = "Detect My Location";
                showToast("Please allow location access in your browser.", "warning");
            },
            {
                enableHighAccuracy: true,
                timeout: 15000,
                maximumAge: 0
            }
        );
    }

    btnDetectLocation.addEventListener('click', detectLocationAndWeather);

    btnSearchWeather.addEventListener('click', async () => {
        const city = cityInput.value.trim();
        if (!city) {
            showToast("Please enter a city name.", "warning");
            return;
        }

        weatherLocation.textContent = `Searching ${city}...`;
        setWeatherLoading();

        try {
            const response = await fetch(
                `${WEATHER_API_URL}?city=${encodeURIComponent(city)}`
            );
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.detail || "Weather search failed");
            }

            showWeatherData(data);
        } catch (error) {
            console.error("Manual weather error:", error);
            weatherLocation.textContent = "Location not found";
            uiDesc.textContent = "Error loading data";
            showToast("Could not find weather for that city.", "error");
        }
    });

    cityInput.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            btnSearchWeather.click();
        }
    });

    // --- Mandi / Market Rates Feature ---
    const mandiSearchInput = document.getElementById('mandi-search');
    const mandiCropFilter = document.getElementById('mandi-crop-filter');
    const mandiStateFilter = document.getElementById('mandi-state-filter');
    const mandiSort = document.getElementById('mandi-sort');
    const mandiTbody = document.getElementById('mandi-tbody');
    const mandiDemoBadge = document.getElementById('mandi-demo-badge');

    let allMandiData = [];
    let currentMandiData = [];

    async function loadMandiRates() {
        if (mandiDemoBadge) mandiDemoBadge.style.display = 'none';
        mandiTbody.innerHTML = `<tr><td colspan="8" style="text-align: center; padding: 20px;">Fetching from backend...</td></tr>`;

        try {
            const response = await fetch(CONFIG.MANDI_API_URL);
            if (!response.ok) throw new Error("Mandi API Error");
            
            const data = await response.json();
            allMandiData = data; 
            
            initializeFilters();
            applyFilters();
        } catch (error) {
            console.error("Mandi API Error:", error);
            mandiTbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: red;">Error loading mandi rates from backend. Is it running?</td></tr>`;
            showToast("Failed to fetch mandi rates.", "error");
        }
    }

    function initializeFilters() {
        // Extract unique crops and states for the dropdowns
        const uniqueCrops = [...new Set(allMandiData.map(item => item.crop))].sort();
        const uniqueStates = [...new Set(allMandiData.map(item => item.state))].sort();

        // Populate crop filter
        mandiCropFilter.innerHTML = '<option value="">All Crops</option>';
        uniqueCrops.forEach(crop => {
            const option = document.createElement('option');
            option.value = crop;
            option.textContent = crop;
            mandiCropFilter.appendChild(option);
        });

        // Populate state filter
        mandiStateFilter.innerHTML = '<option value="">All States</option>';
        uniqueStates.forEach(state => {
            const option = document.createElement('option');
            option.value = state;
            option.textContent = state;
            mandiStateFilter.appendChild(option);
        });
    }

    function applyFilters() {
        const searchTerm = mandiSearchInput.value.toLowerCase();
        const selectedCrop = mandiCropFilter.value;
        const selectedState = mandiStateFilter.value;
        const sortBy = mandiSort.value;

        currentMandiData = allMandiData.filter(item => {
            const matchesSearch = item.crop.toLowerCase().includes(searchTerm) || item.mandi.toLowerCase().includes(searchTerm);
            const matchesCrop = selectedCrop === "" || item.crop === selectedCrop;
            const matchesState = selectedState === "" || item.state === selectedState;
            return matchesSearch && matchesCrop && matchesState;
        });

        // Sorting logic
        if (sortBy === 'price-low') {
            currentMandiData.sort((a, b) => a.modalPrice - b.modalPrice);
        } else if (sortBy === 'price-high') {
            currentMandiData.sort((a, b) => b.modalPrice - a.modalPrice);
        }

        renderMandiTable();
    }

    function renderMandiTable() {
        mandiTbody.innerHTML = '';
        
        if (currentMandiData.length === 0) {
            mandiTbody.innerHTML = `<tr><td colspan="8" style="text-align: center; padding: 20px;">No matching records found.</td></tr>`;
            return;
        }

        currentMandiData.forEach(item => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td><strong>${item.crop}</strong></td>
                <td>${item.mandi}</td>
                <td>${item.state}</td>
                <td>₹${item.minPrice}</td>
                <td>₹${item.maxPrice}</td>
                <td><strong>₹${item.modalPrice}</strong></td>
                <td>${item.unit}</td>
                <td>${item.date}</td>
            `;
            mandiTbody.appendChild(row);
        });
    }

    // Event Listeners for Filters
    mandiSearchInput.addEventListener('input', applyFilters);
    mandiCropFilter.addEventListener('change', applyFilters);
    mandiStateFilter.addEventListener('change', applyFilters);
    mandiSort.addEventListener('change', applyFilters);

    // Initial load
    loadMandiRates();

    // --- Government Schemes Feature ---
    let schemesData = [
        {
            "name": "PM-KISAN (Pradhan Mantri Kisan Samman Nidhi)",
            "description": "Direct income support to all landholding farmer families across the country.",
            "benefits": ["₹6,000 per year", "Transferred in three equal installments of ₹2,000 each", "Direct Benefit Transfer (DBT)"],
            "eligibility": ["All landholding farmers families", "Excludes institutional land holders", "Excludes professionals, current/former ministers, and high-income taxpayers"],
            "link": "https://pmkisan.gov.in/"
        },
        {
            "name": "Pradhan Mantri Fasal Bima Yojana (PMFBY)",
            "description": "A comprehensive crop insurance scheme to provide financial support to farmers suffering crop loss/damage arising out of unforeseen events.",
            "benefits": ["Comprehensive risk cover from pre-sowing to post-harvest", "Low uniform premium: 2% for Kharif, 1.5% for Rabi, 5% for commercial/horticultural crops", "Use of technology for quick claim settlement"],
            "eligibility": ["All farmers growing notified crops in notified areas", "Sharecroppers and tenant farmers are eligible"],
            "link": "https://pmfby.gov.in/"
        },
        {
            "name": "Kisan Credit Card (KCC)",
            "description": "Provides farmers with timely access to credit for their cultivation needs and other agricultural requirements.",
            "benefits": ["Short-term credit limits for crops", "Flexible repayment options", "Subvention on interest for timely repayment", "Includes insurance coverage"],
            "eligibility": ["All farmers – individuals/joint borrowers who are owner cultivators", "Tenant farmers, oral lessees & share croppers", "Self Help Groups (SHGs) or Joint Liability Groups (JLGs) of farmers"],
            "link": "https://www.myscheme.gov.in/schemes/kcc"
        },
        {
            "name": "Soil Health Card Scheme",
            "description": "Promotes soil test based nutrient management to help farmers realize higher yields at lower cost.",
            "benefits": ["Provides crop-wise recommendations of nutrients and fertilizers", "Helps improve soil health and fertility", "Reduces cultivation cost by avoiding unnecessary fertilizers"],
            "eligibility": ["All farmers across India are eligible to get their soil tested and receive a card"],
            "link": "https://soilhealth.dac.gov.in/"
        },
        {
            "name": "Pradhan Mantri Krishi Sinchayee Yojana (PMKSY)",
            "description": "Aims to achieve convergence of investments in irrigation at the field level, expand cultivable area under assured irrigation, and improve on-farm water use efficiency.",
            "benefits": ["Har Khet Ko Pani (Water to every field)", "Per Drop More Crop (Micro-irrigation)", "Subsidies for drip and sprinkler irrigation systems"],
            "eligibility": ["Farmers owning agricultural land", "Members of cooperative societies, self-help groups, and farmer producer organizations"],
            "link": "https://pmksy.gov.in/"
        },
        {
            "name": "e-NAM (National Agriculture Market)",
            "description": "A pan-India electronic trading portal which networks the existing APMC mandis to create a unified national market for agricultural commodities.",
            "benefits": ["Real-time price discovery based on actual demand and supply", "Transparency in trade", "Direct online payment to farmer's bank account", "Access to a larger national market"],
            "eligibility": ["Farmers, traders, and commission agents registered with the local APMC mandi"],
            "link": "https://enam.gov.in/"
        },
        {
            "name": "Rashtriya Krishi Vikas Yojana (RKVY)",
            "description": "Aimed at ensuring holistic development of agriculture and allied sectors by allowing states to choose their own agriculture and allied sector development activities.",
            "benefits": ["Financial support for agricultural infrastructure", "Pre-harvest and post-harvest facilities", "Promotes agri-entrepreneurship and innovations"],
            "eligibility": ["State Governments and affiliated agencies, Farmer Producer Organizations (FPOs), and individual agri-entrepreneurs"],
            "link": "https://rkvy.nic.in/"
        }
    ];

    const schemesContainer = document.getElementById('schemes-container');
    const schemeSearchInput = document.getElementById('scheme-search');

    async function loadSchemes() {
        // Mock network delay for prototype
        schemesContainer.innerHTML = '<p style="text-align: center; width: 100%;">Loading schemes...</p>';
        setTimeout(() => {
            renderSchemes(schemesData);
        }, 500);
    }

    function renderSchemes(schemes) {
        schemesContainer.innerHTML = '';
        
        if (schemes.length === 0) {
            schemesContainer.innerHTML = '<p style="text-align: center; width: 100%; font-size: 1.1rem; padding: 20px;">No schemes found matching your search.</p>';
            return;
        }

        schemes.forEach(scheme => {
            const benefitsList = scheme.benefits.map(b => `<li>${b}</li>`).join('');
            const eligibilityList = scheme.eligibility.map(e => `<li>${e}</li>`).join('');

            const card = document.createElement('div');
            card.className = 'scheme-card';
            card.innerHTML = `
                <h3>${scheme.name}</h3>
                <p class="scheme-desc">${scheme.description}</p>
                
                <div class="scheme-details">
                    <h4>Main Benefits</h4>
                    <ul>${benefitsList}</ul>
                    
                    <h4>Eligibility</h4>
                    <ul>${eligibilityList}</ul>
                </div>
                
                <div class="scheme-footer">
                    <a href="${scheme.link}" target="_blank" rel="noopener noreferrer" class="btn btn-outline btn-small">Learn More →</a>
                </div>
            `;
            schemesContainer.appendChild(card);
        });
    }

    // Scheme Search functionality
    schemeSearchInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        const filteredSchemes = schemesData.filter(scheme => {
            return scheme.name.toLowerCase().includes(searchTerm) || 
                   scheme.description.toLowerCase().includes(searchTerm) ||
                   scheme.benefits.some(b => b.toLowerCase().includes(searchTerm));
        });
        renderSchemes(filteredSchemes);
    });

    // Initial render
    renderSchemes(schemesData);

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

        recognition.onresult = (event) => {
            let transcript = '';
            for (let i = event.resultIndex; i < event.results.length; i++) {
                transcript += event.results[i][0].transcript;
            }
            voiceText.textContent = `"${transcript}"`;
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
            // In a real app, you would process the transcript here (e.g., search for crop, check weather)
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

    // --- Farmer Helplines Feature ---
    let helplinesData = [];
    const helplinesContainer = document.getElementById('helplines-container');

    async function loadHelplines() {
        helplinesContainer.innerHTML = '<p style="text-align: center; width: 100%;">Loading helplines from backend...</p>';
        try {
            const response = await fetch(CONFIG.HELPLINES_API_URL);
            if (!response.ok) throw new Error("Helplines API Error");
            
            helplinesData = await response.json();
            renderHelplines();
        } catch (error) {
            console.error("Helplines API Error:", error);
            helplinesContainer.innerHTML = '<p style="text-align: center; width: 100%; color: red;">Error loading helplines.</p>';
        }
    }

    function renderHelplines() {
        helplinesContainer.innerHTML = '';
        
        helplinesData.forEach(helpline => {
            const card = document.createElement('div');
            card.className = 'helpline-card';
            
            // Format number for the tel: link (remove hyphens, spaces, etc if needed, though tel: handles hyphens fine)
            const telLink = helpline.number.replace(/\s+/g, '');

            card.innerHTML = `
                <h3 class="helpline-dept">${helpline.department}</h3>
                <p class="helpline-purpose">${helpline.purpose}</p>
                <div class="helpline-number">${helpline.number}</div>
                <a href="tel:${telLink}" class="btn-call">
                    📞 Call Now
                </a>
            `;
            helplinesContainer.appendChild(card);
        });
    }

    // Initial render
    loadHelplines();

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

});
