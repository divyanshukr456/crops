/*
 * Farmer Helps - Section Router
 *
 * IMPORTANT:
 * Home is a real page/route. Crop Disease, Weather, Mandi Rates,
 * Government Schemes and Helpline are separate routes.
 * Farming Tips, Services, Quick Stats, Latest Updates and About
 * belong to Home and must never appear on the other routes.
 */

document.addEventListener("DOMContentLoaded", () => {
    const MAIN_ROUTES = [
        "home",
        "disease-detector",
        "weather-section",
        "mandi-section",
        "schemes-section",
        "helplines-section",
        "login"
    ];

    // These elements are part of Home and should be visible only on Home.
    const HOME_CONTENT_SELECTOR = ".home-content";

    // Optional home anchors. They still open Home, then scroll to the requested block.
    const HOME_ANCHORS = new Set([
        "services",
        "quick-stats",
        "farming-tips",
        "updates",
        "about"
    ]);

    function getRequestedHash() {
        return window.location.hash.replace(/^#/, "").trim();
    }

    function setVisibility(element, visible) {
        if (!element) return;

        element.classList.toggle("active-route", visible);
        element.classList.toggle("hidden-route", !visible);
    }

    function handleRouting() {
        const requestedHash = getRequestedHash();
        const currentHash = requestedHash || "home";

        let routeToShow = currentHash;
        let homeAnchor = null;

        if (HOME_ANCHORS.has(currentHash)) {
            routeToShow = "home";
            homeAnchor = currentHash;
        } else if (!MAIN_ROUTES.includes(currentHash)) {
            routeToShow = "home";
        }

        // 1. Hide every Home block first.
        document.querySelectorAll(HOME_CONTENT_SELECTOR).forEach((element) => {
            setVisibility(element, routeToShow === "home");
        });

        // 2. Show exactly one standalone route.
        MAIN_ROUTES.forEach((routeId) => {
            if (routeId === "home") return;

            const section = document.getElementById(routeId);
            setVisibility(section, routeToShow === routeId);
        });

        // 3. Navigation active state.
        const navLinks = document.querySelectorAll(".nav-link");
        navLinks.forEach((link) => {
            link.classList.remove("active-nav");

            const href = link.getAttribute("href") || "";
            const target = href.replace(/^#/, "");

            if (target === routeToShow || target === currentHash) {
                link.classList.add("active-nav");
            }
        });

        // 4. Scroll after the route is rendered.
        window.scrollTo({ top: 0, behavior: "smooth" });

        if (routeToShow === "home" && homeAnchor) {
            // Wait for the Home blocks to become visible before scrolling.
            window.setTimeout(() => {
                const target = document.getElementById(homeAnchor);
                if (target) {
                    target.scrollIntoView({ behavior: "smooth", block: "start" });
                }
            }, 50);
        }

        // 5. Floating widgets are available on the app, not on Login.
        const feedbackWidget = document.getElementById("feedback-widget");
        const voiceFab = document.getElementById("voice-fab");
        const isLogin = routeToShow === "login";

        if (feedbackWidget) {
            feedbackWidget.style.display = isLogin ? "none" : "block";
        }

        if (voiceFab) {
            voiceFab.style.display = isLogin ? "none" : "flex";
        }

        // Keep the URL clean when an unknown hash is entered.
        if (!MAIN_ROUTES.includes(currentHash) && !HOME_ANCHORS.has(currentHash)) {
            history.replaceState(null, "", "#home");
        }
    }

    window.addEventListener("hashchange", handleRouting);
    handleRouting();
});
