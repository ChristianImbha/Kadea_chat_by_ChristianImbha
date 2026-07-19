// ===================================================
// CONFIGURATION ET VARIABLES GLOBALES
// ===================================================
const API_URL = "https://kadea-chat-api.onrender.com"; 
const Workspace_API_KEY = 'wksp_c3e1fb2ba091b7e4a9697b611e1d7168';

// Sécurisation de la page : Vérification immédiate du Token
const token = localStorage.getItem("token") || sessionStorage.getItem("token");
if (!token) {
    window.location.href = "index.html";
}

let activeConversationId = null;
let messageInterval = null; // Permet de stocker le rafraîchissement automatique

// Ciblage des éléments du DOM
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
function showChatColumn() {
    if (window.innerWidth < 768) {
        if (colLeft) colLeft.classList.add("hidden");
        if (colRight) {
            colRight.classList.remove("hidden");
            colRight.classList.add("flex");
        }
    }
}

function showListColumn() {
    if (window.innerWidth < 768) {
        if (colRight) {
            colRight.classList.add("hidden");
            colRight.classList.remove("flex");
        }
        if (colLeft) colLeft.classList.remove("hidden");
    }
}
let lastWidth = window.innerWidth;
if (backBtn) {
    backBtn.addEventListener("click", showListColumn);
}

window.addEventListener("resize", () => {
    // Si la largeur n'a pas changé (ex: le clavier change la hauteur mais pas la largeur), on ne fait rien
    if (window.innerWidth === lastWidth) return;
    
    // Met à jour la dernière largeur connue
    lastWidth = window.innerWidth;

    if (window.innerWidth >= 768) {
        if (colLeft) colLeft.classList.remove("hidden");
        if (colRight) {
            colRight.classList.remove("hidden");
            colRight.classList.add("flex");
        }
    } else {
        // En cas de vrai changement de largeur sur mobile (ex: passage en mode paysage)
        showListColumn();
    }
});

