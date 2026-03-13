/**
 * OTP.JS - OTP Input Logic & Timer
 * Handles OTP verification flow with countdown timer
 */

let otpTimer = null;
let otpTimeRemaining = 120; // 2 minutes in seconds
const CORRECT_OTP = '123456'; // Mock OTP for testing

/**
 * Initialize OTP input boxes
 */
function initOTPInputs() {
    const otpBoxes = document.querySelectorAll('.otp-box');
    
    otpBoxes.forEach((box, index) => {
        // Auto-focus next box on input
        box.addEventListener('input', (e) => {
            const value = e.target.value;
            
            // Only allow single digit
            if (value.length > 1) {
                e.target.value = value[0];
            }
            
            // Mark as filled
            if (value) {
                box.classList.add('filled');
                
                // Move to next box
                if (index < otpBoxes.length - 1) {
                    otpBoxes[index + 1].focus();
                } else {
                    // All boxes filled, auto-verify
                    box.blur();
                }
            } else {
                box.classList.remove('filled');
            }
            
            // Clear error state
            box.classList.remove('error');
        });
        
        // Handle backspace
        box.addEventListener('keydown', (e) => {
            if (e.key === 'Backspace' && !box.value && index > 0) {
                otpBoxes[index - 1].focus();
                otpBoxes[index - 1].value = '';
                otpBoxes[index - 1].classList.remove('filled');
            }
        });
        
        // Prevent non-numeric input
        box.addEventListener('keypress', (e) => {
            if (!/[0-9]/.test(e.key)) {
                e.preventDefault();
            }
        });
        
        // Handle paste
        box.addEventListener('paste', (e) => {
            e.preventDefault();
            const pastedData = e.clipboardData.getData('text').trim();
            
            if (/^\d{6}$/.test(pastedData)) {
                pastedData.split('').forEach((digit, i) => {
                    if (otpBoxes[i]) {
                        otpBoxes[i].value = digit;
                        otpBoxes[i].classList.add('filled');
                    }
                });
                otpBoxes[5].focus();
            }
        });
    });
    
    // Auto-focus first box
    if (otpBoxes.length > 0) {
        otpBoxes[0].focus();
    }
}

/**
 * Get OTP value from all boxes
 */
function getOTPValue() {
    const otpBoxes = document.querySelectorAll('.otp-box');
    return Array.from(otpBoxes).map(box => box.value).join('');
}

/**
 * Clear all OTP boxes
 */
function clearOTP() {
    const otpBoxes = document.querySelectorAll('.otp-box');
    otpBoxes.forEach(box => {
        box.value = '';
        box.classList.remove('filled', 'error');
    });
    if (otpBoxes.length > 0) {
        otpBoxes[0].focus();
    }
}

/**
 * Show OTP error (shake animation)
 */
function showOTPError() {
    const otpBoxes = document.querySelectorAll('.otp-box');
    otpBoxes.forEach(box => {
        box.classList.add('error');
    });
    
    // Remove error class after animation
    setTimeout(() => {
        otpBoxes.forEach(box => {
            box.classList.remove('error');
        });
    }, 420);
}

/**
 * Verify OTP
 * <!-- BACKEND INTEGRATION POINT -->
 * Replace with: POST /api/auth/verify-otp
 * Body: { email, otp }
 */
function verifyOTP(otp) {
    return new Promise((resolve, reject) => {
        // Simulate API call
        setTimeout(() => {
            if (otp === CORRECT_OTP) {
                resolve({ success: true, message: 'OTP verified successfully' });
            } else if (otp === '000000') {
                // Special case for testing error state
                reject({ success: false, message: 'Invalid OTP' });
            } else {
                reject({ success: false, message: 'Invalid OTP' });
            }
        }, 500);
    });
}

/**
 * Start OTP countdown timer
 */
