// configuration de l'API
const API_URL = "https://kadea-chat-api.onrender.com"; 
const Workspace_API_KEY = 'wksp_c3e1fb2ba091b7e4a9697b611e1d7168';

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

// Éléments d'en-tête du chat actif
const activeChatTitle = document.getElementById("active-chat-title");
const activeChatStatus = document.getElementById("active-chat-status");
const activeChatAvatar = document.getElementById("active-chat-avatar");

// Fonction utilitaire pour formater l'heure
function formatTime(dateString) {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// 1. Charger et afficher la liste de TOUS les utilisateurs du Workspace
async function loadUsers() {
    try {
        // On appelle la route qui liste les utilisateurs (ex: /users ou /auth/users selon ton API Kadea)
        const response = await fetch(`${API_URL}/users`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`,
                "x-api-key": Workspace_API_KEY
            }
        });

        if (!response.ok) throw new Error("Impossible de récupérer la liste des utilisateurs.");
        
        const data = await response.json();
        
        let usersArray = [];
        // Sécurisation de la structure comme on a fait avant
        if (data.data) {
            usersArray = Array.isArray(data.data) ? data.data : (data.data.users || []);
        } else if (Array.isArray(data)) {
            usersArray = data;
        }

        // On filtre la liste pour NE PAS s'afficher soi-même dans la liste
        const currentUserId = localStorage.getItem("userId");
        const filteredUsers = usersArray.filter(user => user.id !== currentUserId);

        renderUsersList(filteredUsers); 
    } catch (error) {
        console.error("Erreur lors du chargement des utilisateurs :", error);
    }
}

// 2. FONCTION : Injecter la liste des utilisateurs dans le HTML à gauche
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
        userElement.className = `conversation-item flex items-center space-x-3 p-3 hover:bg-slate-100 cursor-pointer rounded-xl transition`;
        
        const displayAvatar = user.avatarUrl || 'https://via.placeholder.com/40';

        userElement.innerHTML = `
            <img src="${displayAvatar}" class="w-10 h-10 rounded-full object-cover" alt="Avatar">
            <div class="flex-1 min-w-0">
                <h3 class="text-sm font-semibold text-gray-800 truncate">${user.fullName || 'Utilisateur'}</h3>
                <p class="text-xs text-green-500 truncate">Cliquez pour discutez</p>
            </div>
        `;

        // Quand on clique sur l'utilisateur, on lance ou récupère la discussion
        userElement.addEventListener("click", () => handleStartChat(user.id, user.fullName, displayAvatar));
        roomsContainer.appendChild(userElement);
    });
}

// 3  fonction intermédiaire au clic sur un utilisateur
async function handleStartChat(targetUserId, displayName, displayAvatar) {
    try {
        // On tente de créer la conversation avec cet utilisateur
        const response = await fetch(`${API_URL}/conversations`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`,
                "x-api-key": Workspace_API_KEY
            }
        });

        const result = await response.json();
        
        // Si l'API renvoie le salon créé (ou déjà existant)
        let conversationId = null;
        if (result.data && result.data.id) {
            conversationId = result.data.id;
        } else if (result.id) {
            conversationId = result.id;
        }

        if (conversationId) {
            // On utilise ta fonction selectConversation existante pour ouvrir le chat !
            selectConversation({
                id: conversationId,
                name: displayName,
                avatar: displayAvatar
            });
        }
    } catch (error) {
        console.error("Erreur lors de l'ouverture de la discussion :", error);
    }
}

// 4. FONCTION : Sélectionner une conversation et charger son historique
async function selectConversation(conv) {
    activeConversationId = conv.id;
    
    // Mettre à jour l'en-tête du chat actif
    if (activeChatTitle) activeChatTitle.textContent = conv.name || 'Discussion privée';
    if (activeChatStatus) activeChatStatus.textContent = "En ligne";
    if (activeChatAvatar) activeChatAvatar.src = conv.avatar || 'https://via.placeholder.com/40';
    
    if (chatPanel) chatPanel.classList.remove("hidden");

    // Changement visuel immédiat de la classe active sans re-fetch inutile
    document.querySelectorAll(".conversation-item").forEach(el => {
        if (el.dataset.conversationId === conv.id) {
            el.classList.add("bg-slate-100");
        } else {
            el.classList.remove("bg-slate-100");
        }
    });

    await loadMessages(conv.id);
}

