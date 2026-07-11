// configuration de l'API Kadea
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

// 1. FONCTION : Charger et afficher la liste des conversations (à gauche)
async function loadConversations() {
    try {
        // CORRECTION SWAGGER : La route est /conversations
        const response = await fetch(`${API_URL}/conversations`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`,
                "x-api-key": Workspace_API_KEY
            }
        });

        if (!response.ok) throw new Error("Impossible de récupérer les conversations.");

        const conversations = await response.json();
        renderConversationsList(conversations); 
    } catch (error) {
        console.error("Erreur lors du chargement des conversations :", error);
    }
}

// 2. FONCTION : Injecter la liste des conversations dans le HTML
function renderConversationsList(conversations) {
    const roomsContainer = document.getElementById("rooms-list");
    if (!roomsContainer) return;

    roomsContainer.innerHTML = ""; 

    conversations.forEach(conv => {
        const convElement = document.createElement("div");
        convElement.dataset.conversationId = conv.id;
        convElement.className = `conversation-item flex items-center space-x-3 p-3 hover:bg-slate-100 cursor-pointer rounded-xl transition ${activeConversationId === conv.id ? 'bg-slate-100' : ''}`;
        
        convElement.innerHTML = `
            <img src="${conv.avatar || 'https://via.placeholder.com/40'}" class="w-10 h-10 rounded-full object-cover" alt="Avatar">
            <div class="flex-1 min-w-0">
                <h3 class="text-sm font-semibold text-gray-800 truncate">${conv.name || 'Discussion privée'}</h3>
                <p class="text-xs text-gray-500 truncate">${conv.lastMessage || 'Aucun message'}</p>
            </div>
        `;

        convElement.addEventListener("click", () => selectConversation(conv));
        roomsContainer.appendChild(convElement);
    });
}

// 3. FONCTION : Sélectionner une conversation et charger son historique
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

// 4. FONCTION : Récupérer les messages de la conversation active
async function loadMessages(conversationId) {
    try {
        // CORRECTION SWAGGER : La route est /conversations/{id}/messages
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

// 5. FONCTION : Afficher les messages à l'écran
function renderMessages(messages) {
    if (!messagesContainer) return;
    messagesContainer.innerHTML = ""; 

    messages.forEach(msg => {
        // Attention : Vérifie bien que "userId" est stocké dans ton localStorage lors du Login !
        const isMe = msg.senderId === localStorage.getItem("userId"); 
        
        const messageBlock = document.createElement("div");
        messageBlock.className = `flex items-end space-x-2 max-w-[75%] ${isMe ? 'ml-auto justify-end' : ''}`;

        messageBlock.innerHTML = `
            <div class="${isMe ? 'bg-green-100 rounded-br-none' : 'bg-white rounded-bl-none'} text-gray-800 text-sm rounded-lg p-2.5 shadow-sm">
                ${!isMe ? `<p class="font-bold text-xs text-indigo-600 mb-0.5">${msg.senderName || 'Utilisateur'}</p>` : ''}
                <p>${msg.content}</p>
                <span class="block text-right text-[10px] text-gray-400 mt-1">${formatTime(msg.createdAt)}</span>
            </div>
        `;

        messagesContainer.appendChild(messageBlock);
    });

    // Scroll automatique vers le bas
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// 6. ÉCOUTEUR D'ÉVÉNEMENT : Gérer l'envoi d'un nouveau message
if (messageForm) {
    messageForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const content = messageInput.value.trim();
        if (!content || !activeConversationId) return;

        // Reset de l'input instantané pour fluidité UX
        messageInput.value = "";

        try {
            // CORRECTION SWAGGER : Route de type POST /conversations/{id}/messages
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

// Initialisation au chargement de la page
document.addEventListener("DOMContentLoaded", () => {
    loadConversations();
});
