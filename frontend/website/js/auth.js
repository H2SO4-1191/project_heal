// Authentication Helper Functions

// Check if user is logged in
function isLoggedIn() {
    const token = localStorage.getItem('access_token');
    const user = localStorage.getItem('user');
    return !!(token && user);
}

// Get current user
function getCurrentUser() {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
}

// Logout function
function logout() {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    window.location.href = 'auth.html';
}

// Redirect based on user type
function redirectToDashboard() {
    const user = getCurrentUser();
    if (!user) return;
    switch (user.user_type) {
        case 'patient':
            window.location.href = 'index.html';
            break;
        case 'doctor':
            window.location.href = 'doctor-dashboard.html';
            break;
        case 'admin':
            window.location.href = 'admin-dashboard.html';
            break;
    }
}

// Update navigation based on auth state
function updateNavigation() {
    const authSection = document.getElementById('authSection');
    const userSection = document.getElementById('userSection');
    const userName = document.getElementById('userName');
    const logoutBtn = document.getElementById('logoutBtn');
    const myAppointmentsLink = document.getElementById('myAppointmentsLink');
    
    if (isLoggedIn()) {
        const user = getCurrentUser();
        
        if (authSection) authSection.classList.add('hidden');
        if (userSection) {
            userSection.classList.remove('hidden');
            if (userName) userName.textContent = user.full_name || user.email;
        }
        
        if (logoutBtn) {
            logoutBtn.addEventListener('click', logout);
        }
        
        // Show/hide appointments link based on user type
        if (myAppointmentsLink) {
            if (user.user_type === 'patient') {
                myAppointmentsLink.classList.remove('hidden');
            } else {
                myAppointmentsLink.classList.add('hidden');
            }
        }
    } else {
        if (authSection) authSection.classList.remove('hidden');
        if (userSection) userSection.classList.add('hidden');
        if (myAppointmentsLink) myAppointmentsLink.classList.add('hidden');
    }
}

// Check if user has required permission for a page
function requireAuth(requiredType = null) {
    if (!isLoggedIn()) {
        window.location.href = 'auth.html';
        return false;
    }
    
    if (requiredType) {
        const user = getCurrentUser();
        if (user.user_type !== requiredType) {
            redirectToDashboard();
            return false;
        }
    }
    
    return true;
}

// Initialize navigation on page load
document.addEventListener('DOMContentLoaded', () => {
    updateNavigation();
});
