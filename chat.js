// ===================================================
// CONFIGURATION ET VARIABLES GLOBALES
// ===================================================

/**
 * URL de base de l'API distant pour le service de chat.
 */
const API_URL = "https://kadea-chat-api.onrender.com"; 

/**
 * Clé d'API nécessaire pour authentifier l'application auprès de l'espace de travail.
 */
const API_KEY = 'wksp_c3e1fb2ba091b7e4a9697b611e1d7168';

/**
 * Nettoie une chaîne de caractères pour éviter les injections XSS (Cross-Site Scripting).
 * Remplace les caractères spéciaux HTML (&, <, >, ', ") par leurs entités HTML équivalentes.
 * 
 * @param {string} str - La chaîne à sécuriser.
 * @returns {string} La chaîne nettoyée et sécurisée.
 */
function escapeHTML(str) {
    if (!str) return "";
    return str.replace(/[&<>'"]/g, 
        tag => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            "'": '&#39;',
            '"': '&quot;'
        }[tag] || tag)
    );
}

/**
 * Vérifie et corrige l'URL de l'avatar d'un utilisateur.
 * Si l'URL est absente, invalide ou pointe vers un placeholder, génère un avatar avec les initiales via UI-Avatars.
 * 
 * @param {string} url - L'URL de l'image de profil à vérifier.
 * @param {string} fullName - Le nom de l'utilisateur (utilisé pour les initiales si l'URL est invalide).
 * @returns {string} L'URL finale valide pour l'image de profil.
 */
function getCleanAvatar(url, fullName = "Utilisateur") {
    if (!url || 
        url === "null" || 
        url === "undefined" || 
        url.trim() === "" || 
        url.includes("placeholder.com")
    ) {
        // Génération dynamique d'un avatar à partir des initiales

        return `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=0D8ABC&color=fff&size=128`;

    }
    return url;
}

// ---------------------------------------------------
// SÉCURISATION DE LA PAGE (CONTROLES D'ACCÈS)
// ---------------------------------------------------
// Récupération du jeton d'authentification dans le stockage local ou de session.
const token = localStorage.getItem("token") || sessionStorage.getItem("token");

// Si aucun jeton n'est présent, l'utilisateur n'est pas connecté -> Redirection vers la page d'accueil/connexion.
if (!token) {
    window.location.href = "index.html";
}

// ---------------------------------------------------
// VARIABLES D'ÉTAT GLOBAL
// ---------------------------------------------------
let activeConversationId = null; // Stocke l'ID de la conversation actuellement ouverte
let messageInterval = null;      // Stocke la référence de l'intervalle de rafraîchissement (polling)
let editingMessageId = null;     // Stocke l'ID du message en cours d'édition (null si aucun)

// ---------------------------------------------------
// SÉLECTION DES ÉLÉMENTS DU DOM
// ---------------------------------------------------
const myAvatar = document.getElementById("active-user-avatar"); 
const myName = document.getElementById("active-user-name"); 
const messageForm = document.getElementById("message-form");
const messageInput = document.getElementById("message-input");
const messagesContainer = document.getElementById("messages-container");
const chatPanel = document.getElementById("chat-panel");
const deleteConvBtn = document.getElementById("delete-conv-btn");
const sidebarAvatar = document.getElementById('sidebar-user-avatar');

const activeChatTitle = document.getElementById("active-chat-title");
const activeChatStatus = document.getElementById("active-chat-status");
const activeChatAvatar = document.getElementById("active-chat-avatar");
const colLeft = document.getElementById("col-left");
const colRight = document.getElementById("col-right");
const backBtn = document.getElementById("back-to-list-btn");


// ===================================================
// LOGIQUE RESPONSIVE : Affichage / Masquage mobile
// ===================================================

/**
 * Bascule l'affichage sur mobile pour afficher le panneau de discussion (colonne droite)
 * et masquer la liste des contacts (colonne gauche).
 */
function showChatColumn() {
    if (window.innerWidth < 768) {
        if (colLeft) colLeft.classList.add("hidden");
        if (colRight) {
            colRight.classList.remove("hidden");
            colRight.classList.add("flex");
        }
    }
}

/**
 * Bascule l'affichage sur mobile pour afficher la liste des contacts (colonne gauche)
 * et masquer le panneau de discussion (colonne droite).
 */
