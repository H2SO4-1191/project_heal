// Admin Dashboard
let currentTab = 'doctors';
let storedNewOtp = '';
let storedNewEmail = '';

document.addEventListener('DOMContentLoaded', async () => {
    // Check if user is logged in as admin
    if (!requireAuth('admin')) return;
    
    await loadStatistics();
    await loadDoctors();
    setupTabs();
    setupForms();
});

// Load statistics
async function loadStatistics() {
    try {
        const [doctors, patients, appointments] = await Promise.all([
            apiCall(API_ENDPOINTS.adminDoctors),
            apiCall(API_ENDPOINTS.adminPatients),
            apiCall(API_ENDPOINTS.adminAppointments)
        ]);
        
        document.getElementById('totalDoctors').textContent = doctors.length;
        document.getElementById('totalPatients').textContent = patients.length;
        document.getElementById('totalAppointments').textContent = appointments.length;
        
        // Count today's appointments
        const today = new Date().toISOString().split('T')[0];
        const todayCount = appointments.filter(apt => apt.datetime.startsWith(today)).length;
        document.getElementById('todayAppointments').textContent = todayCount;
    } catch (error) {
        showNotification('Failed to load statistics', 'error');
    }
}

// Setup tabs
function setupTabs() {
    const tabs = document.querySelectorAll('.admin-tab');
    
    tabs.forEach(tab => {
        tab.addEventListener('click', async () => {
            const tabName = tab.dataset.tab;
            
            // Update active tab
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            // Show/hide tab content
            document.querySelectorAll('.tab-content').forEach(content => {
                content.classList.add('hidden');
            });
            document.getElementById(`${tabName}Tab`).classList.remove('hidden');
            
            currentTab = tabName;
            
            // Load data for the tab
            switch (tabName) {
                case 'doctors':
                    await loadDoctors();
                    break;
                case 'patients':
                    await loadPatients();
                    break;
                case 'appointments':
                    await loadAppointments();
                    break;
            }
        });
    });
}

// Setup forms
function setupForms() {
    document.getElementById('addDoctorBtn').addEventListener('click', showDoctorModal);
    document.getElementById('cancelDoctorBtn').addEventListener('click', closeDoctorModal);
    document.getElementById('doctorForm').addEventListener('submit', handleDoctorSubmit);
    document.getElementById('addAvailabilityBtn').addEventListener('click', addAvailabilityRow);
    document.getElementById('filterAppointmentsBtn').addEventListener('click', loadAppointments);
    document.getElementById('swapAdminForm').addEventListener('submit', handleSwapAdminRequest);
    document.getElementById('verifySwapBtn').addEventListener('click', handleSwapAdminVerify);
}

// ==================== DOCTORS TAB ====================

