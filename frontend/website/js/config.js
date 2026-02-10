// API Configuration
const API_BASE_URL = 'http://localhost:8000/';

// API Endpoints
const API_ENDPOINTS = {
    // Authentication
    signup: '/auth/signup/',
    otpRequest: '/auth/otp/request/',
    otpVerify: '/auth/otp/verify/',
    
    // Patients
    doctors: '/doctors/',
    doctorDetail: (id) => `/doctors/${id}/`,
    appointments: '/appointments/',
    appointmentCreate: '/appointments/create/',
    appointmentDetail: (id) => `/appointments/${id}/`,
    appointmentCancel: (id) => `/appointments/${id}/cancel/`,
    
    // Doctors
    doctorTodayAppointments: '/doctors/me/appointments/today/',
    doctorAppointmentDetail: (id) => `/doctors/appointments/${id}/`,
    appointmentConclude: (id) => `/appointments/${id}/conclude/`,
    
    // Admin
    adminDoctors: '/admin/doctors/',
    adminDoctorCreate: '/admin/doctors/create/',
    adminDoctorDelete: (id) => `/admin/doctors/${id}/`,
    adminPatients: '/admin/patients/',
    adminPatientDelete: (id) => `/admin/patients/${id}/`,
    adminAppointments: '/admin/appointments/',
    adminAppointmentDelete: (id) => `/admin/appointments/${id}/`,
    adminSwap: '/admin/swap-admin/'
};

// Helper function to make API calls
async function apiCall(endpoint, method = 'GET', data = null, requireAuth = true) {
    const headers = {
        'Content-Type': 'application/json'
    };
    
    if (requireAuth) {
        const token = localStorage.getItem('access_token');
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
    }
    
    const options = {
        method,
        headers
    };
    
    if (data && (method === 'POST' || method === 'PUT')) {
        options.body = JSON.stringify(data);
    }
    
    try {
        const response = await fetch(API_BASE_URL + endpoint, options);
        
        // Handle 401 Unauthorized
        if (response.status === 401 && requireAuth) {
            // Token expired or invalid
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');
            localStorage.removeItem('user');
            window.location.href = 'auth.html';
            return null;
        }
        
        // Handle 204 No Content
        if (response.status === 204) {
            return { success: true };
        }
        
        const result = await response.json();
        
        if (!response.ok) {
            throw result;
        }
        
        return result;
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

// Helper function to format date and time
function formatDateTime(dateTimeString) {
    const date = new Date(dateTimeString);
    const options = {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    };
    return date.toLocaleDateString('en-US', options);
}

// Helper function to format date only
function formatDate(dateString) {
    const date = new Date(dateString);
    const options = {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    };
    return date.toLocaleDateString('en-US', options);
}

// Helper function to format time only
function formatTime(timeString) {
    const [hours, minutes] = timeString.split(':');
    const date = new Date();
    date.setHours(hours, minutes);
    return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Helper function to show notification
function showNotification(message, type = 'success') {
    // You can implement a toast notification here
    alert(message);
}