function showListColumn() {
    if (window.innerWidth < 768) {
        if (colRight) {
            colRight.classList.add("hidden");
            colRight.classList.remove("flex");
        }
        if (colLeft) colLeft.classList.remove("hidden");
    }
}

// Suivi de la largeur de l'écran pour éviter des déclenchements inutiles lors du redimensionnement
let lastWidth = window.innerWidth;

// Écouteur d'événement sur le bouton "Retour" (mode mobile)
if (backBtn) {
    backBtn.addEventListener("click", showListColumn);
}

/**
 * Gestionnaire d'événement de redimensionnement de la fenêtre.
 * Rétablit la disposition bureau (2 colonnes) ou mobile selon la taille de l'écran.
 */
window.addEventListener("resize", () => {

    // Si la largeur n'a pas changé (ex: scroll mobile), on ignore

    if (window.innerWidth === lastWidth) return;
    lastWidth = window.innerWidth;

    if (window.innerWidth >= 768) {
        // Mode Bureau : afficher les deux colonnes
        if (colLeft) colLeft.classList.remove("hidden");
        if (colRight) {
            colRight.classList.remove("hidden");
            colRight.classList.add("flex");
        }
    } else {

        // Mode Mobile : basculer par défaut sur la liste
        showListColumn();
    }
});

/**
 * Formate une date système ISO en heure lisible (ex: "14:30").
 * 
 * @param {string} dateString - Chaine de date ISO.
 * @returns {string} L'heure formatée en chaîne de caractères.
 */
function formatTime(dateString) {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}


// ===================================================
// GESTION DU PROFIL UTILISATEUR CONNECTÉ
// ===================================================

/**
 * Charge les informations du profil de l'utilisateur connecté via l'API.
 * Met à jour le DOM et le LocalStorage avec le nom et l'avatar de l'utilisateur.
 * Intègre un système de secours (fallback) si l'endpoint `/auth/me` échoue.
 */
async function loadMyProfile() {
    try {
        // Tentative principale : Récupération via la route /auth/me
        let response = await fetch(`${API_URL}/auth/me`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`,
                "x-api-key": API_KEY
            }
        });

        // Fallback : Si /auth/me échoue, tentative d'accès via l'ID stocké localement
        if (!response.ok) {
            console.warn("Route /auth/me rejetée ou limitée, tentative avec l'ID local...");
            const savedUserId = localStorage.getItem("userId");
            if (!savedUserId || savedUserId === "null") {
                throw new Error("Aucun ID utilisateur valide trouvé pour le secours.");
            }
            response = await fetch(`${API_URL}/users/${savedUserId}`, {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`,
                    "x-api-key": API_KEY
                }
            });
        }

        if (!response.ok) throw new Error("Impossible de récupérer le profil utilisateur.");

        const resJson = await response.json();
        const userData = resJson.data || resJson;
        const myId = userData.id || userData._id;

        if (myId) {
            localStorage.setItem("userId", myId);
            const userFullName = userData.fullName || "Utilisateur";
            // Nettoyage de l'avatar

            const cleanUrl = getCleanAvatar(userData.avatarUrl, userFullName);

            // Mise à jour de l'interface utilisateur
            if (myName) myName.textContent = userFullName;
            if (myAvatar) myAvatar.src = cleanUrl;
            if (sidebarAvatar) sidebarAvatar.src = cleanUrl;
            
            // Persistance locale pour l'accès hors-ligne ou sur les autres pages (ex: Profil.html)
            localStorage.setItem("userAvatar", cleanUrl);
            localStorage.setItem("userName", userFullName);
            localStorage.setItem("userEmail", userData.email || "");
        }
    } catch (error) {
        console.error("Erreur profil :", error);
        
        // En cas d'erreur réseau, restaure les valeurs depuis le localStorage
        const localId = localStorage.getItem("userId");
        const localName = localStorage.getItem("userName");
        if (myName) myName.textContent = localName || localId || "Utilisateur";
        if (sidebarAvatar) {
            sidebarAvatar.src = getCleanAvatar(localStorage.getItem("userAvatar"), localName || "Mon Profil");
        }
    }
}


// ===================================================
// GESTION DES UTILISATEURS ET CONVERSATIONS
// ===================================================

