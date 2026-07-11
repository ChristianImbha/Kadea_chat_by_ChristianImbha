// configuration de l'API Kadea
const API_URL = "https://kadea-chat-api.onrender.com"; 
const Workspace_API_KEY = "wksp_c3e1fb2ba091b7e4a9697b611e1d7168";
// Sécurisation de la page : Vérification immédiate du Token
const token = localStorage.getItem("token");
if (!token) {
   
    window.location.href = "login.html";
}

// Variables pour suivre l'état de la discussion active
let activeRoomId = null;

// Ciblage des éléments du DOM indispensables
const messageForm = document.getElementById("message-form");
const messageInput = document.getElementById("message-input");
const messagesContainer = document.getElementById("messages-container");
const chatPanel = document.getElementById("chat-panel");

// Éléments d'en-tête du chat actif
const activeChatTitle = document.getElementById("active-chat-title");
const activeChatStatus = document.getElementById("active-chat-status");
const activeChatAvatar = document.getElementById("active-chat-avatar");