// Fonction utilitaire pour formater l'heure
function formatTime(dateString) {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// ===================================================
// GESTION DU PROFIL UTILISATEUR CONNECTÉ
// ===================================================
async function loadMyProfile() {
    try {
        let response = await fetch(`${API_URL}/auth/me`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`,
                "x-api-key": Workspace_API_KEY
            }
        });

        // Fallback en cas d'échec de /auth/me
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
                    "x-api-key": Workspace_API_KEY
                }
            });
        }

        if (!response.ok) throw new Error("Impossible de récupérer le profil utilisateur.");

        const resJson = await response.json();
        const userData = resJson.data || resJson;
        const myId = userData.id || userData._id;

        if (myId) {
            localStorage.setItem("userId", myId);
            if (myName) {
                myName.textContent = userData.fullName || "Utilisateur";
            }
            if (myAvatar) {
                myAvatar.src = userData.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${myId}`;
            }
            
            // Mise à jour de l'avatar du haut "Mon Profil" 
            if (sidebarAvatar) {
                sidebarAvatar.src = userData.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${myId}`;
            }
            
            // Stockage des informations pour la page Profil.html
            localStorage.setItem("userAvatar", userData.avatarUrl || "");
            localStorage.setItem("userName", userData.fullName || "");
            localStorage.setItem("userEmail", userData.email || "");
        }
    } catch (error) {
        console.error("Erreur profil :", error);
        const localId = localStorage.getItem("userId");
        const localName = localStorage.getItem("userName");
        if (myName) myName.textContent = localName || localId || "Utilisateur";
        
        // Sécurité en cas d'erreur réseau : on tente de charger depuis le localStorage
        if (sidebarAvatar) {
            sidebarAvatar.src = localStorage.getItem("userAvatar") || "https://via.placeholder.com/40";
        }
    }
}

// ===================================================
// GESTION DES UTILISATEURS ET CONVERSATIONS
// ===================================================
async function loadUsers() {
    try {
        const response = await fetch(`${API_URL}/users`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`,
                "x-api-key": Workspace_API_KEY
            }
        });

        if (!response.ok) throw new Error("Impossible de récupérer la liste des utilisateurs.");
        
        const resJson = await response.json();
        let usersArray = resJson.data?.users || resJson.data || resJson;
        if (!Array.isArray(usersArray)) usersArray = [];

        let currentUserId = localStorage.getItem("userId");
        if (currentUserId) {
            currentUserId = currentUserId.replace(/['"]+/g, '').trim();
        }

        // Filtrer pour ne pas s'afficher soi-même dans la liste
        const filteredUsers = usersArray.filter(user => {
            if (!user.id) return true; 
            const cleanUserId = String(user.id).replace(/['"]+/g, '').trim();
            return cleanUserId !== currentUserId;
        });

        renderUsersList(filteredUsers); 
    } catch (error) {
        console.error("Erreur lors du chargement des utilisateurs :", error);
    }
}

function renderUsersList(users) {
    const roomsContainer = document.getElementById("rooms-list");
    if (!roomsContainer) return;

    roomsContainer.innerHTML = ""; 

    if (users.length === 0) {
        roomsContainer.innerHTML = `<p class="text-xs text-gray-400 text-center p-4">Aucun autre utilisateur trouvé.</p>`;
        return;
    }

    users.forEach(user => {
        const userElement = document.createElement("div");
        userElement.dataset.conversationId = user.id; 
        // hover:bg-slate-100 en mode clair, hover:bg-slate-800 en mode sombre
        userElement.className = `conversation-item flex items-center space-x-3 p-3 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer rounded-xl transition text-slate-600 dark:text-slate-300`;
        
        const displayAvatar = user.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.id}`;

        userElement.innerHTML = `
            <img src="${displayAvatar}" class="w-10 h-10 rounded-full object-cover" alt="Avatar">
            <div class="flex-1 min-w-0">
                <!-- text-slate-800 en mode clair, dark:text-slate-100 en mode sombre -->
                <h3 class="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">${user.fullName || 'Utilisateur'}</h3>
                <p class="text-xs text-blue-500 truncate">Cliquez pour discuter</p>
            </div>
        `;

        userElement.addEventListener("click", () => handleStartChat(user.id, user.fullName, displayAvatar));
        roomsContainer.appendChild(userElement);
    });
}

async function handleStartChat(targetUserId, displayName, displayAvatar) {
    try {
        const response = await fetch(`${API_URL}/conversations`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`,
                "x-api-key": Workspace_API_KEY
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

async function selectConversation(conv) {
    activeConversationId = conv.id;
    
    if (activeChatTitle) activeChatTitle.textContent = conv.name || 'Discussion privée';
    if (activeChatStatus) activeChatStatus.textContent = "En ligne";
    if (activeChatAvatar) activeChatAvatar.src = conv.avatar;
    if (chatPanel) chatPanel.classList.remove("hidden");

    // Nettoyage complet des anciens états actifs (on enlève tout pour éviter les conflits)
    document.querySelectorAll(".conversation-item").forEach(item => {
        item.classList.remove("bg-blue-50", "text-blue-600", "dark:bg-slate-800", "dark:text-white");
        
        // On remet les classes de base neutres
        item.classList.add("text-slate-600", "dark:text-slate-300");
        const title = item.querySelector("h3");
        if (title) {
            title.classList.remove("text-blue-600", "text-white");
            title.classList.add("text-slate-800", "dark:text-slate-100");
        }
    });
    
    // Ajout du style actif intelligent (Bleu en clair, Ardoise en sombre)
    const selectedElement = document.querySelector(`[data-conversation-id="${conv.targetUserId}"]`);
    if (selectedElement) {       
        selectedElement.classList.remove("text-slate-600", "dark:text-slate-300");
        // bg-blue-50 en mode clair / dark:bg-slate-800 en mode sombre
        selectedElement.classList.add("bg-blue-50", "text-blue-600", "dark:bg-slate-800", "dark:text-white");         
        
        // On ajuste aussi la couleur du titre H3 pour qu'il soit bleu ou blanc
        const title = selectedElement.querySelector("h3");
        if (title) {
            title.classList.remove("text-slate-800", "dark:text-slate-100");
            title.classList.add("text-blue-600", "dark:text-white");
        }
    }

    // Charger les messages immédiatement
    await loadMessages(conv.id);
    showChatColumn();

    // Rafraîchissement automatique toutes les 4 secondes (Polling)
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
async function loadMessages(conversationId) {
    try {
         const response = await fetch(`${API_URL}/conversations/${conversationId}/messages`, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${token}`,
                "x-api-key": Workspace_API_KEY
            }
        });

        if (!response.ok) throw new Error("Erreur de récupération des messages.");

        const messages = await response.json();
        renderMessages(messages);
    } catch (error) {
        console.error("Erreur messages:", error);
    }
}

function renderMessages(messagesData) {
    if (!messagesContainer) return;
    
    // Garder une trace du scroll utilisateur avant de vider le conteneur
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
        const isMe = (senderId === currentUserId) || (senderName === "Christian Imbha");
        const msgId = msg.id || msg._id;
        
        const messageBlock = document.createElement("div");
        messageBlock.className = `flex w-full ${isMe ? 'justify-end' : 'justify-start'} mb-2 group`;

        messageBlock.innerHTML = `
            <div class="flex items-center space-x-2">
                ${isMe && msgId ? `
                    <button onclick="deleteMessage('${msgId}')" class="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition text-xs p-1" title="Supprimer">
                        🗑️
                    </button>
                ` : ''}
                <div class="${isMe ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-white text-gray-800 rounded-tl-none border border-gray-100'} max-w-xl text-sm rounded-2xl p-3 shadow-sm flex flex-col">
                    ${!isMe ? `<p class="font-bold text-xs text-blue-600 mb-0.5">${senderName || 'Utilisateur'}</p>` : ''}
                    <p class="break-words">${msg.content || msg.text || ''}</p>
                    <span class="block text-right text-[10px] ${isMe ? 'text-blue-200' : 'text-gray-400'} mt-1">${formatTime(msg.createdAt)}</span>
                </div>
            </div>
        `;

        messagesContainer.appendChild(messageBlock);
    });

    // Auto-scroll uniquement si l'utilisateur était déjà en bas (évite de le couper s'il lit un ancien message)
    if (isAtBottom) {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
}

if (messageForm) {
    messageForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const content = messageInput.value.trim();
        if (!content || !activeConversationId) return;

        messageInput.value = "";

        try {
            const response = await fetch(`${API_URL}/conversations/${activeConversationId}/messages`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`,
                    "x-api-key": Workspace_API_KEY
                },
                body: JSON.stringify({ content: content })
            });

            if (response.ok) {
                await loadMessages(activeConversationId);
                messagesContainer.scrollTop = messagesContainer.scrollHeight; // Force le scroll après envoi
            } else {
                alert("Erreur lors de l'envoi du message.");
            }
        } catch (error) {
            console.error("Erreur envoi:", error);
        }
    });
}

// ===================================================
// MODAL DE CONFIRMATION & SUPPRESSION MESSAGES
// ===================================================
function customConfirm() {
    return new Promise((resolve) => {
        const modal = document.getElementById("confirm-modal");
        const okBtn = document.getElementById("confirm-ok-btn");
        const cancelBtn = document.getElementById("confirm-cancel-btn");

        if (!modal || !okBtn || !cancelBtn) {
            resolve(confirm("Voulez-vous vraiment supprimer ce message ?"));
            return;
        }

        modal.classList.remove("hidden");
        modal.classList.add("flex");
        if (window.lucide) lucide.createIcons();

        const handleOk = () => { cleanup(); resolve(true); };
        const handleCancel = () => { cleanup(); resolve(false); };

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
                "x-api-key": Workspace_API_KEY
            }
        });

        if (response.ok) {
            showToast("Message supprimé avec succès !", "success");
            await loadMessages(activeConversationId);
        } else {
            showToast("Impossible de supprimer ce message.", "error");
        }
    } catch (error) {
        console.error("Erreur lors de la suppression du message :", error);
        showToast("Une erreur est survenue.", "error");
    }
}