/**
 * Récupère la liste de tous les utilisateurs inscrits depuis l'API,
 * filtre la liste pour exclure l'utilisateur actuellement connecté,
 * puis lance le rendu de la liste.
 */
async function loadUsers() {
    try {
        const response = await fetch(`${API_URL}/users`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`,
                "x-api-key": API_KEY
            }
        });

        if (!response.ok) throw new Error("Impossible de récupérer la liste des utilisateurs.");
        
        const resJson = await response.json();
        let usersArray = resJson.data?.users || resJson.data || resJson;
        if (!Array.isArray(usersArray)) usersArray = [];

        let currentUserId = localStorage.getItem("userId");
        if (currentUserId) {
            currentUserId = String(currentUserId).replace(/['"]+/g, '').trim();
        }

        // Filtrage : exclut l'utilisateur courant de la liste des destinataires
        const filteredUsers = usersArray.filter(user => {
            const userId = user.id || user._id;
            if (!userId) return true; 
            
            const cleanUserId = String(userId).replace(/['"]+/g, '').trim();
            return cleanUserId !== currentUserId;
        });

        renderUsersList(filteredUsers); 
    } catch (error) {
        console.error("Erreur lors du chargement des utilisateurs :", error);
    }
}

/**
 * Génère le code HTML pour afficher chaque utilisateur dans le panneau latéral.
 * 
 * @param {Array} users - Liste des objets utilisateurs à afficher.
 */
function renderUsersList(users) {
    const roomsContainer = document.getElementById("rooms-list");
    if (!roomsContainer) return;

    roomsContainer.innerHTML = ""; 

    if (users.length === 0) {
        roomsContainer.innerHTML = `<p class="text-xs text-gray-400 text-center p-4">Aucun autre utilisateur trouvé.</p>`;
        return;
    }

    users.forEach(user => {
        const userId = user.id || user._id;
        const userElement = document.createElement("div");

        // Nettoyage de l'avatar pour chaque utilisateur de la liste

        userElement.dataset.conversationId = userId; 
        userElement.className = `conversation-item flex items-center space-x-3 p-3 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer rounded-xl transition text-slate-600 dark:text-slate-300`;
        const displayAvatar = getCleanAvatar(user.avatarUrl, user.fullName || 'Utilisateur');

        userElement.innerHTML = `
            <img src="${displayAvatar}" class="w-10 h-10 rounded-full object-cover" alt="Avatar">
            <div class="flex-1 min-w-0">
                <h3 class="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">${user.fullName || 'Utilisateur'}</h3>
                <p class="text-xs text-blue-500 truncate">Cliquez pour discuter</p>
            </div>
        `;

        // Écouteur pour démarrer une conversation au clic
        userElement.addEventListener("click", () => handleStartChat(userId, user.fullName, displayAvatar));
        roomsContainer.appendChild(userElement);
    });
}

/**
 * Initialise une conversation privée avec un utilisateur sélectionné.
 * Envoie une requête POST pour créer ou récupérer la conversation, puis la sélectionne.
 * 
 * @param {string} targetUserId - L'ID du destinataire.
 * @param {string} displayName - Le nom d'affichage du destinataire.
 * @param {string} displayAvatar - L'URL de l'avatar du destinataire.
 */
async function handleStartChat(targetUserId, displayName, displayAvatar) {
    try {
        const response = await fetch(`${API_URL}/conversations`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`,
                "x-api-key": API_KEY
            },
            body: JSON.stringify({
                type: "private",
                participantIds: [targetUserId],
                name: displayName
            })
        });

        if (!response.ok) throw new Error(`Erreur API : Statut ${response.status}`);

        const result = await response.json();
        const conversationId = result.data?.id || result.data?.conversation?.id || result.id;

        if (conversationId) {
            selectConversation({
                id: conversationId,
                name: displayName,
                avatar: displayAvatar,

        targetUserId: targetUserId // Stocké pour cibler l'élément dans la liste

            });
        } else {
            console.error("Impossible de lire l'ID de la conversation.");
        }
    } catch (error) {
        console.error("Erreur lors de l'initialisation de la discussion :", error);
    }
}

/**
 * Active une conversation dans l'interface utilisateur.
 * Met à jour le panneau de discussion, charge les messages, surligne le contact actif
 * et lance la boucle de mise à jour automatique (polling).
 * 
 * @param {Object} conv - Objet contenant les infos de la conversation (id, name, avatar, targetUserId).
 */
