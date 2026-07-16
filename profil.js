// Configuration de l'API 
const API_URL = "https://kadea-chat-api.onrender.com"; 
const token = localStorage.getItem("token");
const Workspace_API_KEY = "ta_cle_api";
document.addEventListener("DOMContentLoaded", () => {
    // Éléments pour l'avatar
    const changeAvatarTrigger = document.getElementById("change-avatar-trigger");
    const avatarInput = document.getElementById("avatar-input");
    const profileAvatar = document.getElementById("profile-page-avatar");
    
    // Éléments du formulaire
    const profileForm = document.getElementById("profile-form");
    const profileNameInput = document.getElementById("profile-name");
    const profileStatusInput = document.getElementById("profile-status");
    const alertBox = document.getElementById("alert-box");

    // Charger les informations existantes au démarrage
    loadUserData();

    // ==========================================
    // 1. GESTION DU CLIC SUR L'AVATAR
    // ==========================================
    if (changeAvatarTrigger && avatarInput) {
        changeAvatarTrigger.addEventListener("click", () => {
            avatarInput.click(); // Déclenche le sélecteur de fichier masqué
        });

        avatarInput.addEventListener("change", async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            // Prévisualisation visuelle immédiate (locale)
            const reader = new FileReader();
            reader.onload = (event) => {
                profileAvatar.src = event.target.result;
            };
            reader.readAsDataURL(file);

            // Envoi de la photo de profil à l'API
            await uploadAvatar(file);
        });
    }

    // ==========================================
    // 2. ENVOI DE L'IMAGE À L'API
    // ==========================================
    async function uploadAvatar(file) {
        const formData = new FormData();
        formData.append("avatar", file); // Remplace "avatar" par le nom attendu par ton API (ex: "file", "image")

        showAlert("Téléchargement de l'image...", "info");

        try {
            const response = await fetch(`${API_URL}/users/update-avatar`, { // Remplace par ton endpoint exact d'upload
                method: "POST", 
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "x-api-key": Workspace_API_KEY
                    // IMPORTANT : Ne surtout pas mettre "Content-Type" : "application/json" !
                    // Le navigateur doit définir lui-même le format FormData (multipart/form-data)
                },
                body: formData
            });

            if (response.ok) {
                const data = await response.json();
                showAlert("Photo de profil mise à jour avec succès !", "success");
                
                // Mettre à jour le stockage local pour que la page chat.html se mette aussi à jour
                if (data.avatarUrl) {
                    localStorage.setItem("userAvatar", data.avatarUrl);
                    profileAvatar.src = data.avatarUrl;
                }
            } else {
                showAlert("Erreur lors de la sauvegarde de l'image sur le serveur.", "error");
            }
        } catch (error) {
            console.error("Erreur d'envoi de la photo :", error);
            showAlert("Impossible de se connecter au serveur pour envoyer l'image.", "error");
        }
    }

    // ==========================================
    // 3. CHARGEMENT INITIAL DES DONNÉES UTILISATEUR
    // ==========================================
    async function loadUserData() {
        try {
            const response = await fetch(`${API_URL}/auth/me`, {
                method: "GET",
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "x-api-key": Workspace_API_KEY
                }
            });

            if (response.ok) {
                const userData = await response.json();
                const user = userData.data || userData;

                if (profileNameInput) profileNameInput.value = user.fullName || "";
                if (profileStatusInput) profileStatusInput.value = user.status || "Disponible";
                if (profileAvatar && user.avatarUrl) {
                    profileAvatar.src = user.avatarUrl;
                }
            }
        } catch (error) {
            console.error("Erreur lors du chargement initial :", error);
        }
    }

    // ==========================================
    // 4. SAUVEGARDE DU NOM ET DU STATUT (FORMULAIRE)
    // ==========================================
    if (profileForm) {
        profileForm.addEventListener("submit", async (e) => {
            e.preventDefault();

            showAlert("Sauvegarde des informations...", "info");

            const updatedData = {
                fullName: profileNameInput.value,
                status: profileStatusInput.value
            };

            try {
                const response = await fetch(`${API_URL}/users/update`, { // Remplace par ton endpoint de mise à jour des infos
                    method: "PUT", // ou PATCH ou POST selon l'API
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${token}`,
                        "x-api-key": Workspace_API_KEY
                    },
                    body: JSON.stringify(updatedData)
                });

                if (response.ok) {
                    showAlert("Informations enregistrées !", "success");
                } else {
                    showAlert("Erreur lors de la mise à jour du profil.", "error");
                }
            } catch (error) {
                console.error("Erreur de mise à jour :", error);
                showAlert("Erreur réseau.", "error");
            }
        });
    }

    // ==========================================
    // 5. FONCTION D'AFFICHAGE DES ALERTES (ALERT-BOX)
    // ==========================================
    function showAlert(message, type) {
        if (!alertBox) return;
        
        alertBox.textContent = message;
        alertBox.className = "p-3 rounded text-sm text-center font-medium mt-4 block"; // Réinitialise

        if (type === "success") {
            alertBox.classList.add("bg-green-100", "text-green-800");
        } else if (type === "error") {
            alertBox.classList.add("bg-red-100", "text-red-800");
        } else {
            alertBox.classList.add("bg-blue-100", "text-blue-800"); // Info/Loading
        }

        alertBox.classList.remove("hidden");

        // Fait disparaître les messages de succès ou d'erreur après 3 secondes
        if (type !== "info") {
            setTimeout(() => {
                alertBox.classList.add("hidden");
            }, 3000);
        }
    }
});