// 5. FONCTION : Récupérer les messages de la conversation active
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

// 6. FONCTION : Afficher les messages à l'écran (Ajustée pour Tailwind)
function renderMessages(messagesData) {
    const messagesContainer = document.getElementById("messages-container"); 
    if (!messagesContainer) return;
    
    messagesContainer.innerHTML = ""; // On vide le conteneur

    // Sécurisation : On cherche le tableau des messages dans la réponse de l'API
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

    // Si aucun message ou si le salon est vide, on s'arrête proprement
    if (messages.length === 0) {
        messagesContainer.innerHTML = "<p class='text-center text-gray-500 py-4'>Aucun message dans cette discussion.</p>";
        return;
    } 

    // Détermination de ton propre ID (depuis le localStorage pour rester cohérent avec ton application)
    const currentUserId = localStorage.getItem("userId") || "063b24e5-ef46-400a-a7c9-27735d4101d0"; 

    messages.forEach(msg => {
        // Vérification de l'expéditeur (gestion des différents formats de l'API Kadea)
        const isMe = msg.senderId === currentUserId || 
                     (msg.sender && msg.sender.id === currentUserId) || 
                     msg.userId === currentUserId;
        
        const messageBlock = document.createElement("div");
        // Utilisation de w-full et justification pour bloquer les messages du bon côté
        messageBlock.className = `flex w-full ${isMe ? 'justify-end' : 'justify-start'} mb-2`;

        messageBlock.innerHTML = `
            <div class="${isMe ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-white text-gray-800 rounded-tl-none border border-gray-100'} max-w-xl text-sm rounded-2xl p-3 shadow-sm flex flex-col">
                ${!isMe ? `<p class="font-bold text-xs text-blue-600 mb-0.5">${msg.sender?.fullName || 'Utilisateur'}</p>` : ''}
                <p class="break-words">${msg.content || msg.text || ''}</p>
                <span class="block text-right text-[10px] ${isMe ? 'text-blue-200' : 'text-gray-400'} mt-1">${formatTime(msg.createdAt)}</span>
            </div>
        `;

        messagesContainer.appendChild(messageBlock);
    });

    // Scroll automatique vers le bas fluide
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// 7. ÉCOUTEUR D'ÉVÉNEMENT : Gérer l'envoi d'un nouveau message
if (messageForm) {
    messageForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const content = messageInput.value.trim();
        if (!content || !activeConversationId) return;

        // Reset de l'input instantané pour fluidité UX
        messageInput.value = "";

        try {
            // Route de type POST /conversations/{id}/messages
            const response = await fetch(`${API_URL}/conversations/${activeConversationId}/messages`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`,
                    "x-api-key": Workspace_API_KEY
                },
                body: JSON.stringify({ content: content }) // Payload attendu par l'API : { content: "..." }
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
// 8. GESTION DE LA CRÉATION D'UNE NOUVELLE DISCUSSION VIA L'INTERFACE
const btnAddConversation = document.getElementById("btn-add-conversation");
const newUserIdInput = document.getElementById("new-user-id");

if (btnAddConversation && newUserIdInput) {
    btnAddConversation.addEventListener("click", async () => {
        const targetUserId = newUserIdInput.value.trim();

        if (!targetUserId) {
            alert("Veuillez mettre l'ID d'un utilisateur pour commencer une discussion.");
            return;
        }

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
                    name: "Discussion Privée"
                })
            });

            if (response.ok) {
                alert("Discussion créée avec succès !");
                newUserIdInput.value = ""; // Vide le champ
                await loadConversations(); // Recharge la liste de gauche pour l'afficher
            } else {
                const errorData = await response.json();
                alert(`Erreur : ${errorData.message || "Impossible de créer la discussion"}`);
            }
        } catch (error) {
            console.error("Erreur création conversation :", error);
            alert("Une erreur réseau est survenue.");
        }
    });
}

// Initialisation au chargement de la page
document.addEventListener("DOMContentLoaded", () => {
    loadUsers(); // On charge les personnes enregistrées directement !
});
