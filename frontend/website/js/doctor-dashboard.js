// Doctor Dashboard
document.addEventListener('DOMContentLoaded', async () => {
    // Check if user is logged in as doctor
    if (!requireAuth('doctor')) return;
    
    displayTodayDate();
    await loadTodayAppointments();
});

// Display today's date
function displayTodayDate() {
    const todayDate = document.getElementById('todayDate');
    const today = new Date();
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    todayDate.textContent = today.toLocaleDateString('en-US', options);
}

// Load today's appointments
async function loadTodayAppointments() {
    const loading = document.getElementById('loading');
    const appointmentsList = document.getElementById('appointmentsList');
    const emptyState = document.getElementById('emptyState');
    
    loading.classList.remove('hidden');
    appointmentsList.innerHTML = '';
    
    try {
        const appointments = await apiCall(API_ENDPOINTS.doctorTodayAppointments);
        
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
        
        card.innerHTML = `
            <div class="appointment-header">
                <div>
                    <h3 class="appointment-doctor">${appointment.patient_name}</h3>
                </div>
                <span class="appointment-status status-${appointment.status}">Waiting</span>
            </div>
            <div class="appointment-info">
                <span>⏰ ${new Date(appointment.datetime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
            <div class="appointment-actions">
                <button class="btn btn-primary" onclick="viewAppointmentDetails(${appointment.id})">View Patient Details</button>
            </div>
        `;
        
        appointmentsList.appendChild(card);
    });
}

// View appointment details
async function viewAppointmentDetails(appointmentId) {
    try {
        const appointment = await apiCall(API_ENDPOINTS.doctorAppointmentDetail(appointmentId));
        
        const modal = document.getElementById('appointmentModal');
        const modalBody = document.getElementById('modalBody');
        
        // Build previous appointments HTML
        let previousAppointmentsHtml = '';
        if (appointment.previous_appointments && appointment.previous_appointments.length > 0) {
            previousAppointmentsHtml = `
                <div style="margin-bottom: 24px;">
                    <h4 style="margin-bottom: 12px; color: var(--primary);">Previous Appointments</h4>
                    ${appointment.previous_appointments.map(prev => `
                        <div style="padding: 12px; background: var(--primary-light); border-radius: 8px; margin-bottom: 8px;">
                            <p><strong>Date:</strong> ${formatDateTime(prev.datetime)}</p>
                            <p><strong>Diagnosis:</strong> ${prev.conclusion || 'N/A'}</p>
                            <p><strong>Medication:</strong> ${prev.medication || 'N/A'}</p>
                        </div>
                    `).join('')}
                </div>
            `;
        }
        
        modalBody.innerHTML = `
            <div style="margin-bottom: 24px;">
                <h4 style="margin-bottom: 12px; color: var(--primary);">Patient Information</h4>
                <p><strong>Name:</strong> ${appointment.patient.full_name}</p>
                <p><strong>Age:</strong> ${appointment.patient.age || 'N/A'}</p>
                <p><strong>Gender:</strong> ${appointment.patient.gender || 'N/A'}</p>
                <p><strong>Phone:</strong> ${appointment.patient.phone_number}</p>
                <p><strong>Email:</strong> ${appointment.patient.email}</p>
                <p><strong>Chronic Diseases:</strong> ${appointment.patient.chronic_diseases || 'None'}</p>
            </div>
            
            <div style="margin-bottom: 24px;">
                <h4 style="margin-bottom: 12px; color: var(--primary);">Appointment Details</h4>
                <p><strong>Date & Time:</strong> ${formatDateTime(appointment.datetime)}</p>
                <p><strong>Status:</strong> ${appointment.status}</p>
            </div>
            
            ${previousAppointmentsHtml}
            
            ${appointment.status === 'waiting' ? `
                <form id="concludeForm" style="margin-top: 32px; padding-top: 24px; border-top: 2px solid var(--border);">
                    <h4 style="margin-bottom: 16px; color: var(--primary);">Conclude Appointment</h4>
                    
                    <div class="form-group">
                        <label for="conclusion">Diagnosis / Conclusion</label>
                        <textarea id="conclusion" class="form-input" rows="4" required></textarea>
                    </div>
                    
                    <div class="form-group">
                        <label for="medication">Prescribed Medication</label>
                        <textarea id="medication" class="form-input" rows="3"></textarea>
                    </div>
                    
                    <div class="form-group">
                        <label for="chronicDiseases">Update Chronic Diseases (Optional)</label>
                        <textarea id="chronicDiseases" class="form-input" rows="2">${appointment.patient.chronic_diseases || ''}</textarea>
                    </div>
                    
                    <div class="modal-actions">
                        <button type="button" class="btn btn-outline" onclick="closeAppointmentModal()">Cancel</button>
                        <button type="submit" class="btn btn-primary">Conclude Appointment</button>
                    </div>
                </form>
            ` : `
                <div style="margin-top: 32px; padding-top: 24px; border-top: 2px solid var(--border);">
                    <h4 style="margin-bottom: 12px; color: var(--primary);">Appointment Concluded</h4>
                    <p><strong>Diagnosis:</strong> ${appointment.conclusion || 'N/A'}</p>
                    <p><strong>Medication:</strong> ${appointment.medication || 'N/A'}</p>
                </div>
                <div class="modal-actions">
                    <button class="btn btn-outline" onclick="closeAppointmentModal()">Close</button>
                </div>
            `}
        `;
        
        modal.classList.remove('hidden');
        
        // Setup conclude form if appointment is waiting
        if (appointment.status === 'waiting') {
            const concludeForm = document.getElementById('concludeForm');
            concludeForm.addEventListener('submit', (e) => concludeAppointment(e, appointmentId));
        }
        
        document.getElementById('modalClose').onclick = closeAppointmentModal;
        modal.onclick = (e) => {
            if (e.target === modal) closeAppointmentModal();
        };
    } catch (error) {
        showNotification('Failed to load appointment details', 'error');
    }
}

// Conclude appointment
async function concludeAppointment(e, appointmentId) {
    e.preventDefault();
    
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const conclusion = document.getElementById('conclusion').value;
    const medication = document.getElementById('medication').value;
    const chronicDiseases = document.getElementById('chronicDiseases').value;
    
    const data = {
        conclusion,
        medication
    };
    
    if (chronicDiseases) {
        data.chronic_diseases = chronicDiseases;
    }
    
    submitBtn.disabled = true;
    submitBtn.textContent = 'Concluding...';
    
    try {
        await apiCall(API_ENDPOINTS.appointmentConclude(appointmentId), 'PUT', data);
        
        showNotification('Appointment concluded successfully', 'success');
        closeAppointmentModal();
        await loadTodayAppointments();
    } catch (error) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Conclude Appointment';
        showNotification(error.error || 'Failed to conclude appointment', 'error');
    }
}

// Close appointment modal
function closeAppointmentModal() {
    const modal = document.getElementById('appointmentModal');
    modal.classList.add('hidden');
}
