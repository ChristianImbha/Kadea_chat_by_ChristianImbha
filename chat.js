// configuration de l'API
const API_URL = "https://kadea-chat-api.onrender.com"; 
const Workspace_API_KEY = 'wksp_c3e1fb2ba091b7e4a9697b611e1d7168';

// Éléments du profil utilisateur connecté
const myAvatar = document.getElementById("active-user-avatar"); 
const myName = document.getElementById("active-user-name"); 
const currentUserId = localStorage.getItem("userId");

// Sécurisation de la page : Vérification immédiate du Token
const token = localStorage.getItem("token") || sessionStorage.getItem("token");
if (!token) {
    window.location.href = "login.html";
}

// Variables pour suivre l'état de la discussion active
let activeConversationId = null;

// Ciblage des éléments du DOM indispensables
const messageForm = document.getElementById("message-form");
const messageInput = document.getElementById("message-input");
const messagesContainer = document.getElementById("messages-container");
const chatPanel = document.getElementById("chat-panel");

// Éléments d'en-tête du chat actif et colonnes
const activeChatTitle = document.getElementById("active-chat-title");
const activeChatStatus = document.getElementById("active-chat-status");
const activeChatAvatar = document.getElementById("active-chat-avatar");
const colLeft = document.getElementById("col-left");
const colRight = document.getElementById("col-right");
const backBtn = document.getElementById("back-to-list-btn");

// ===================================================
//  LOGIQUE RESPONSIVE : Affichage / Masquage mobile
// ===================================================

// Affiche le chat à droite et cache la liste de gauche sur mobile
function showChatColumn() {
    if (window.innerWidth < 768) { // Point de rupture standard Tailwind md (768px)
        if (colLeft) colLeft.classList.add("hidden");
        if (colRight) {
            colRight.classList.remove("hidden");
            colRight.classList.add("flex");
        }
    }
}

// Affiche la liste de gauche et cache le chat sur mobile (quand on clique sur Retour)
function showListColumn() {
    if (window.innerWidth < 768) {
        if (colRight) {
            colRight.classList.add("hidden");
            colRight.classList.remove("flex");
        }
        if (colLeft) colLeft.classList.remove("hidden");
    }
}

// Écouteur sur le bouton de retour en arrière
if (backBtn) {
    backBtn.addEventListener("click", showListColumn);
}

// Sécurité : Rétablit l'affichage complet si on élargit la fenêtre du navigateur
window.addEventListener("resize", () => {
    if (window.innerWidth >= 768) {
        if (colLeft) colLeft.classList.remove("hidden");
        if (colRight) {
            colRight.classList.remove("hidden");
            colRight.classList.add("flex");
        }
    } else {
        // Sur mobile, on affiche la liste par défaut
        showListColumn();
    }
});

