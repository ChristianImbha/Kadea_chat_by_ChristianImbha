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
            alert("Erreur : Les champs du formulaire sont introuvables.");
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
                
                window.location.href = "chat.html";
            } else {
                alert(result.message || "Identifiants incorrects.");
                resetLoginButton();
            }

        } catch (error) {
            // Déplie ce message dans ta console pour voir la cause exacte du crash !
            console.error("Détail de l'erreur de connexion :", error);
            alert(`Erreur de connexion : ${error.message || "Impossible de joindre le serveur"}`);
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