function startOTPTimer(duration = 120) {
    otpTimeRemaining = duration;
    const timerDisplay = document.getElementById('otpTimer');
    
    if (!timerDisplay) return;
    
    // Clear existing timer
    if (otpTimer) {
        clearInterval(otpTimer);
    }
    
    // Update display immediately
    updateTimerDisplay(timerDisplay);
    
    // Start countdown
    otpTimer = setInterval(() => {
        otpTimeRemaining--;
        updateTimerDisplay(timerDisplay);
        
        // Add urgent state when < 30 seconds
        if (otpTimeRemaining <= 30 && otpTimeRemaining > 0) {
            timerDisplay.classList.add('timer-urgent');
        }
        
        // Timer expired
        if (otpTimeRemaining <= 0) {
            clearInterval(otpTimer);
            timerDisplay.textContent = 'OTP Expired';
            timerDisplay.classList.add('timer-urgent');
            
            // Disable verify button
            const verifyBtn = document.getElementById('verifyOTPBtn');
            if (verifyBtn) {
                verifyBtn.disabled = true;
            }
        }
    }, 1000);
}

/**
 * Update timer display
 */
function updateTimerDisplay(display) {
    const minutes = Math.floor(otpTimeRemaining / 60);
    const seconds = otpTimeRemaining % 60;
    display.textContent = `${minutes}:${String(seconds).padStart(2, '0')}`;
    
    if (otpTimeRemaining > 30) {
        display.classList.remove('timer-urgent');
    }
}

/**
 * Stop OTP timer
 */
function stopOTPTimer() {
    if (otpTimer) {
        clearInterval(otpTimer);
        otpTimer = null;
    }
}

/**
 * Resend OTP
 * <!-- BACKEND INTEGRATION POINT -->
 * Replace with: POST /api/auth/resend-otp
 * Body: { email }
 */
function resendOTP(email) {
    return new Promise((resolve) => {
        // Simulate API call
        setTimeout(() => {
            // Reset timer
            stopOTPTimer();
            clearOTP();
            startOTPTimer(120);
            
            // Re-enable verify button
            const verifyBtn = document.getElementById('verifyOTPBtn');
            if (verifyBtn) {
                verifyBtn.disabled = false;
            }
            
            resolve({ success: true, message: 'OTP resent successfully' });
        }, 500);
    });
}

/**
 * Send OTP to email
 * <!-- BACKEND INTEGRATION POINT -->
 * Replace with: POST /api/auth/send-otp
 * Body: { email }
 */
function sendOTP(email) {
    return new Promise((resolve, reject) => {
        // Validate email
        if (!isValidEmail(email)) {
            reject({ success: false, message: 'Invalid email address' });
            return;
        }
        
        // Simulate API call
        setTimeout(() => {
            // Store email in localStorage
            localStorage.setItem('userEmail', email);
            
            resolve({ 
                success: true, 
                message: 'OTP sent successfully',
                otp: CORRECT_OTP // In real app, never send OTP in response!
            });
        }, 500);
    });
}

/**
 * Validate email format
 */
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/**
 * Handle successful login
 */
function handleSuccessfulLogin(email) {
    localStorage.setItem('isLoggedIn', 'true');
    localStorage.setItem('userEmail', email);
    localStorage.setItem('userName', email.split('@')[0]);
    
    // Update user avatar initials
    const userName = email.split('@')[0];
    const initials = userName.slice(0, 2).toUpperCase();
    const avatars = document.querySelectorAll('.user-avatar span');
    avatars.forEach(avatar => {
        avatar.textContent = initials;
    });
}

/**
 * Check if user is logged in
 */
function isLoggedIn() {
    return localStorage.getItem('isLoggedIn') === 'true';
}

/**
 * Logout user
 */
function logout() {
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('userName');
    stopOTPTimer();
}

/**
 * Get logged in user info
 */
function getUserInfo() {
    return {
        email: localStorage.getItem('userEmail') || '',
        name: localStorage.getItem('userName') || '',
        isLoggedIn: isLoggedIn()
    };
}