// Fonction utilitaire pour formater l'heure
function formatTime(dateString) {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// 1. Charger et afficher la liste de TOUS les utilisateurs du Workspace sauf soi-même
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
        
        let usersArray = [];
        if (resJson.data && Array.isArray(resJson.data.users)) {
            usersArray = resJson.data.users;
        } else if (Array.isArray(resJson.data)) {
            usersArray = resJson.data;
        } else if (Array.isArray(resJson)) {
            usersArray = resJson;
        }

        let currentUserId = localStorage.getItem("userId");
        if (currentUserId) {
            currentUserId = currentUserId.replace(/['"]+/g, '').trim();
        }

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

// 2. FONCTION : Charger et afficher les infos de l'utilisateur connecté avec Fallback
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

        if (!response.ok) {
            console.warn("Route /auth/me rejetée, passage à la route de secours...");
            const currentUserId = localStorage.getItem("userId");
            response = await fetch(`${API_URL}/users/${currentUserId}`, {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`,
                    "x-api-key": Workspace_API_KEY
                }
            });
        }

        if (!response.ok) throw new Error("Impossible de récupérer le profil.");

        const resJson = await response.json();
        const userData = resJson.data || resJson;
        
        const myId = userData.id || userData._id;

        if (myId) {
            localStorage.setItem("userId", myId);
            if (myName) {
                myName.textContent = myId;
            }
        }

        if (myAvatar) {
            myAvatar.src = userData.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${myId || 'default'}`;
        }
    } catch (error) {
        console.error("Erreur profil :", error);
        const localId = localStorage.getItem("userId");
        if (myName && localId) myName.textContent = localId;
    }
}

// 3. FONCTION : Injecter la liste des utilisateurs dans le HTML à gauche
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
        userElement.dataset.targetUserId = user.id;
        userElement.dataset.conversationId = user.id; 
        userElement.className = `conversation-item flex items-center space-x-3 p-3 hover:bg-slate-100 cursor-pointer rounded-xl transition`;
        
        const displayAvatar = user.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.id}`;

        userElement.innerHTML = `
            <img src="${displayAvatar}" class="w-10 h-10 rounded-full object-cover" alt="Avatar">
            <div class="flex-1 min-w-0">
                <h3 class="text-sm font-semibold text-gray-800 truncate">${user.fullName || 'Utilisateur'}</h3>
                <p class="text-xs text-green-500 truncate">Cliquez pour discuter</p>
            </div>
        `;

        userElement.addEventListener("click", () => handleStartChat(user.id, user.fullName, displayAvatar));
        roomsContainer.appendChild(userElement);
    });
}

// 4. FONCTION INTERMÉDIAIRE : Cliquer sur un utilisateur 
async function handleStartChat(targetUserId, displayName, displayAvatar) {
    try {
        console.log("Clic détecté pour l'utilisateur :", targetUserId);

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

        console.log("Statut HTTP reçu de l'API :", response.status);

        if (!response.ok) throw new Error(`Erreur API : Statut ${response.status}`);

        const result = await response.json();
        console.log("Données reçues de la conversation :", result);
        
        let conversationId = null;
        if (result.data) {
            conversationId = result.data.id || (result.data.conversation && result.data.conversation.id);
        } else {
            conversationId = result.id;
        }

        console.log("ID final extrait pour l'affichage :", conversationId);

        if (conversationId) {
            selectConversation({
                id: conversationId,
                name: displayName,
                avatar: displayAvatar
            });
        } else {
            console.error("Structure JSON inattendue : impossible de lire l'ID de la conversation.");
        }
    } catch (error) {
        console.error("Erreur lors de l'initialisation de la discussion :", error);
    }
}

// 5. FONCTION : Sélectionner une conversation et charger son historique
async function selectConversation(conv) {
    activeConversationId = conv.id;
    
    if (activeChatTitle) activeChatTitle.textContent = conv.name || 'Discussion privée';
    if (activeChatStatus) activeChatStatus.textContent = "En ligne";
    if (activeChatAvatar) activeChatAvatar.src = conv.avatar;
    
    if (chatPanel) chatPanel.classList.remove("hidden");

    document.querySelectorAll(".conversation-item").forEach(el => {
        if (el.dataset.conversationId === conv.id) {
            el.classList.add("bg-slate-100");
        } else {
            el.classList.remove("bg-slate-100");
        }
    });

    await loadMessages(conv.id);

    // 🚀 BASCULE MOBILE : Une fois le chat configuré, on l'affiche et on cache les contacts
    showChatColumn();
}

// 6. FONCTION : Récupérer les messages de la conversation active
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

// 7. FONCTION : Afficher les messages à l'écran (Corrigée pour l'alignement gauche/droite)
function renderMessages(messagesData) {
    const messagesContainer = document.getElementById("messages-container"); 
    if (!messagesContainer) return;
    
    messagesContainer.innerHTML = ""; 

    let messages = [];
    if (Array.isArray(messagesData)) {
        messages = messagesData;
    } else if (messagesData && messagesData.data) {
        if (Array.isArray(messagesData.data)) {
            messages = messagesData.data;
        } else if (messagesData.data.messages && Array.isArray(messagesData.data.messages)) {
            messages = messagesData.data.messages;
        }
    } else if (messagesData && messagesData.messages && Array.isArray(messagesData.messages)) {
        messages = messagesData.messages;
    }

    if (messages.length === 0) {
        messagesContainer.innerHTML = "<p class='text-center text-gray-500 py-4'>Aucun message dans cette discussion.</p>";
        return;
    } 

    let currentUserId = localStorage.getItem("userId");
    if (currentUserId) {
        currentUserId = currentUserId.replace(/['"]+/g, '').trim(); 
    }

   messages.forEach(msg => {
        let senderId = msg.senderId || msg.userId || (msg.sender && msg.sender.id);
        if (senderId) {
            senderId = String(senderId).replace(/['"]+/g, '').trim();
        }
        
        const senderName = msg.sender?.fullName || '';
        const isMe = (senderId === currentUserId) || (senderName === "Christian Imbha");
        
        const messageBlock = document.createElement("div");
        messageBlock.className = `flex w-full ${isMe ? 'justify-end' : 'justify-start'} mb-2`;

        messageBlock.innerHTML = `
            <div class="${isMe ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-white text-gray-800 rounded-tl-none border border-gray-100'} max-w-xl text-sm rounded-2xl p-3 shadow-sm flex flex-col">
                ${!isMe ? `<p class="font-bold text-xs text-blue-600 mb-0.5">${senderName || 'Utilisateur'}</p>` : ''}
                <p class="break-words">${msg.content || msg.text || ''}</p>
                <span class="block text-right text-[10px] ${isMe ? 'text-blue-200' : 'text-gray-400'} mt-1">${formatTime(msg.createdAt)}</span>
            </div>
        `;

        messagesContainer.appendChild(messageBlock);
    });

    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// 8. ÉCOUTEUR D'ÉVÉNEMENT : Gérer l'envoi d'un nouveau message
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
            } else {
                alert("Erreur lors de l'envoi du message.");
            }
        } catch (error) {
            console.error("Erreur envoi:", error);
        }
    });
}

// Initialisation au chargement de la page
document.addEventListener("DOMContentLoaded", () => {
    loadUsers(); 
    loadMyProfile();
});

// Fonction pour afficher une superbe notification Toast
function showToast(message, type = "success") {
    const container = document.getElementById("toast-container");
    if (!container) return;

    const toast = document.createElement("div");
    
    toast.className = `flex items-center p-4 rounded-xl shadow-lg border text-sm font-medium transition-all duration-300 transform translate-y-2 opacity-0`;

    if (type === "success") {
        toast.className += " bg-emerald-50 border-emerald-200 text-emerald-800";
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

    container.appendChild(toast);

    setTimeout(() => {
        toast.classList.remove("translate-y-2", "opacity-0");
    }, 10);

    setTimeout(() => {
        toast.classList.add("translate-y-2", "opacity-0");
        setTimeout(() => {
            toast.remove();
        }, 300);
    }, 4000);
}