async function loadDoctors() {
    const tbody = document.getElementById('doctorsTableBody');
    tbody.innerHTML = '<tr><td colspan="5" style="text-align: center;">Loading...</td></tr>';
    
    try {
        const doctors = await apiCall(API_ENDPOINTS.adminDoctors);
        
        tbody.innerHTML = '';
        
        if (doctors.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align: center;">No doctors found</td></tr>';
            return;
        }
        
        doctors.forEach(doctor => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${doctor.full_name}</td>
                <td>${doctor.email}</td>
                <td>${doctor.specialty}</td>
                <td>${doctor.phone_number}</td>
                <td class="table-actions">
                    <button class="btn btn-outline" style="padding: 6px 12px; font-size: 13px;" onclick="viewDoctorDetails(${doctor.id})">View</button>
                    <button class="btn btn-outline" style="padding: 6px 12px; font-size: 13px;" onclick="deleteDoctor(${doctor.id}, '${doctor.full_name}')">Delete</button>
                </td>
            `;
            tbody.appendChild(row);
        });
    } catch (error) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: var(--error);">Failed to load doctors</td></tr>';
    }
}

function showDoctorModal() {
    const modal = document.getElementById('doctorModal');
    document.getElementById('doctorForm').reset();
    
    // Reset availability inputs to one row
    const availabilityInputs = document.getElementById('availabilityInputs');
    availabilityInputs.innerHTML = `
        <div class="availability-row">
            <select class="form-input-small availability-day">
                <option value="saturday">Saturday</option>
                <option value="sunday">Sunday</option>
                <option value="monday">Monday</option>
                <option value="tuesday">Tuesday</option>
                <option value="wednesday">Wednesday</option>
                <option value="thursday">Thursday</option>
                <option value="friday">Friday</option>
            </select>
            <input type="time" class="form-input-small availability-start" value="09:00">
            <input type="time" class="form-input-small availability-end" value="17:00">
            <button type="button" class="btn-icon" onclick="this.parentElement.remove()">×</button>
        </div>
    `;
    
    modal.classList.remove('hidden');
    
    document.getElementById('modalClose').onclick = closeDoctorModal;
}

function closeDoctorModal() {
    const modal = document.getElementById('doctorModal');
    modal.classList.add('hidden');
}

function addAvailabilityRow() {
    const availabilityInputs = document.getElementById('availabilityInputs');
    const newRow = document.createElement('div');
    newRow.className = 'availability-row';
    newRow.innerHTML = `
        <select class="form-input-small availability-day">
            <option value="saturday">Saturday</option>
            <option value="sunday">Sunday</option>
            <option value="monday">Monday</option>
            <option value="tuesday">Tuesday</option>
            <option value="wednesday">Wednesday</option>
            <option value="thursday">Thursday</option>
            <option value="friday">Friday</option>
        </select>
        <input type="time" class="form-input-small availability-start" value="09:00">
        <input type="time" class="form-input-small availability-end" value="17:00">
        <button type="button" class="btn-icon" onclick="this.parentElement.remove()">×</button>
    `;
    availabilityInputs.appendChild(newRow);
}

async function handleDoctorSubmit(e) {
    e.preventDefault();
    
    const submitBtn = e.target.querySelector('button[type="submit"]');
    
    // Collect availability data
    const availabilities = [];
    const availabilityRows = document.querySelectorAll('.availability-row');
    availabilityRows.forEach(row => {
        availabilities.push({
            day: row.querySelector('.availability-day').value,
            start_time: row.querySelector('.availability-start').value,
            end_time: row.querySelector('.availability-end').value
        });
    });
    
    const imageFile = document.getElementById('doctorImage').files[0];
    
    // Use FormData if image is present, otherwise use JSON
    if (imageFile) {
        const formData = new FormData();
        formData.append('email', document.getElementById('doctorEmail').value);
        formData.append('full_name', document.getElementById('doctorName').value);
        formData.append('phone_number', document.getElementById('doctorPhone').value);
        formData.append('specialty', document.getElementById('doctorSpecialty').value);
        formData.append('about', document.getElementById('doctorAbout').value);
        formData.append('availabilities', JSON.stringify(availabilities));
        formData.append('image', imageFile);
        
        submitBtn.disabled = true;
        submitBtn.textContent = 'Saving...';
        
        try {
            // Manual fetch for FormData
            const token = localStorage.getItem('access_token');
            const response = await fetch(API_BASE_URL + API_ENDPOINTS.adminDoctorCreate, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });
            
            if (!response.ok) {
                const error = await response.json();
                throw error;
            }
            
            showNotification('Doctor added successfully', 'success');
            closeDoctorModal();
            await loadDoctors();
            await loadStatistics();
            
            submitBtn.disabled = false;
            submitBtn.textContent = 'Save Doctor';
        } catch (error) {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Save Doctor';
            
            let errorMsg = 'Failed to add doctor';
            if (error.email) errorMsg = error.email[0];
            
            showNotification(errorMsg, 'error');
        }
    } else {
        // No image, use JSON
        const formData = {
            email: document.getElementById('doctorEmail').value,
            full_name: document.getElementById('doctorName').value,
            phone_number: document.getElementById('doctorPhone').value,
            specialty: document.getElementById('doctorSpecialty').value,
            about: document.getElementById('doctorAbout').value,
            availabilities: availabilities
        };
        
        submitBtn.disabled = true;
        submitBtn.textContent = 'Saving...';
        
        try {
            await apiCall(API_ENDPOINTS.adminDoctorCreate, 'POST', formData);
            
            showNotification('Doctor added successfully', 'success');
            closeDoctorModal();
            await loadDoctors();
            await loadStatistics();
            
            submitBtn.disabled = false;
            submitBtn.textContent = 'Save Doctor';
        } catch (error) {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Save Doctor';
            
            let errorMsg = 'Failed to add doctor';
            if (error.email) errorMsg = error.email[0];
            
            showNotification(errorMsg, 'error');
        }
    }
}

async function deleteDoctor(doctorId, doctorName) {
    if (!confirm(`Are you sure you want to delete ${doctorName}?`)) {
        return;
    }
    
    try {
        await apiCall(API_ENDPOINTS.adminDoctorDelete(doctorId), 'DELETE');
        showNotification('Doctor deleted successfully', 'success');
        await loadDoctors();
        await loadStatistics();
    } catch (error) {
        showNotification('Failed to delete doctor', 'error');
    }
}

// ==================== PATIENTS TAB ====================

async function loadPatients() {
    const tbody = document.getElementById('patientsTableBody');
    tbody.innerHTML = '<tr><td colspan="6" style="text-align: center;">Loading...</td></tr>';
    
    try {
        const patients = await apiCall(API_ENDPOINTS.adminPatients);
        
        tbody.innerHTML = '';
        
        if (patients.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align: center;">No patients found</td></tr>';
            return;
        }
        
        patients.forEach(patient => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${patient.full_name}</td>
                <td>${patient.email}</td>
                <td>${patient.phone_number}</td>
                <td>${patient.age || 'N/A'}</td>
                <td>${patient.gender || 'N/A'}</td>
                <td class="table-actions">
                    <button class="btn btn-outline" style="padding: 6px 12px; font-size: 13px;" onclick="viewPatientDetails(${patient.id})">View</button>
                    <button class="btn btn-outline" style="padding: 6px 12px; font-size: 13px;" onclick="deletePatient(${patient.id}, '${patient.full_name}')">Delete</button>
                </td>
            `;
            tbody.appendChild(row);
        });
    } catch (error) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--error);">Failed to load patients</td></tr>';
    }
}

