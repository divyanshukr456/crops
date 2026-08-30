document.addEventListener("DOMContentLoaded", () => {
    // Define the valid routes based on the section IDs
    const routes = [
        "home", 
        "services",
        "disease-detector", 
        "weather-section", 
        "mandi-section", 
        "schemes-section", 
        "helplines-section"
    ];

    // Function to handle route changes
    function handleRouting() {
        // Get the hash without the '#' symbol. Default to 'home' if empty.
        let currentHash = window.location.hash.substring(1) || "home";

        // If the hash is not in our routes, default to home
        if (!routes.includes(currentHash)) {
            currentHash = "home";
            window.location.hash = "#home";
        }

        // 1. Hide all sections and show the active one
        routes.forEach(route => {
            const section = document.getElementById(route);
            if (section) {
                // If route is 'home' or 'services', show them together when hash is 'home'
                const isHomeView = currentHash === "home" && (route === "home" || route === "services");
                
                if (route === currentHash || isHomeView) {
                    section.classList.add("active-route");
                    section.classList.remove("hidden-route");
                } else {
                    section.classList.remove("active-route");
                    section.classList.add("hidden-route");
                }
            }
        });

        // 2. Update navigation active state
        const navLinks = document.querySelectorAll(".nav-link");
        navLinks.forEach(link => {
            link.classList.remove("active-nav");
            // Check if the link's href matches the current hash
            if (link.getAttribute("href") === `#${currentHash}`) {
                link.classList.add("active-nav");
            }
        });

        // 3. Scroll to top of the page smoothly on route change
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // Listen for hash changes (when user clicks nav links or uses back/forward buttons)
    window.addEventListener("hashchange", handleRouting);

    // Run on initial load
    handleRouting();
});
