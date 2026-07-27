/**
 * ==============================================================================
 * GESTION DE LA CONNEXION (LOGIN.JS)
 * ==============================================================================
 */

// --- CONFIGURATION DE L'API ---
const API_URL = "https://kadea-chat-api.onrender.com"; 
const API_KEY = 'wksp_c3e1fb2ba091b7e4a9697b611e1d7168';

// --- ÉLÉMENTS DU DOM ---
const loginForm = document.getElementById("login-form"); 
const loginBtn = document.getElementById("login-btn");
const loginSpinner = document.getElementById("login-spinner");
const loginBtnText = document.getElementById("login-btn-text");

// Initialisation des écouteurs au chargement du DOM
document.addEventListener("DOMContentLoaded", () => {
    
    // ===================================================
    // GESTION DE LA VISIBILITÉ DU MOT DE PASSE (Chrome-proof)
    // ===================================================
    const passwordInput = document.getElementById("password"); // Aligné avec l'ID du nouveau HTML
    const togglePasswordBtn = document.getElementById("toggle-password-btn");
    const togglePasswordIcon = document.getElementById("toggle-password-icon");

    if (togglePasswordBtn && passwordInput) {
        togglePasswordBtn.addEventListener("click", (e) => {
            // Empêche Chrome d'activer son comportement natif d'autocomplétion au clic
            e.preventDefault(); 
            e.stopPropagation(); // Bloque la propagation pour éviter les conflits d'interface sur Chrome
            
            if (passwordInput.type === "password") {
                passwordInput.type = "text";
                if (togglePasswordIcon) {
                    togglePasswordIcon.setAttribute("data-lucide", "eye-off");
                }
            } else {
                passwordInput.type = "password";
                if (togglePasswordIcon) {
                    togglePasswordIcon.setAttribute("data-lucide", "eye");
                }
            }
            
            // Force Lucide à re-générer la bonne icône à la volée
            if (window.lucide) {
                lucide.createIcons();
            }
        });
    }
});

// Gestion de la soumission du formulaire
/**
 * ------------------------------------------------------------------------------
 * SOUMISSION DU FORMULAIRE DE CONNEXION
 * ------------------------------------------------------------------------------
 */

if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        // Récupération dynamique des champs de saisie (fallback ID/Type)
        const emailField = loginForm.querySelector('input[type="email"]') || document.getElementById("email");
        const passwordField = loginForm.querySelector('input[type="password"]') || document.getElementById("password");

        // Vérification de sécurité : existence des éléments dans le DOM
        if (!emailField || !passwordField) {
            console.error("Champs email ou password introuvables dans le HTML.");
            showToast("Erreur : Les champs du formulaire sont introuvables.", "error");
            return;
        }

        // Mise à jour de l'UI pendant le chargement (Spinner + Bouton désactivé)
        if (loginBtn) loginBtn.disabled = true;
        if (loginSpinner) loginSpinner.classList.remove("hidden");
        if (loginBtnText) loginBtnText.textContent = "Connexion en cours...";


        try {
            // Requête d'authentification auprès du serveur
            const response = await fetch(`${API_URL}/auth/login`, {
                method: "POST",
                headers: { 
                    "Content-Type": "application/json",
                    "x-api-key": API_KEY 
                },
                body: JSON.stringify({
                    email: emailField.value.trim(),
                    password: passwordField.value.trim()
                })
            });

            // Analyse sécurisée du format de la réponse
            const contentType = response.headers.get("content-type");
            let result = {};
            
            if (contentType && contentType.includes("application/json")) {
                result = await response.json();
            } else {
                const textFallback = await response.text();
                console.warn("L'API n'a pas renvoyé de JSON. Texte brut reçu :", textFallback);
                throw new Error(`Réponse serveur invalide (Statut ${response.status})`);
            }

            // Traitement en cas de succès HTTP (200-299)
            if (response.ok) {
                // Extraction flexible du jeton et de l'ID utilisateur selon la structure retournée
                const userToken = result.token || result.data?.token;
                const userId = result.userId || result.data?.userId || result.data?.user?.id;
                
                // Sauvegarde locale de la session
                if (userToken) localStorage.setItem("token", userToken);
                if (userId) localStorage.setItem("userId", userId);


                showToast("Connexion réussie ! Redirection...", "success");

                // Redirection différée vers le chat
                setTimeout(() => {    
                    window.location.href = "chat.html";
                }, 1000);

            } else {
                // Gestion des identifiants incorrects ou erreurs API
                showToast(result.message || "Identifiants incorrects.", "error");
                resetLoginButton();
            }

        } catch (error) {

            // Capturation des erreurs de réseau ou de parsing JSON

            console.error("Détail de l'erreur de connexion :", error);
            showToast(error.message || "Impossible de joindre le serveur.", "error");
            resetLoginButton();
        }
    });
}

/**
 * ------------------------------------------------------------------------------
 * RÉINITIALISATION DU BOUTON DE CONNEXION
 * ------------------------------------------------------------------------------
 * Rétablit l'état initial du bouton lorsque la tentative échoue.
 */
function resetLoginButton() {
    if (loginBtn) loginBtn.disabled = false;
    if (loginSpinner) loginSpinner.classList.add("hidden");
    if (loginBtnText) loginBtnText.textContent = "Se connecter";
}

/**
 * ------------------------------------------------------------------------------
 * SYSTÈME DE NOTIFICATION TOAST
 * ------------------------------------------------------------------------------
 * @param {string} message - Le texte à afficher.
 * @param {string} type - 'success', 'error', ou 'info'.
 */
function showToast(message, type = "success") {
    const container = document.getElementById("toast-container");
    if (!container) return;

    // Création du bloc de notification
    const toast = document.createElement("div");
    toast.className = `flex items-center p-4 rounded-xl shadow-lg border text-sm font-medium transition-all duration-300 transform translate-y-2 opacity-0`;

    // Application du thème selon le type de message
    if (type === "success") {
        toast.className += " bg-blue-50 border-blue-200 text-blue-800";
        toast.innerHTML = `
            <span class="mr-2 text-lg">✅</span>
            <div class="flex-1">${message}</div>
        `;
    } else if (type === "error") {
        toast.className += " bg-rose-50 border-rose-200 text-rose-800";
        toast.innerHTML = `
            <span class="mr-2 text-lg">❌</span>
            <div class="flex-1">${message}</div>
        `;
    } else {
        toast.className += " bg-slate-50 border-slate-200 text-slate-800";
        toast.innerHTML = `
            <span class="mr-2 text-lg">ℹ️</span>
            <div class="flex-1">${message}</div>
        `;
    }

    container.appendChild(toast);

    // Animation d'entrée (Fade-in / Slide-up)
    setTimeout(() => {
        toast.classList.remove("translate-y-2", "opacity-0");
    }, 10);

    // Animation de sortie et suppression automatique après 4 secondes
    setTimeout(() => {
        toast.classList.add("translate-y-2", "opacity-0");
        setTimeout(() => {
            toast.remove();
        }, 300);
    }, 4000);
}