async function deletePatient(patientId, patientName) {
    if (!confirm(`Are you sure you want to delete ${patientName}?`)) {
        return;
    }
    
    try {
        await apiCall(API_ENDPOINTS.adminPatientDelete(patientId), 'DELETE');
        showNotification('Patient deleted successfully', 'success');
        await loadPatients();
        await loadStatistics();
    } catch (error) {
        showNotification('Failed to delete patient', 'error');
    }
}

// ==================== APPOINTMENTS TAB ====================

async function loadAppointments() {
    const tbody = document.getElementById('appointmentsTableBody');
    tbody.innerHTML = '<tr><td colspan="6" style="text-align: center;">Loading...</td></tr>';
    
    // Get filter values
    const status = document.getElementById('statusFilter').value;
    const period = document.getElementById('periodFilter').value;
    
    // Build query string
    let query = '';
    const params = [];
    if (status) params.push(`status=${status}`);
    if (period) params.push(`period=${period}`);
    if (params.length > 0) query = '?' + params.join('&');
    
    try {
        const appointments = await apiCall(API_ENDPOINTS.adminAppointments + query);
        
        tbody.innerHTML = '';
        
        if (appointments.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align: center;">No appointments found</td></tr>';
            return;
        }
        
        appointments.forEach(appointment => {
            const row = document.createElement('tr');
            const statusClass = `status-${appointment.status}`;
            
            row.innerHTML = `
                <td>#${appointment.id}</td>
                <td>${appointment.doctor_name}</td>
                <td>${appointment.patient_name}</td>
                <td>${formatDateTime(appointment.datetime)}</td>
                <td><span class="appointment-status ${statusClass}">${appointment.status}</span></td>
                <td class="table-actions">
                    <button class="btn btn-outline" style="padding: 6px 12px; font-size: 13px;" onclick="viewAppointmentDetails(${appointment.id})">View</button>
                    <button class="btn btn-outline" style="padding: 6px 12px; font-size: 13px;" onclick="deleteAppointment(${appointment.id})">Delete</button>
                </td>
            `;
            tbody.appendChild(row);
        });
    } catch (error) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--error);">Failed to load appointments</td></tr>';
    }
}

async function deleteAppointment(appointmentId) {
    if (!confirm('Are you sure you want to delete this appointment?')) {
        return;
    }
    
    try {
        await apiCall(API_ENDPOINTS.adminAppointmentDelete(appointmentId), 'DELETE');
        showNotification('Appointment deleted successfully', 'success');
        await loadAppointments();
        await loadStatistics();
    } catch (error) {
        showNotification('Failed to delete appointment', 'error');
    }
}

// ==================== SETTINGS TAB ====================