// ===================================================
// TOAST NOTIFICATIONS
// ===================================================
function showToast(message, type = "success") {
    const container = document.getElementById("toast-container");
    
    if (type === "success") {
        const centerToast = document.createElement("div");
        centerToast.className = `fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[10001] flex flex-col items-center p-6 rounded-2xl shadow-2xl border text-center transition-all duration-300 transform scale-90 opacity-0 bg-emerald-50 border-emerald-200 text-emerald-800 min-w-[280px] pointer-events-auto`;
        
        centerToast.innerHTML = `
            <span class="text-4xl mb-3">✅</span>
            <div class="text-base font-bold">${message}</div>
        `;

        document.body.appendChild(centerToast);

        setTimeout(() => {
            centerToast.classList.remove("scale-90", "opacity-0");
            centerToast.classList.add("scale-100", "opacity-100");
        }, 50);

        setTimeout(() => {
            centerToast.classList.remove("scale-100", "opacity-100");
            centerToast.classList.add("scale-90", "opacity-0");
            setTimeout(() => { centerToast.remove(); }, 300);
        }, 2500);
        return;
    }

    if (!container) return;

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
// SUPPRESSION D'UNE CONVERSATION COMPLETE
// ===================================================
async function deleteConversation(conversationId) {
    if (!confirm("Attention ! Voulez-vous vraiment supprimer toute cette conversation ? Cette action est irréversible.")) return;

    try {
        const response = await fetch(`${API_URL}/conversations/${conversationId}`, {
            method: "DELETE",
            headers: {
                "Authorization": `Bearer ${token}`,
                "x-api-key": Workspace_API_KEY
            }
        });

        if (response.ok) {
            showToast("Conversation supprimée.", "success");
            activeConversationId = null;
            if (messageInterval) clearInterval(messageInterval); // Arrête le polling
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
document.addEventListener("DOMContentLoaded", () => {
    // Écouteur pour rediriger vers le profil existant
    const profileTrigger = document.getElementById("my-profile-trigger");
    if (profileTrigger) {
        profileTrigger.addEventListener("click", () => {
            window.location.href = "profil.html"; 
        });
    }

    // ÉCOUTEUR SUR LE BOUTON DE SUPPRESSION
    if (deleteConvBtn) {
        deleteConvBtn.addEventListener("click", () => {
            if (activeConversationId) {
                deleteConversation(activeConversationId);
            } else {
                showToast("Aucune conversation active à supprimer.", "info");
            }
        });
    }

    // Chargement initial des données
    loadMyProfile();
    loadUsers(); 
});