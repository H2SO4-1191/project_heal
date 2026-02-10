// Main page - Doctors listing
let allDoctors = [];

document.addEventListener('DOMContentLoaded', async () => {
    await loadDoctors();
    setupFilters();
});

// Load all doctors
async function loadDoctors() {
    const loading = document.getElementById('loading');
    const doctorsGrid = document.getElementById('doctorsGrid');
    const emptyState = document.getElementById('emptyState');
    
    loading.classList.remove('hidden');
    doctorsGrid.innerHTML = '';
    
    try {
        allDoctors = await apiCall(API_ENDPOINTS.doctors, 'GET', null, false);
        
        loading.classList.add('hidden');
        
        if (allDoctors.length === 0) {
            emptyState.classList.remove('hidden');
        } else {
            displayDoctors(allDoctors);
        }
    } catch (error) {
        loading.classList.add('hidden');
        showNotification('Failed to load doctors', 'error');
    }
}

// Display doctors in grid
function displayDoctors(doctors) {
    const doctorsGrid = document.getElementById('doctorsGrid');
    const emptyState = document.getElementById('emptyState');
    
    doctorsGrid.innerHTML = '';
    
    if (doctors.length === 0) {
        emptyState.classList.remove('hidden');
        doctorsGrid.classList.add('hidden');
        return;
    }
    
    emptyState.classList.add('hidden');
    doctorsGrid.classList.remove('hidden');
    
    doctors.forEach((doctor, index) => {
        const card = document.createElement('div');
        card.className = 'doctor-card';
        card.style.animationDelay = `${index * 0.1}s`;
        card.onclick = () => window.location.href = `doctor-detail.html?id=${doctor.id}`;
        
        const imageUrl = doctor.image || 'https://via.placeholder.com/300x200/0A5C5F/FFFFFF?text=' + encodeURIComponent(doctor.full_name);
        
        card.innerHTML = `
            <img src="${imageUrl}" alt="${doctor.full_name}" class="doctor-card-image">
            <div class="doctor-card-content">
                <h3 class="doctor-card-name">${doctor.full_name}</h3>
                <p class="doctor-card-specialty">${doctor.specialty}</p>
            </div>
        `;
        
        doctorsGrid.appendChild(card);
    });
}

// Setup filter functionality
function setupFilters() {
    const nameFilter = document.getElementById('nameFilter');
    const specialtyFilter = document.getElementById('specialtyFilter');
    const searchBtn = document.getElementById('searchBtn');
    const clearBtn = document.getElementById('clearBtn');
    
    searchBtn.addEventListener('click', applyFilters);
    clearBtn.addEventListener('click', clearFilters);
    
    // Allow enter key to search
    nameFilter.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') applyFilters();
    });
    
    specialtyFilter.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') applyFilters();
    });
}

// Apply filters
async function applyFilters() {
    const loading = document.getElementById('loading');
    const doctorsGrid = document.getElementById('doctorsGrid');
    
    const name = document.getElementById('nameFilter').value.trim();
    const specialty = document.getElementById('specialtyFilter').value.trim();
    
    // Build query string
    let query = '';
    const params = [];
    if (name) params.push(`name=${encodeURIComponent(name)}`);
    if (specialty) params.push(`specialty=${encodeURIComponent(specialty)}`);
    if (params.length > 0) query = '?' + params.join('&');
    
    loading.classList.remove('hidden');
    doctorsGrid.innerHTML = '';
    
    try {
        const doctors = await apiCall(API_ENDPOINTS.doctors + query, 'GET', null, false);
        loading.classList.add('hidden');
        displayDoctors(doctors);
    } catch (error) {
        loading.classList.add('hidden');
        showNotification('Failed to filter doctors', 'error');
    }
}

// Clear filters
function clearFilters() {
    document.getElementById('nameFilter').value = '';
    document.getElementById('specialtyFilter').value = '';
    displayDoctors(allDoctors);
}
