// My Appointments page - Patient view
document.addEventListener('DOMContentLoaded', async () => {
    // Check if user is logged in as patient
    if (!requireAuth('patient')) return;
    
    await loadAppointments();
});

// Load patient's appointments
async function loadAppointments() {
    const loading = document.getElementById('loading');
    const appointmentsList = document.getElementById('appointmentsList');
    const emptyState = document.getElementById('emptyState');
    
    loading.classList.remove('hidden');
    appointmentsList.innerHTML = '';
    
    try {
        const appointments = await apiCall(API_ENDPOINTS.appointments);
        
        loading.classList.add('hidden');
        
        if (appointments.length === 0) {
            emptyState.classList.remove('hidden');
            appointmentsList.classList.add('hidden');
        } else {
            emptyState.classList.add('hidden');
            appointmentsList.classList.remove('hidden');
            displayAppointments(appointments);
        }
    } catch (error) {
        loading.classList.add('hidden');
        showNotification('Failed to load appointments', 'error');
    }
}

// Display appointments
function displayAppointments(appointments) {
    const appointmentsList = document.getElementById('appointmentsList');
    appointmentsList.innerHTML = '';
    
    appointments.forEach((appointment, index) => {
        const card = document.createElement('div');
        card.className = 'appointment-card';
        card.style.animationDelay = `${index * 0.1}s`;
        
        const statusClass = `status-${appointment.status}`;
        const statusText = appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1);
        
        card.innerHTML = `
            <div class="appointment-header">
                <div>
                    <h3 class="appointment-doctor">${appointment.doctor_name}</h3>
                    <p class="appointment-specialty">${appointment.doctor_specialty}</p>
                </div>
                <span class="appointment-status ${statusClass}">${statusText}</span>
            </div>
            <div class="appointment-info">
                <span>📅 ${formatDateTime(appointment.datetime)}</span>
            </div>
            <div class="appointment-actions">
                <button class="btn btn-outline" onclick="viewAppointmentDetails(${appointment.id})">View Details</button>
                ${appointment.status === 'waiting' ? `
                    <button class="btn btn-secondary" onclick="cancelAppointment(${appointment.id})">Cancel</button>
                ` : ''}
            </div>
        `;
        
        appointmentsList.appendChild(card);
    });
}

// View appointment details
async function viewAppointmentDetails(appointmentId) {
    try {
        const appointment = await apiCall(API_ENDPOINTS.appointmentDetail(appointmentId));
        
        const modal = document.getElementById('appointmentModal');
        const modalBody = document.getElementById('modalBody');
        
        const statusClass = `status-${appointment.status}`;
        const statusText = appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1);
        
        modalBody.innerHTML = `
            <div style="margin-bottom: 24px;">
                <span class="appointment-status ${statusClass}">${statusText}</span>
            </div>
            
            <div style="margin-bottom: 24px;">
                <h4 style="margin-bottom: 12px; color: var(--primary);">Doctor Information</h4>
                <p><strong>Name:</strong> ${appointment.doctor.full_name}</p>
                <p><strong>Specialty:</strong> ${appointment.doctor.specialty}</p>
            </div>
            
            <div style="margin-bottom: 24px;">
                <h4 style="margin-bottom: 12px; color: var(--primary);">Appointment Details</h4>
                <p><strong>Date & Time:</strong> ${formatDateTime(appointment.datetime)}</p>
                <p><strong>Booked on:</strong> ${formatDateTime(appointment.created_at)}</p>
            </div>
            
            ${appointment.status === 'completed' && appointment.conclusion ? `
                <div style="margin-bottom: 24px;">
                    <h4 style="margin-bottom: 12px; color: var(--primary);">Diagnosis</h4>
                    <p>${appointment.conclusion}</p>
                </div>
            ` : ''}
            
            ${appointment.status === 'completed' && appointment.medication ? `
                <div style="margin-bottom: 24px;">
                    <h4 style="margin-bottom: 12px; color: var(--primary);">Prescribed Medication</h4>
                    <p>${appointment.medication}</p>
                </div>
            ` : ''}
            
            <div class="modal-actions">
                <button class="btn btn-outline" onclick="closeAppointmentModal()">Close</button>
                ${appointment.status === 'waiting' ? `
                    <button class="btn btn-secondary" onclick="cancelAppointmentFromModal(${appointmentId})">Cancel Appointment</button>
                ` : ''}
            </div>
        `;
        
        modal.classList.remove('hidden');
        
        document.getElementById('modalClose').onclick = closeAppointmentModal;
        modal.onclick = (e) => {
            if (e.target === modal) closeAppointmentModal();
        };
    } catch (error) {
        showNotification('Failed to load appointment details', 'error');
    }
}

// Cancel appointment
async function cancelAppointment(appointmentId) {
    if (!confirm('Are you sure you want to cancel this appointment?')) {
        return;
    }
    
    try {
        await apiCall(API_ENDPOINTS.appointmentCancel(appointmentId), 'PUT');
        showNotification('Appointment cancelled successfully', 'success');
        await loadAppointments();
    } catch (error) {
        showNotification(error.error || 'Failed to cancel appointment', 'error');
    }
}

// Cancel appointment from modal
async function cancelAppointmentFromModal(appointmentId) {
    closeAppointmentModal();
    await cancelAppointment(appointmentId);
}

// Close appointment modal
function closeAppointmentModal() {
    const modal = document.getElementById('appointmentModal');
    modal.classList.add('hidden');
}