async function selectConversation(conv) {
    activeConversationId = conv.id;
    cancelEdit(); // Annule toute édition de message en cours

    // Mise à jour de l'en-tête du tchat
    if (activeChatTitle) activeChatTitle.textContent = conv.name || 'Discussion privée';
    if (activeChatStatus) activeChatStatus.textContent = "En ligne";
    if (activeChatAvatar) activeChatAvatar.src = conv.avatar;
    if (chatPanel) chatPanel.classList.remove("hidden");

    // Réinitialisation des styles visuels de la liste des conversations
    document.querySelectorAll(".conversation-item").forEach(item => {
        item.classList.remove("bg-blue-50", "text-blue-600", "dark:bg-slate-800", "dark:text-white");
        item.classList.add("text-slate-600", "dark:text-slate-300");
        const title = item.querySelector("h3");
        if (title) {
            title.classList.remove("text-blue-600", "text-white");
            title.classList.add("text-slate-800", "dark:text-slate-100");
        }
    });

    // Application du style "actif" sur l'élément sélectionné

    const selectedElement = document.querySelector(`[data-conversation-id="${conv.targetUserId}"]`);
    if (selectedElement) {       
        selectedElement.classList.remove("text-slate-600", "dark:text-slate-300");
        selectedElement.classList.add("bg-blue-50", "text-blue-600", "dark:bg-slate-800", "dark:text-white");         
        
        const title = selectedElement.querySelector("h3");
        if (title) {
            title.classList.remove("text-slate-800", "dark:text-slate-100");
            title.classList.add("text-blue-600", "dark:text-white");
        }
    }

    // Chargement initial des messages et basculement d'affichage responsive
    await loadMessages(conv.id);
    showChatColumn();

    // Polling : Rafraîchissement automatique des messages toutes les 4 secondes

    if (messageInterval) clearInterval(messageInterval);
    messageInterval = setInterval(() => {
        if (activeConversationId) {
            loadMessages(activeConversationId);
        }
    }, 4000);
}


// ===================================================
// GESTION DES MESSAGES (CHARGEMENT & ENVOI)
// ===================================================

/**
 * Effectue une requête API pour récupérer l'historique des messages d'une conversation.
 * 
 * @param {string} conversationId - L'identifiant unique de la conversation.
 */
