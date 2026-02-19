/**
 * Système d'utilitaires centralisé pour l'application
 * Gestion des toasts, fetch, validation, sécurité
 */

// ==================== STRING & HTML UTILITIES ====================

/**
 * Échappe les caractères HTML pour prévenir XSS
 */
function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return String(text || '').replace(/[&<>"']/g, m => map[m]);
}

/**
 * Vérifie et nettoie une URL
 */
function safeUrl(value) {
  const url = String(value || '').trim();
  if (!url) return '';
  return /^https?:\/\//i.test(url) ? url : '';
}

/**
 * Extrait les initiales d'un nom
 */
function getInitials(name = '') {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('');
}

/**
 * Formate une date en français
 */
function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('fr-FR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * Formate un nombre en français
 */
function formatNumber(num) {
  return new Intl.NumberFormat('fr-FR').format(num);
}

/**
 * Arrondit à N décimales
 */
function round(num, decimals = 2) {
  return Math.round(num * Math.pow(10, decimals)) / Math.pow(10, decimals);
}

// ==================== NOTIFICATIONS ====================

/**
 * Affiche une notification toast
 * @param {string} message - Message à afficher
 * @param {string} type - Type: 'success', 'error', 'info', 'warning'
 * @param {number} duration - Durée d'affichage en ms (0 = permanent)
 */
function showToast(message, type = 'info', duration = 3000) {
  const container = document.getElementById('toast-container') || createToastContainer();
  
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.setAttribute('role', 'status');
  toast.setAttribute('aria-live', type === 'error' ? 'assertive' : 'polite');
  toast.textContent = message;
  
  container.appendChild(toast);
  
  // Animation d'entrée
  setTimeout(() => toast.classList.add('toast-visible'), 10);
  
  if (duration > 0) {
    setTimeout(() => {
      toast.classList.remove('toast-visible');
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }
  
  return toast;
}

/**
 * Crée le conteneur pour les toasts s'il n'existe pas
 */
function createToastContainer() {
  const container = document.createElement('div');
  container.id = 'toast-container';
  container.setAttribute('role', 'region');
  container.setAttribute('aria-label', 'Notifications');
  document.body.appendChild(container);
  return container;
}

/**
 * Masque un toast
 */
function hideToast(toast) {
  if (toast) {
    toast.classList.remove('toast-visible');
    setTimeout(() => toast.remove(), 300);
  }
}

// ==================== FETCH WRAPPER ====================

/**
 * Wrapper pour fetch avec gestion d'erreurs standardisée
 * @param {string} url - URL de la requête
 * @param {object} options - Options de fetch
 * @param {string} authHeader - Header d'auth optionnel
 * @returns {Promise<any>}
 */
async function safeFetch(url, options = {}, authHeader = null) {
  try {
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };
    
    if (authHeader) {
      headers['Authorization'] = authHeader;
    }
    
    const response = await fetch(url, {
      ...options,
      headers,
    });
    
    // Vérifier le statut HTTP
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error(`Fetch error (${url}):`, error);
    throw error;
  }
}

/**
 * Wrapper pour POST avec gestion d'erreurs
 */
async function safePost(url, data, authHeader = null) {
  return safeFetch(url, {
    method: 'POST',
    body: JSON.stringify(data),
  }, authHeader);
}

/**
 * Wrapper pour GET avec gestion d'erreurs
 */
async function safeGet(url, authHeader = null) {
  return safeFetch(url, { method: 'GET' }, authHeader);
}

// ==================== FORMULAIRES ====================

/**
 * Désactive/réactive les boutons d'un formulaire avec spinner
 */
function setFormLoading(formOrButton, isLoading = true) {
  const elements = formOrButton.tagName === 'FORM' 
    ? formOrButton.querySelectorAll('button, [type="submit"]')
    : [formOrButton];
    
  elements.forEach(el => {
    el.disabled = isLoading;
    if (isLoading) {
      el.setAttribute('aria-busy', 'true');
      el.classList.add('is-loading');
      el.dataset.originalText = el.textContent;
      el.innerHTML = '<span class="spinner"></span> ' + el.textContent;
    } else {
      el.removeAttribute('aria-busy');
      el.classList.remove('is-loading');
      el.textContent = el.dataset.originalText || el.textContent;
    }
  });
}

/**
 * Récupère les données d'un formulaire
 */
function getFormData(form) {
  const formData = new FormData(form);
  const data = {};
  formData.forEach((value, key) => {
    data[key] = value;
  });
  return data;
}

/**
 * Valide un email
 */
function isValidEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

/**
 * Valide un numéro de téléphone (format simple)
 */
function isValidPhone(phone) {
  return phone.replace(/\D/g, '').length >= 8;
}

// ==================== SÉCURITÉ ====================

/**
 * Génère un token CSRF (côté client)
 */
function generateCSRFToken() {
  const token = Array.from(crypto.getRandomValues(new Uint8Array(32)))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  sessionStorage.setItem('csrf-token', token);
  return token;
}

/**
 * Récupère le token CSRF stocké
 */
function getCSRFToken() {
  return sessionStorage.getItem('csrf-token') || generateCSRFToken();
}

/**
 * Crée un header Authorization Basic Auth
 */
function createAuthHeader(username, password) {
  const credentials = btoa(`${username}:${password}`);
  return `Basic ${credentials}`;
}

/**
 * Débounce une fonction
 */
function debounce(func, delay = 300) {
  let timeoutId;
  return function(...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
}

/**
 * Crée une classe pour gérer le localStorage de manière sûre
 */
class SafeStorage {
  static set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.error('Storage error:', e);
    }
  }

  static get(key) {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch (e) {
      console.error('Storage error:', e);
      return null;
    }
  }

  static remove(key) {
    try {
      localStorage.removeItem(key);
    } catch (e) {
      console.error('Storage error:', e);
    }
  }

  static clear() {
    try {
      localStorage.clear();
    } catch (e) {
      console.error('Storage error:', e);
    }
  }
}

// ==================== INITIALISATION ====================

/**
 * Initialise les utilitaires au chargement de la page
 */
function initUtils() {
  // Générer token CSRF si nécessaire
  getCSRFToken();
  
  // Créer conteneur toasts
  createToastContainer();

  // Theme toggle
  const savedTheme = SafeStorage.get('theme') || 'light';
  if (savedTheme === 'dark') {
    document.body.classList.add('dark-mode');
  }
  const toggleBtn = document.createElement('button');
  toggleBtn.className = 'theme-toggle';
  toggleBtn.type = 'button';
  toggleBtn.textContent = savedTheme === 'dark' ? '☀️ Mode clair' : '🌙 Mode sombre';
  toggleBtn.addEventListener('click', () => {
    const isDark = document.body.classList.toggle('dark-mode');
    SafeStorage.set('theme', isDark ? 'dark' : 'light');
    toggleBtn.textContent = isDark ? '☀️ Mode clair' : '🌙 Mode sombre';
  });
  document.body.appendChild(toggleBtn);
  
  // Ajouter gestionnaire pour les erreurs globales
  window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
    showToast('Une erreur est survenue. Veuillez réessayer.', 'error');
  });
}

// Initialiser au chargement
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initUtils);
} else {
  initUtils();
}