async function handleSwapAdminRequest(e) {
    e.preventDefault();
    
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const newEmail = document.getElementById('newAdminEmail').value;
    
    submitBtn.disabled = true;
    submitBtn.textContent = 'Requesting OTPs...';
    
    try {
        const result = await apiCall(API_ENDPOINTS.adminSwap, 'POST', {
            step: 'request',
            new_email: newEmail
        });
        
        storedNewEmail = newEmail;
        storedNewOtp = result.new_otp_for_verification;
        
        document.getElementById('otpVerification').classList.remove('hidden');
        
        showNotification('OTPs sent! Check console.', 'success');
        
        submitBtn.disabled = false;
        submitBtn.textContent = 'Request OTP';
    } catch (error) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Request OTP';
        showNotification(error.error || 'Failed to request OTPs', 'error');
    }
}

async function handleSwapAdminVerify() {
    const verifyBtn = document.getElementById('verifySwapBtn');
    const currentOtp = document.getElementById('currentOtp').value;
    const newOtp = document.getElementById('newOtp').value;
    
    if (!currentOtp || !newOtp) {
        showNotification('Please enter both OTP codes', 'error');
        return;
    }
    
    verifyBtn.disabled = true;
    verifyBtn.textContent = 'Verifying...';
    
    try {
        await apiCall(API_ENDPOINTS.adminSwap, 'POST', {
            step: 'verify',
            new_email: storedNewEmail,
            current_otp: currentOtp,
            new_otp: newOtp
        });
        
        showNotification('Admin email updated successfully! Please login again.', 'success');
        
        // Logout after 2 seconds
        setTimeout(() => {
            logout();
        }, 2000);
    } catch (error) {
        verifyBtn.disabled = false;
        verifyBtn.textContent = 'Verify & Swap';
        showNotification(error.error || 'Failed to verify OTPs', 'error');
    }
}

// ==================== VIEW DETAILS FUNCTIONS ====================

async function viewDoctorDetails(doctorId) {
    try {
        const doctor = await apiCall(API_ENDPOINTS.doctorDetail(doctorId));
        
        const modal = document.getElementById('doctorModal');
        const modalTitle = document.getElementById('doctorModalTitle');
        const doctorForm = document.getElementById('doctorForm');
        
        modalTitle.textContent = 'Doctor Details';
        
        // Hide the form and show read-only details
        doctorForm.style.display = 'none';
        
        const modalBody = modal.querySelector('.modal-body');
        const detailsDiv = document.createElement('div');
        detailsDiv.id = 'doctorDetailsView';
        detailsDiv.innerHTML = `
            <div style="margin-bottom: 24px;">
                ${doctor.image ? `<img src="${doctor.image}" alt="${doctor.full_name}" style="width: 150px; height: 150px; border-radius: 8px; object-fit: cover; margin-bottom: 16px;">` : ''}
                <h3 style="margin-bottom: 8px;">${doctor.full_name}</h3>
                <p style="color: var(--primary); font-size: 18px; margin-bottom: 16px;">${doctor.specialty}</p>
            </div>
            
            <div style="margin-bottom: 16px;">
                <strong>Email:</strong> ${doctor.email}
            </div>
            
            <div style="margin-bottom: 16px;">
                <strong>Phone:</strong> ${doctor.phone_number}
            </div>
            
            <div style="margin-bottom: 16px;">
                <strong>About:</strong><br>
                ${doctor.about || 'N/A'}
            </div>
            
            <div style="margin-bottom: 16px;">
                <strong>Availability:</strong><br>
                ${doctor.availabilities && doctor.availabilities.length > 0 ? 
                    doctor.availabilities.map(avail => `
                        <div style="padding: 8px; background: var(--primary-light); border-radius: 4px; margin-top: 8px;">
                            <strong style="text-transform: capitalize;">${avail.day}:</strong> 
                            ${formatTime(avail.start_time)} - ${formatTime(avail.end_time)}
                        </div>
                    `).join('') : 
                    'No availability set'
                }
            </div>
            
            <div style="display: flex; gap: 12px; justify-content: flex-end; margin-top: 24px;">
                <button class="btn btn-outline" onclick="closeDoctorDetailsModal()">Close</button>
            </div>
        `;
        
        modalBody.appendChild(detailsDiv);
        modal.classList.remove('hidden');
        
        document.getElementById('modalClose').onclick = closeDoctorDetailsModal;
    } catch (error) {
        showNotification('Failed to load doctor details', 'error');
    }
}

function closeDoctorDetailsModal() {
    const modal = document.getElementById('doctorModal');
    const doctorForm = document.getElementById('doctorForm');
    const detailsView = document.getElementById('doctorDetailsView');
    
    if (detailsView) {
        detailsView.remove();
    }
    
    doctorForm.style.display = 'block';
    modal.classList.add('hidden');
}