async function loadMessages(conversationId) {
    try {
        const response = await fetch(`${API_URL}/conversations/${conversationId}/messages`, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${token}`,
                "x-api-key": API_KEY
            }
        });

        if (!response.ok) throw new Error("Erreur de récupération des messages.");

        const messages = await response.json();
        renderMessages(messages);
    } catch (error) {
        console.error("Erreur messages:", error);
    }
}

/**
 * Construit et injecte les bulles de messages dans le DOM.
 * Gère le sens de la bulle (expéditeur vs destinataire), la sécurité XSS, et le défilement.
 * 
 * @param {Object|Array} messagesData - Données des messages renvoyées par l'API.
 */
function renderMessages(messagesData) {
    if (!messagesContainer) return;
    
    // Détermine si l'utilisateur est déjà positionné tout en bas du conteneur de messages
    const isAtBottom = messagesContainer.scrollHeight - messagesContainer.scrollTop <= messagesContainer.clientHeight + 100;

    messagesContainer.innerHTML = ""; 

    let messages = messagesData?.data?.messages || messagesData?.data || messagesData?.messages || messagesData;
    if (!Array.isArray(messages)) messages = [];

    if (messages.length === 0) {
        messagesContainer.innerHTML = "<p class='text-center text-gray-500 py-4'>Aucun message dans cette discussion.</p>";
        return;
    } 

    let currentUserId = localStorage.getItem("userId");
    if (currentUserId) {
        currentUserId = currentUserId.replace(/['"]+/g, '').trim(); 
    }

    messages.forEach(msg => {
        let senderId = msg.senderId || msg.userId || msg.sender?.id;
        if (senderId) {
            senderId = String(senderId).replace(/['"]+/g, '').trim();
        }
        
        const senderName = msg.sender?.fullName || '';
        // Vérifie si le message appartient à l'utilisateur connecté
        const isMe = (senderId === currentUserId) || (senderName === "Christian Imbha");
        const msgId = msg.id || msg._id;
        
        const messageBlock = document.createElement("div");
        messageBlock.className = `flex w-full ${isMe ? 'justify-end' : 'justify-start'} mb-2 group`;

        // Construction du HTML de la bulle de message avec options d'édition/suppression
        messageBlock.innerHTML = `
            <div class="flex items-center space-x-2">
                ${msgId ? `
                    <div class="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition">
                        ${isMe ? `
                            <button onclick="startEditMessage('${msgId}', this)" class="text-gray-400 hover:text-blue-500 transition text-xs p-1" title="Modifier">
                                ✏️
                            </button>
                        ` : ''}
                        <button onclick="deleteMessage('${msgId}')" class="text-gray-400 hover:text-red-500 transition text-xs p-1" title="Supprimer">
                            🗑️
                        </button>
                    </div>
                ` : ''}
                <div class="${isMe ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-white text-gray-800 rounded-tl-none border border-gray-100'} max-w-xl text-sm rounded-2xl p-3 shadow-sm flex flex-col">
                    ${!isMe ? `<p class="font-bold text-xs text-blue-600 mb-0.5">${senderName || 'Utilisateur'}</p>` : ''}
                    <p class="break-words msg-text-content">${escapeHTML(msg.content || msg.text || '')}</p>
                    <span class="block text-right text-[10px] ${isMe ? 'text-blue-200' : 'text-gray-400'} mt-1">${formatTime(msg.createdAt)}</span>
                </div>
            </div>
        `;

        messagesContainer.appendChild(messageBlock);
    });

    // Maintient le scroll automatique vers le bas si l'utilisateur y était déjà
    if (isAtBottom) {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
}


// ===================================================
// LOGIQUE DE MODIFICATION ET D'ENVOI DES MESSAGES
// ===================================================

/**
 * Prépare l'interface pour la modification d'un message existant.
 * Copie le texte du message dans le champ de saisie et passe en mode édition.
 * 
 * @param {string} messageId - L'ID du message à modifier.
 * @param {HTMLElement} buttonElement - Le bouton cliqué (permet de retrouver le conteneur du message dans le DOM).
 */
function startEditMessage(messageId, buttonElement) {
    editingMessageId = messageId;
    
    const messageContainer = buttonElement.closest('.group');
    const textElement = messageContainer.querySelector('.msg-text-content');
    
    if (textElement) {
        messageInput.value = textElement.textContent.trim();
        messageInput.focus();
        messageInput.placeholder = "Modification en cours... (Échap pour annuler)";
    }
}

/**
 * Annule le mode d'édition en cours et réinitialise le champ de saisie texte.
 */
function cancelEdit() {
    editingMessageId = null;
    if (messageInput) {
        messageInput.value = "";
        messageInput.placeholder = "Tapez votre message...";
    }
}

/**
 * Écouteur global de clavier : annule l'édition d'un message si la touche 'Échap' est pressée.
 */
document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && editingMessageId !== null) {
        cancelEdit();
    }
});

/**
 * Écouteur d'événement sur la soumission du formulaire d'envoi.
 * Gère à la fois la CREATION d'un nouveau message (POST) et la MODIFICATION d'un message existant (PATCH).
 */
if (messageForm) {
    messageForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const content = messageInput.value.trim();
        if (!content || !activeConversationId) return;

        messageInput.value = ""; // Vider le champ immédiatement pour l'UX

        if (editingMessageId !== null) {
            // --- CAS 1 : MODIFICATION (PATCH) ---
            try {
                const response = await fetch(`${API_URL}/messages/${editingMessageId}`, {
                    method: "PATCH",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${token}`,
                        "x-api-key": API_KEY
                    },
                    body: JSON.stringify({ content: content })
                });

                if (response.ok) {
                    showToast("Message modifié avec succès !", "success");
                    cancelEdit();
                    await loadMessages(activeConversationId);
                } else {
                    showToast("Impossible de modifier ce message.", "error");
                }
            } catch (error) {
                console.error("Erreur modification:", error);
                showToast("Erreur de connexion au serveur.", "error");
            }
        } else {
            // --- CAS 2 : CRÉATION / ENVOI (POST) ---
            try {
                const response = await fetch(`${API_URL}/conversations/${activeConversationId}/messages`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${token}`,
                        "x-api-key": API_KEY
                    },
                    body: JSON.stringify({ content: content })
                });

                if (response.ok) {
                    await loadMessages(activeConversationId);
                    messagesContainer.scrollTop = messagesContainer.scrollHeight;
                } else {
                    showToast("Erreur lors de l'envoi du message.", "error");
                }
            } catch (error) {
                console.error("Erreur envoi:", error);
                showToast("Erreur de connexion.", "error");
            }
        }
    });
}


// ===================================================
// MODAL DE CONFIRMATION & SUPPRESSION MESSAGES
// ===================================================

/**
 * Affiche une boîte de dialogue / modale personnalisée basée sur des Promesses JS.
 * Remplace la méthode standard `confirm()` de JavaScript par une modale Tailwind personnalisée.
 * 
 * @returns {Promise<boolean>} Une promesse résolue avec `true` si validée, ou `false` si annulée.
 */
function customConfirm() {
    return new Promise((resolve) => {
        const modal = document.getElementById("confirm-modal");
        const okBtn = document.getElementById("confirm-ok-btn");
        const cancelBtn = document.getElementById("confirm-cancel-btn");

        // Utilisation du confirm classique si la modale HTML n'est pas présente dans le DOM
        if (!modal || !okBtn || !cancelBtn) {
            resolve(confirm("Voulez-vous vraiment supprimer ce message ?"));
            return;
        }

        modal.classList.remove("hidden");
        modal.classList.add("flex");
        if (window.lucide) lucide.createIcons();

        const handleOk = () => { cleanup(); resolve(true); };
        const handleCancel = () => { cleanup(); resolve(false); };

        // Nettoyage des écouteurs et masquage de la modale
        const cleanup = () => {
            modal.classList.add("hidden");
            modal.classList.remove("flex");
            okBtn.removeEventListener("click", handleOk);
            cancelBtn.removeEventListener("click", handleCancel);
        };

        okBtn.addEventListener("click", handleOk);
        cancelBtn.addEventListener("click", handleCancel);
    });
}

/**
 * Demande de confirmation avant d'envoyer une requête DELETE à l'API pour supprimer un message.
 * 
 * @param {string} messageId - L'ID du message à supprimer.
 */
async function deleteMessage(messageId) {
    const confirmed = await customConfirm();
    if (!confirmed) {
        showToast("Suppression annulée", "info");
        return;
    }

    try {
        const response = await fetch(`${API_URL}/messages/${messageId}`, {
            method: "DELETE",
            headers: {
                "Authorization": `Bearer ${token}`,
                "x-api-key": API_KEY
            }
        });

        if (response.ok) {
            showToast("Message supprimé avec succès !", "success");
            await loadMessages(activeConversationId);
        } else {
            showToast("Impossible de supprimer ce message (Droits insuffisants).", "error");
        }
    } catch (error) {
        console.error("Erreur lors de la suppression du message :", error);
        showToast("Une erreur est survenue.", "error");
    }
}


// ===================================================
// TOAST NOTIFICATIONS (NOTIFICATIONS EN POPUP)
// ===================================================

/**
 * Affiche une notification éphémère (toast) à l'écran.
 * 
 * @param {string} message - Le texte de la notification.
 * @param {string} type - Le type de notification ("success", "error", "info").
 */
function showToast(message, type = "success") {
    const container = document.getElementById("toast-container");
    
    // Style spécial au centre de l'écran pour les messages de succès
    if (type === "success") {
        const centerToast = document.createElement("div");
        centerToast.className = `fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[10001] flex flex-col items-center p-6 rounded-2xl shadow-2xl border text-center transition-all duration-300 transform scale-90 opacity-0 bg-emerald-50 border-emerald-200 text-emerald-800 min-w-[280px] pointer-events-auto`;
        
        centerToast.innerHTML = `
            <span class="text-4xl mb-3">✅</span>
            <div class="text-base font-bold">${message}</div>
        `;

        document.body.appendChild(centerToast);

        // Animation d'apparition
        setTimeout(() => {
            centerToast.classList.remove("scale-90", "opacity-0");
            centerToast.classList.add("scale-100", "opacity-100");
        }, 50);

        // Animation de disparition et nettoyage
        setTimeout(() => {
            centerToast.classList.remove("scale-100", "opacity-100");
            centerToast.classList.add("scale-90", "opacity-0");
            setTimeout(() => { centerToast.remove(); }, 300);
        }, 2500);
        return;
    }

    if (!container) return;

    // Toast latéral classique pour les erreurs et infos
    const toast = document.createElement("div");
    toast.className = `flex items-center p-4 rounded-xl shadow-xl border text-sm font-medium transition-all duration-300 transform translate-y-4 opacity-0 pointer-events-auto min-w-[250px]`;

    if (type === "error") {
        toast.className += " bg-rose-50 border-rose-200 text-rose-800";
        toast.innerHTML = `<span class="mr-2 text-lg">❌</span><div class="flex-1">${message}</div>`;
    } else {
        toast.className += " bg-blue-50 border-blue-200 text-blue-800";
        toast.innerHTML = `<span class="mr-2 text-lg">ℹ️</span><div class="flex-1">${message}</div>`;
    }

    container.appendChild(toast);

    setTimeout(() => {
        toast.classList.remove("translate-y-4", "opacity-0");
        toast.classList.add("translate-y-0", "opacity-100");
    }, 50);

    setTimeout(() => {
        toast.classList.remove("translate-y-0", "opacity-100");
        toast.classList.add("translate-y-4", "opacity-0");
        setTimeout(() => { toast.remove(); }, 300);
    }, 3000);
}


// ===================================================
// SUPPRESSION D'UNE CONVERSATION COMPLÈTE
// ===================================================

/**
 * Demande une confirmation et envoie une requête DELETE à l'API pour supprimer la conversation active en entier.
 * 
 * @param {string} conversationId - L'ID de la conversation à supprimer.
 */
async function deleteConversation(conversationId) {
    const confirmed = await customConfirm("Attention ! Voulez-vous vraiment supprimer toute cette conversation ? Cette action est définitive.");
    
    if (!confirmed) {
        showToast("Suppression annulée", "info");
        return;
    }

    try {
        const response = await fetch(`${API_URL}/conversations/${conversationId}`, {
            method: "DELETE",
            headers: {
                "Authorization": `Bearer ${token}`,
                "x-api-key": API_KEY
            }
        });

        if (response.ok) {
            showToast("Conversation supprimée.", "success");
            activeConversationId = null;
            // Arrêt du polling automatique
            if (messageInterval) clearInterval(messageInterval); 

            // Réinitialisation de l'affichage

            if (chatPanel) chatPanel.classList.add("hidden");
            await loadUsers();
            showListColumn();
        } else {
            showToast("Impossible de supprimer la conversation.", "error");
        }
    } catch (error) {
        console.error("Erreur lors de la suppression de la conversation :", error);
        showToast("Une erreur est survenue.", "error");
    }
}
// ===================================================
// INITIALISATION AU CHARGEMENT DE LA PAGE
// ===================================================

/**
 * S'exécute lorsque le document HTML est complètement chargé et analysé.
 * Initialise les événements, pré-charge les données locales (anti-latence),
 * puis déclenche les requêtes serveur pour rafraîchir l'interface.
 */
document.addEventListener("DOMContentLoaded", () => {
    // Redirection au clic sur le bouton de profil
    const profileTrigger = document.getElementById("my-profile-trigger");
    if (profileTrigger) {
        profileTrigger.addEventListener("click", () => {
            window.location.href = "profil.html"; 
        });
    }

    // --- CHARGEMENT INSTANTANÉ DEPUIS LE LOCALSTORAGE (Anti-latence) ---
    // Affiche immédiatement les informations mises en cache avant l'appel API.
    const cachedAvatar = localStorage.getItem("userAvatar");
    const cachedName = localStorage.getItem("userName") || "Mon Profil";

    if (sidebarAvatar) {
        sidebarAvatar.src = getCleanAvatar(cachedAvatar, cachedName);
    }
    if (myName) {
        myName.textContent = cachedName;
    }   

    // Écouteur sur le bouton de suppression de la conversation active

    if (deleteConvBtn) {
        deleteConvBtn.addEventListener("click", () => {
            if (activeConversationId) {
                deleteConversation(activeConversationId);
            } else {
                showToast("Aucune conversation active à supprimer.", "info");
            }
        });
    }

    // Chargement initial des données serveur
    loadMyProfile();
    loadUsers(); 
});