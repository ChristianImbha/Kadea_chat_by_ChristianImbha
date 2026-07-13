// Configuration de l'API
const API_URL = "https://kadea-chat-api.onrender.com"; 
const Workspace_API_KEY = 'wksp_c3e1fb2ba091b7e4a9697b611e1d7168';

// Éléments du DOM
const loginForm = document.getElementById("login-form"); 
const loginBtn = document.getElementById("login-btn");
const loginSpinner = document.getElementById("login-spinner");
const loginBtnText = document.getElementById("login-btn-text");

if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        // Récupération des champs de saisie
        const emailField = loginForm.querySelector('input[type="email"]') || document.getElementById("email");
        const passwordField = loginForm.querySelector('input[type="password"]') || document.getElementById("password");

        if (!emailField || !passwordField) {
            console.error("Champs email ou password introuvables dans le HTML.");
            showToast("Erreur : Les champs du formulaire sont introuvables.");
            return;
        }

        // 🚀 SÉCURITÉ ACTIVE : On ne modifie les éléments que s'ils existent réellement dans le HTML
        if (loginBtn) {
            loginBtn.disabled = true;
        }
        if (loginSpinner) {
            loginSpinner.classList.remove("hidden");
        }
        if (loginBtnText) {
            loginBtnText.textContent = "Connexion en cours...";
        }

        try {
            const response = await fetch(`${API_URL}/auth/login`, {
                method: "POST",
                headers: { 
                    "Content-Type": "application/json",
                    "x-api-key": Workspace_API_KEY
                },
                body: JSON.stringify({
                    email: emailField.value.trim(),
                    password: passwordField.value.trim()
                })
            });

            // Vérification du type de contenu renvoyé
            const contentType = response.headers.get("content-type");
            let result = {};
            
            if (contentType && contentType.includes("application/json")) {
                result = await response.json();
            } else {
                const textFallback = await response.text();
                console.warn("L'API n'a pas renvoyé de JSON. Texte brut reçu :", textFallback);
                throw new Error(`Réponse serveur invalide (Statut ${response.status})`);
            }

            if (response.ok) {
                const userToken = result.token || result.data?.token;
                const userId = result.userId || result.data?.userId || result.data?.user?.id;
                
                if (userToken) localStorage.setItem("token", userToken);
                if (userId) localStorage.setItem("userId", userId);
            showToast("Connexion réussie ! Redirection...", "success");
            setTimeout(() => {    
                window.location.href = "chat.html";
            } , 1000);
            } else {
                showToast(result.message || "Identifiants incorrects.", "error");
                resetLoginButton();
            }

        } catch (error) {
            // Déplie ce message dans ta console pour voir la cause exacte du crash !
            console.error("Détail de l'erreur de connexion :", error);
            showToast(error.message || "Impossible de joindre le serveur.", "error");
            resetLoginButton();
        }
    });
}

// Fonction sécurisée pour remettre le bouton de connexion à son état initial
function resetLoginButton() {
    if (loginBtn) {
        loginBtn.disabled = false;
    }
    if (loginSpinner) {
        loginSpinner.classList.add("hidden");
    }
    if (loginBtnText) {
        loginBtnText.textContent = "Se connecter";
    }
}

// Fonction pour afficher une superbe notification Toast
function showToast(message, type = "success") {
    const container = document.getElementById("toast-container");
    if (!container) return;

    // Création de l'élément toast
    const toast = document.createElement("div");
    
    // Style de base et animation d'entrée
    toast.className = `flex items-center p-4 rounded-xl shadow-lg border text-sm font-medium transition-all duration-300 transform translate-y-2 opacity-0`;

    // Personnalisation des couleurs selon le type (Succès, Erreur ou Info)
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
        toast.className += " bg-blue-50 border-blue-200 text-blue-800";
        toast.innerHTML = `
            <span class="mr-2 text-lg">ℹ️</span>
            <div class="flex-1">${message}</div>
        `;
    }

    // Ajout au conteneur
    container.appendChild(toast);

    // Déclenchement de l'animation d'apparition fluide
    setTimeout(() => {
        toast.classList.remove("translate-y-2", "opacity-0");
    }, 10);

    // Animation de sortie et suppression automatique après 4 secondes
    setTimeout(() => {
        toast.classList.add("translate-y-2", "opacity-0");
        setTimeout(() => {
            toast.remove();
        }, 300); // Temps de la transition de disparition
    }, 4000);
}
