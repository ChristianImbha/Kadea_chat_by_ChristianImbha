// ==========================================
// CONFIGURATION DE L'API 
// ==========================================
const API_URL = 'https://kadea-chat-api.onrender.com'; 
const token = localStorage.getItem("token");
const Workspace_API_KEY = 'wksp_c3e1fb2ba091b7e4a9697b611e1d7168';

document.addEventListener("DOMContentLoaded", () => {
    // Éléments du DOM
    const changeAvatarTrigger = document.getElementById("change-avatar-trigger");
    const avatarInput = document.getElementById("avatar-input");
    const profileAvatar = document.getElementById("profile-page-avatar");
    const profileNameInput = document.getElementById("profile-name");
    const profileStatusInput = document.getElementById("profile-status");
    const profileForm = document.getElementById("profile-form");
    const alertBox = document.getElementById("alert-box");

    // ==========================================
    // RÉCUPÉRATION ET AFFICHAGE DIRECT DU PROFIL
    // ==========================================
    function loadUserData() {
        // 1. On récupère les données sauvegardées dans le localStorage
        const savedName = localStorage.getItem("userFullName");
        const savedBio = localStorage.getItem("userBio");
        const savedAvatar = localStorage.getItem("userAvatarUrl");

        // 2. On remplit les champs de saisie (Inputs)
        if (profileNameInput && savedName) {
            profileNameInput.value = savedName;
        }
        
        if (profileStatusInput && savedBio) {
            profileStatusInput.value = savedBio;
        }

        // 3. On affiche la photo de profil
        if (profileAvatar) {
            if (savedAvatar && savedAvatar.trim() !== "") {
                profileAvatar.src = savedAvatar;
            } else {
                const nameSeed = savedName || "default";
                profileAvatar.src = `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(nameSeed)}`;
            }
        }
    }

    // Exécuter la récupération dès le départ
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
                if (profileAvatar) {
                    profileAvatar.src = event.target.result;
                }
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
        formData.append("avatar", file); 

        showAlert("Téléchargement de l'image...", "info");

        try {
            const response = await fetch(`${API_URL}/auth/me`, { 
                method: "POST", 
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "x-api-key": Workspace_API_KEY
                },
                body: formData
            });

            if (response.ok) {
                const data = await response.json();
                console.log("Réponse API reçue :", data); // 💡 Regarde ta console de navigateur pour inspecter ce que l'API renvoie !
                
                showAlert("Photo de profil mise à jour avec succès !", "success");
                
                // On essaie de trouver l'URL n'importe où dans la réponse
                const newUserAvatar = data.avatarUrl || 
                                     data.avatar || 
                                     (data.user && data.user.avatarUrl) || 
                                     (data.user && data.user.avatar) || 
                                     (data.data && data.data.avatarUrl);
                
                if (newUserAvatar) {
                    // On enregistre partout pour éviter tout conflit de clé !
                    localStorage.setItem("userAvatarUrl", newUserAvatar);
                    localStorage.setItem("userAvatar", newUserAvatar);
                    localStorage.setItem("avatar", newUserAvatar);
                    
                    if (profileAvatar) profileAvatar.src = newUserAvatar;
                }
            } else {
                showAlert("Erreur lors de la sauvegarde de l'image sur le serveur.", "error");
            }
        } catch (error) {
            console.error("Erreur d'envoi de la photo :", error);
            showAlert("Impossible de se connecter au serveur.", "error");
        }
    }
    // ==========================================
    // 3. SAUVEGARDE DU NOM ET DU STATUT (FORMULAIRE)
    // ==========================================
    if (profileForm) {
        profileForm.addEventListener("submit", async (e) => {
            e.preventDefault();

            showAlert("Sauvegarde des informations...", "info");

            const updatedData = {
                fullName: profileNameInput ? profileNameInput.value : "",
                status: profileStatusInput ? profileStatusInput.value : ""
            };

            try {
                const response = await fetch(`${API_URL}/auth/me`, { 
                    method: "POST", 
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${token}`,
                        "x-api-key": Workspace_API_KEY
                    },
                    body: JSON.stringify(updatedData)
                });

                if (response.ok) {
                    showAlert("Informations enregistrées !", "success");
                    // On met à jour les données locales pour les futurs rechargements
                    localStorage.setItem("userFullName", updatedData.fullName);
                    localStorage.setItem("userBio", updatedData.status);
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
    // 4. FONCTION D'AFFICHAGE DES ALERTES (ALERT-BOX)
    // ==========================================
    function showAlert(message, type) {
        if (!alertBox) return;
        
        alertBox.textContent = message;
        alertBox.className = "p-3 rounded text-sm text-center font-medium mt-4 block"; 

        if (type === "success") {
            alertBox.classList.add("bg-green-100", "text-green-800");
        } else if (type === "error") {
            alertBox.classList.add("bg-red-100", "text-red-800");
        } else {
            alertBox.classList.add("bg-blue-100", "text-blue-800"); 
        }

        alertBox.classList.remove("hidden");

        if (type !== "info") {
            setTimeout(() => {
                alertBox.classList.add("hidden");
            }, 3000);
        }
    }
});