async function viewPatientDetails(patientId) {
    try {
        // Fetch patient details using the admin patients endpoint
        const patients = await apiCall(API_ENDPOINTS.adminPatients);
        const patient = patients.find(p => p.id === patientId);
        
        if (!patient) {
            throw new Error('Patient not found');
        }
        
        // Create a simple modal for patient details
        const modalHtml = `
            <div class="modal" id="patientDetailsModal" style="display: flex;">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>Patient Details</h3>
                        <button class="modal-close" onclick="closePatientDetailsModal()">&times;</button>
                    </div>
                    <div class="modal-body">
                        <div style="margin-bottom: 16px;">
                            <strong>Full Name:</strong> ${patient.full_name}
                        </div>
                        
                        <div style="margin-bottom: 16px;">
                            <strong>Email:</strong> ${patient.email}
                        </div>
                        
                        <div style="margin-bottom: 16px;">
                            <strong>Phone:</strong> ${patient.phone_number}
                        </div>
                        
                        <div style="margin-bottom: 16px;">
                            <strong>Age:</strong> ${patient.age || 'N/A'}
                        </div>
                        
                        <div style="margin-bottom: 16px;">
                            <strong>Gender:</strong> ${patient.gender || 'N/A'}
                        </div>
                        
                        <div style="margin-bottom: 16px;">
                            <strong>Birth Date:</strong> ${patient.birth_date ? formatDate(patient.birth_date) : 'N/A'}
                        </div>
                        
                        <div style="margin-bottom: 16px;">
                            <strong>Chronic Diseases:</strong><br>
                            ${patient.chronic_diseases || 'None'}
                        </div>
                        
                        <div style="display: flex; gap: 12px; justify-content: flex-end; margin-top: 24px;">
                            <button class="btn btn-outline" onclick="closePatientDetailsModal()">Close</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Remove existing modal if any
        const existingModal = document.getElementById('patientDetailsModal');
        if (existingModal) {
            existingModal.remove();
        }
        
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    } catch (error) {
        showNotification('Failed to load patient details', 'error');
    }
}

function closePatientDetailsModal() {
    const modal = document.getElementById('patientDetailsModal');
    if (modal) {
        modal.remove();
    }
}

async function viewAppointmentDetails(appointmentId) {
    try {
        const appointment = await apiCall(API_ENDPOINTS.appointmentDetail(appointmentId));
        
        const statusClass = `status-${appointment.status}`;
        const statusText = appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1);
        
        const modalHtml = `
            <div class="modal" id="appointmentDetailsModal" style="display: flex;">
                <div class="modal-content modal-large">
                    <div class="modal-header">
                        <h3>Appointment Details</h3>
                        <button class="modal-close" onclick="closeAppointmentDetailsModal()">&times;</button>
                    </div>
                    <div class="modal-body">
                        <div style="margin-bottom: 24px;">
                            <span class="appointment-status ${statusClass}">${statusText}</span>
                        </div>
                        
                        <div style="margin-bottom: 24px;">
                            <h4 style="margin-bottom: 12px; color: var(--primary);">Doctor Information</h4>
                            <p><strong>Name:</strong> ${appointment.doctor.full_name}</p>
                            <p><strong>Specialty:</strong> ${appointment.doctor.specialty}</p>
                        </div>
                        
                        <div style="margin-bottom: 24px;">
                            <h4 style="margin-bottom: 12px; color: var(--primary);">Patient Information</h4>
                            <p><strong>Name:</strong> ${appointment.patient.full_name}</p>
                            <p><strong>Age:</strong> ${appointment.patient.age || 'N/A'}</p>
                            <p><strong>Gender:</strong> ${appointment.patient.gender || 'N/A'}</p>
                            <p><strong>Chronic Diseases:</strong> ${appointment.patient.chronic_diseases || 'None'}</p>
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
                        
                        <div style="display: flex; gap: 12px; justify-content: flex-end; margin-top: 24px;">
                            <button class="btn btn-outline" onclick="closeAppointmentDetailsModal()">Close</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Remove existing modal if any
        const existingModal = document.getElementById('appointmentDetailsModal');
        if (existingModal) {
            existingModal.remove();
        }
        
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    } catch (error) {
        showNotification('Failed to load appointment details', 'error');
    }
}

function closeAppointmentDetailsModal() {
    const modal = document.getElementById('appointmentDetailsModal');
    if (modal) {
        modal.remove();
    }
}
