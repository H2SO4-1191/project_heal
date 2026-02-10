// Doctor detail page
let currentDoctor = null;

document.addEventListener('DOMContentLoaded', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const doctorId = urlParams.get('id');
    
    if (!doctorId) {
        window.location.href = 'index.html';
        return;
    }
    
    await loadDoctorProfile(doctorId);
    setupBookingForm();
});

// Load doctor profile
async function loadDoctorProfile(doctorId) {
    const loading = document.getElementById('loading');
    const profile = document.getElementById('doctorProfile');
    
    loading.classList.remove('hidden');
    profile.classList.add('hidden');
    
    try {
        currentDoctor = await apiCall(API_ENDPOINTS.doctorDetail(doctorId), 'GET', null, false);
        
        loading.classList.add('hidden');
        profile.classList.remove('hidden');
        
        displayDoctorProfile(currentDoctor);
    } catch (error) {
        loading.classList.add('hidden');
        showNotification('Failed to load doctor profile', 'error');
        setTimeout(() => window.location.href = 'index.html', 2000);
    }
}

// Display doctor profile
function displayDoctorProfile(doctor) {
    document.getElementById('doctorName').textContent = doctor.full_name;
    document.getElementById('doctorSpecialty').textContent = doctor.specialty;
    document.getElementById('doctorEmail').textContent = doctor.email;
    document.getElementById('doctorPhone').textContent = doctor.phone_number;
    document.getElementById('doctorAbout').textContent = doctor.about || 'No additional information available.';
    
    const imageUrl = doctor.image || 'https://via.placeholder.com/200/0A5C5F/FFFFFF?text=' + encodeURIComponent(doctor.full_name);
    document.getElementById('doctorImage').src = imageUrl;
    document.getElementById('doctorImage').alt = doctor.full_name;
    
    // Display availability
    const availabilityList = document.getElementById('availabilityList');
    availabilityList.innerHTML = '';
    
    if (doctor.availabilities && doctor.availabilities.length > 0) {
        doctor.availabilities.forEach(avail => {
            const item = document.createElement('div');
            item.className = 'availability-item';
            item.innerHTML = `
                <div class="availability-day">${avail.day}</div>
                <div class="availability-time">${formatTime(avail.start_time)} - ${formatTime(avail.end_time)}</div>
            `;
            availabilityList.appendChild(item);
        });
    } else {
        availabilityList.innerHTML = '<p>No availability information provided.</p>';
    }
}

// Setup booking form
function setupBookingForm() {
    const bookBtn = document.getElementById('bookAppointmentBtn');
    
    bookBtn.addEventListener('click', handleBooking);
}

// Handle booking
async function handleBooking() {
    // Check if user is logged in
    if (!isLoggedIn()) {
        showLoginPrompt();
        return;
    }
    
    const user = getCurrentUser();
    if (user.user_type !== 'patient') {
        showNotification('Only patients can book appointments', 'error');
        return;
    }
    
    const appointmentDate = document.getElementById('appointmentDate').value;
    
    if (!appointmentDate) {
        showNotification('Please select a date and time', 'error');
        return;
    }
    
    // Convert to ISO format
    const dateTime = new Date(appointmentDate).toISOString();
    
    try {
        const result = await apiCall(API_ENDPOINTS.appointmentCreate, 'POST', {
            doctor: currentDoctor.id,
            datetime: dateTime
        });
        
        showNotification('Appointment booked successfully!', 'success');
        setTimeout(() => window.location.href = 'my-appointments.html', 1500);
    } catch (error) {
        const errorMsg = error.non_field_errors ? error.non_field_errors[0] : 'Failed to book appointment';
        showNotification(errorMsg, 'error');
    }
}

// Show login prompt modal
function showLoginPrompt() {
    const modal = document.getElementById('bookingModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalBody = document.getElementById('modalBody');
    
    modalTitle.textContent = 'Login Required';
    modalBody.innerHTML = `
        <p style="margin-bottom: 20px;">You need to be logged in as a patient to book an appointment.</p>
        <div style="display: flex; gap: 12px;">
            <a href="auth.html" class="btn btn-primary">Login / Sign Up</a>
            <button class="btn btn-outline" onclick="closeModal()">Cancel</button>
        </div>
    `;
    
    modal.classList.remove('hidden');
    
    document.getElementById('modalClose').onclick = closeModal;
    modal.onclick = (e) => {
        if (e.target === modal) closeModal();
    };
}

// Close modal
function closeModal() {
    const modal = document.getElementById('bookingModal');
    modal.classList.add('hidden');
}
