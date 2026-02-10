// Authentication page
let currentStep = 'email'; // email, otp
let currentEmail = '';
let storedNewOtp = ''; // For admin swap

document.addEventListener('DOMContentLoaded', () => {
    setupTabs();
    setupForms();
    
    // If already logged in, redirect
    if (isLoggedIn()) {
        redirectToDashboard();
    }
});

// Setup tabs
function setupTabs() {
    const loginTab = document.getElementById('loginTab');
    const signupTab = document.getElementById('signupTab');
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');
    
    loginTab.addEventListener('click', () => {
        loginTab.classList.add('active');
        signupTab.classList.remove('active');
        loginForm.classList.remove('hidden');
        signupForm.classList.add('hidden');
    });
    
    signupTab.addEventListener('click', () => {
        signupTab.classList.add('active');
        loginTab.classList.remove('active');
        signupForm.classList.remove('hidden');
        loginForm.classList.add('hidden');
    });
}

// Setup forms
function setupForms() {
    const loginFormElement = document.getElementById('loginFormElement');
    const signupFormElement = document.getElementById('signupFormElement');
    
    loginFormElement.addEventListener('submit', handleLogin);
    signupFormElement.addEventListener('submit', handleSignup);
}

// Handle login
async function handleLogin(e) {
    e.preventDefault();
    
    const submitBtn = document.getElementById('loginSubmitBtn');
    const email = document.getElementById('loginEmail').value;
    const otpSection = document.getElementById('loginOtpSection');
    const otpInput = document.getElementById('loginOtp');
    
    if (currentStep === 'email') {
        // Request OTP
        submitBtn.disabled = true;
        submitBtn.textContent = 'Requesting OTP...';
        
        try {
            await apiCall(API_ENDPOINTS.otpRequest, 'POST', { email }, false);
            
            currentEmail = email;
            currentStep = 'otp';
            
            otpSection.classList.remove('hidden');
            submitBtn.textContent = 'Verify & Login';
            submitBtn.disabled = false;
            
            showMessage('OTP sent! Check your console.', 'success');
        } catch (error) {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Request OTP';
            showMessage(error.error || 'Failed to request OTP', 'error');
        }
    } else {
        // Verify OTP
        const otpCode = otpInput.value;
        
        if (!otpCode || otpCode.length !== 6) {
            showMessage('Please enter a valid 6-digit OTP', 'error');
            return;
        }
        
        submitBtn.disabled = true;
        submitBtn.textContent = 'Verifying...';
        
        try {
            const result = await apiCall(API_ENDPOINTS.otpVerify, 'POST', {
                email: currentEmail,
                otp_code: otpCode
            }, false);
            
            // Save tokens and user info
            localStorage.setItem('access_token', result.access);
            localStorage.setItem('refresh_token', result.refresh);
            localStorage.setItem('user', JSON.stringify(result.user));
            
            showMessage('Login successful! Redirecting...', 'success');
            
            setTimeout(() => {
                redirectToDashboard();
            }, 1000);
        } catch (error) {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Verify & Login';
            showMessage(error.error || 'Failed to verify OTP', 'error');
        }
    }
}

// Handle signup
async function handleSignup(e) {
    e.preventDefault();
    
    const submitBtn = e.target.querySelector('button[type="submit"]');
    
    const formData = {
        email: document.getElementById('signupEmail').value,
        full_name: document.getElementById('signupName').value,
        phone_number: document.getElementById('signupPhone').value,
        birth_date: document.getElementById('signupBirth').value,
        gender: document.getElementById('signupGender').value,
        chronic_diseases: document.getElementById('signupDiseases').value || ''
    };
    
    submitBtn.disabled = true;
    submitBtn.textContent = 'Creating Account...';
    
    try {
        await apiCall(API_ENDPOINTS.signup, 'POST', formData, false);
        
        showMessage('Account created successfully! You can now login.', 'success');
        
        // Switch to login tab
        setTimeout(() => {
            document.getElementById('loginTab').click();
            document.getElementById('loginEmail').value = formData.email;
        }, 1500);
        
        submitBtn.disabled = false;
        submitBtn.textContent = 'Create Account';
        e.target.reset();
    } catch (error) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Create Account';
        
        let errorMsg = 'Failed to create account';
        if (error.email) errorMsg = error.email[0];
        else if (error.phone_number) errorMsg = error.phone_number[0];
        
        showMessage(errorMsg, 'error');
    }
}

// Show message
function showMessage(message, type) {
    const messageDiv = document.getElementById('authMessage');
    messageDiv.textContent = message;
    messageDiv.className = `auth-message ${type}`;
    messageDiv.classList.remove('hidden');
    
    setTimeout(() => {
        messageDiv.classList.add('hidden');
    }, 5000);
}
