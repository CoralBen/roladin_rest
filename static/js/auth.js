document.addEventListener('DOMContentLoaded', function() {
    initializeAuth();
});

function initializeAuth() {
    initializeLoginForm();
    initializeRegisterForm();
    initializePasswordToggle();
    initializeDemoUsers();
    initializeKeyboardShortcuts();
}

function initializeLoginForm() {
    const loginForm = document.getElementById('loginForm');
    if (!loginForm) return;
    
    loginForm.addEventListener('submit', function(e) {
        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value.trim();
        
        if (!username || !password) {
            e.preventDefault();
            showAlert('error', 'אנא מלא את כל השדות');
            return;
        }
        
        const loginBtn = document.getElementById('loginBtn');
        if (loginBtn) {
            loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> מתחבר...';
            loginBtn.disabled = true;
        }
    });
    
    const usernameField = document.getElementById('username');
    if (usernameField) {
        usernameField.focus();
    }
}

function initializeRegisterForm() {
    const registerForm = document.getElementById('registerForm');
    if (!registerForm) return;
    
    setupRealTimeValidation();
    
    registerForm.addEventListener('submit', function(e) {
        if (!validateRegisterForm()) {
            e.preventDefault();
            return;
        }
        
        const registerBtn = document.getElementById('registerBtn');
        if (registerBtn) {
            registerBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> יוצר חשבון...';
            registerBtn.disabled = true;
        }
    });
}

function setupRealTimeValidation() {
    const usernameField = document.getElementById('username');
    if (usernameField) {
        usernameField.addEventListener('input', Utils.debounce(function() {
            validateUsername(this.value);
        }, 300));
    }
    
    const emailField = document.getElementById('email');
    if (emailField) {
        emailField.addEventListener('input', Utils.debounce(function() {
            validateEmail(this.value);
        }, 300));
    }
    
    const passwordField = document.getElementById('password');
    if (passwordField) {
        passwordField.addEventListener('input', function() {
            checkPasswordStrength(this.value);
        });
    }
    
    const phoneField = document.getElementById('phone');
    if (phoneField) {
        phoneField.addEventListener('input', function() {
            this.value = Utils.formatPhone(this.value);
        });
    }
    
    document.querySelectorAll('input[required], textarea[required]').forEach(field => {
        field.addEventListener('blur', function() {
            if (!this.value.trim()) {
                this.classList.add('border-danger');
                this.classList.remove('border-success');
            } else {
                this.classList.remove('border-danger');
                this.classList.add('border-success');
            }
        });
    });
}

function validateUsername(username) {
    const helpText = document.getElementById('usernameHelp');
    if (!helpText) return;
    
    if (username.length === 0) {
        setValidationMessage(helpText, 'לפחות 3 תווים, רק אותיות ומספרים', 'muted');
        return;
    }
    
    if (username.length < 3) {
        setValidationMessage(helpText, 'שם המשתמש קצר מדי (מינימום 3 תווים)', 'danger');
        return false;
    }
    
    if (!/^[a-zA-Z0-9]+$/.test(username)) {
        setValidationMessage(helpText, 'שם המשתמש יכול להכיל רק אותיות ומספרים', 'danger');
        return false;
    }
    
    setValidationMessage(helpText, 'שם משתמש תקין!', 'success');
    return true;
}

function validateEmail(email) {
    const helpText = document.getElementById('emailHelp');
    if (!helpText) return;
    
    if (email.length === 0) {
        setValidationMessage(helpText, 'כתובת אימייל תקינה', 'muted');
        return;
    }
    
    if (!Utils.validateEmail(email)) {
        setValidationMessage(helpText, 'כתובת אימייל לא תקינה', 'danger');
        return false;
    }
    
    setValidationMessage(helpText, 'כתובת אימייל תקינה!', 'success');
    return true;
}

function checkPasswordStrength(password) {
    const strengthBar = document.getElementById('passwordStrength');
    const helpText = document.getElementById('passwordHelp');
    
    if (!strengthBar || !helpText) return;
    
    const strength = Utils.checkPasswordStrength(password);
    
    strengthBar.style.width = (strength.level === 'weak' ? 25 : strength.level === 'medium' ? 50 : 100) + '%';
    strengthBar.className = `progress-bar ${strength.class}`;
    
    if (password.length === 0) {
        helpText.textContent = 'לפחות 6 תווים';
        helpText.className = 'form-text text-muted';
        strengthBar.style.width = '0%';
    } else {
        helpText.textContent = `סיסמה ${strength.text}`;
        helpText.className = `form-text text-${strength.level === 'weak' ? 'danger' : strength.level === 'medium' ? 'warning' : 'success'}`;
    }
}

function setValidationMessage(element, message, type) {
    element.textContent = message;
    element.className = `form-text text-${type}`;
}

function validateRegisterForm() {
    const username = document.getElementById('username').value.trim();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const terms = document.getElementById('terms').checked;
    
    if (username.length < 3) {
        showAlert('error', 'שם המשתמש חייב להכיל לפחות 3 תווים');
        return false;
    }
    
    if (!/^[a-zA-Z0-9]+$/.test(username)) {
        showAlert('error', 'שם המשתמש יכול להכיל רק אותיות ומספרים');
        return false;
    }
    
    if (password.length < 6) {
        showAlert('error', 'הסיסמה חייבת להכיל לפחות 6 תווים');
        return false;
    }
    
    if (!Utils.validateEmail(email)) {
        showAlert('error', 'אנא הזן כתובת אימייל תקינה');
        return false;
    }
    
    if (!terms) {
        showAlert('error', 'עליך להסכים לתנאי השימוש');
        return false;
    }
    
    return true;
}

function initializePasswordToggle() {
    window.togglePassword = function(fieldId) {
        const passwordField = document.getElementById(fieldId || 'password');
        if (!passwordField) return;
        
        const toggleIcon = passwordField.parentElement.parentElement.querySelector('.password-toggle');
        if (!toggleIcon) return;
        
        if (passwordField.type === 'password') {
            passwordField.type = 'text';
            toggleIcon.classList.remove('fa-eye');
            toggleIcon.classList.add('fa-eye-slash');
        } else {
            passwordField.type = 'password';
            toggleIcon.classList.remove('fa-eye-slash');
            toggleIcon.classList.add('fa-eye');
        }
    };
}

function initializeDemoUsers() {
    window.fillLogin = function(username, password) {
        const usernameField = document.getElementById('username');
        const passwordField = document.getElementById('password');
        
        if (usernameField && passwordField) {
            usernameField.value = username;
            passwordField.value = password;
            
            const demoUsers = document.querySelectorAll('.demo-user');
            demoUsers.forEach(user => user.classList.remove('selected'));
            
            if (event && event.currentTarget) {
                event.currentTarget.classList.add('selected');
                
                setTimeout(() => {
                    event.currentTarget.classList.remove('selected');
                }, 1000);
            }
        }
    };
    
    document.querySelectorAll('.demo-user').forEach(user => {
        user.style.cursor = 'pointer';
        user.style.transition = 'all 0.3s ease';
        
        user.addEventListener('mouseenter', function() {
            if (!this.classList.contains('selected')) {
                this.style.background = 'rgba(102, 126, 234, 0.05)';
                this.style.transform = 'scale(1.05)';
            }
        });
        
        user.addEventListener('mouseleave', function() {
            if (!this.classList.contains('selected')) {
                this.style.background = '';
                this.style.transform = 'scale(1)';
            }
        });
    });
}

function initializeKeyboardShortcuts() {
    document.addEventListener('keydown', function(e) {
        if (e.ctrlKey || e.metaKey) {
            if (e.key === '1') {
                e.preventDefault();
                if (window.fillLogin) {
                    window.fillLogin('admin', 'admin123');
                }
            } else if (e.key === '2') {
                e.preventDefault();
                if (window.fillLogin) {
                    window.fillLogin('customer1', 'customer123');
                }
            }
        }
    });
}

function initializeBenefitsAnimation() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.animation = 'fadeInUp 0.6s ease forwards';
            }
        });
    }, observerOptions);

    document.querySelectorAll('.col-md-4').forEach(col => {
        observer.observe(col);
    });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeBenefitsAnimation);
} else {
    initializeBenefitsAnimation();
}// static/js/auth.js - JavaScript עבור דפי התחברות ורישום

// אתחול כשהעמוד נטען
document.addEventListener('DOMContentLoaded', function() {
    initializeAuth();
});

function initializeAuth() {
    initializeLoginForm();
    initializeRegisterForm();
    initializePasswordToggle();
    initializeDemoUsers();
    initializeKeyboardShortcuts();
}

// טופס התחברות
function initializeLoginForm() {
    const loginForm = document.getElementById('loginForm');
    if (!loginForm) return;
    
    loginForm.addEventListener('submit', function(e) {
        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value.trim();
        
        if (!username || !password) {
            e.preventDefault();
            showAlert('error', 'אנא מלא את כל השדות');
            return;
        }
        
        // הצגת מצב טעינה
        const loginBtn = document.getElementById('loginBtn');
        if (loginBtn) {
            loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> מתחבר...';
            loginBtn.disabled = true;
        }
    });
    
    // פוקוס על שדה שם משתמש
    const usernameField = document.getElementById('username');
    if (usernameField) {
        usernameField.focus();
    }
}

// טופס רישום
function initializeRegisterForm() {
    const registerForm = document.getElementById('registerForm');
    if (!registerForm) return;
    
    // ולידציה בזמן אמת
    setupRealTimeValidation();
    
    // טיפול בשליחת טופס
    registerForm.addEventListener('submit', function(e) {
        if (!validateRegisterForm()) {
            e.preventDefault();
            return;
        }
        
        // הצגת מצב טעינה
        const registerBtn = document.getElementById('registerBtn');
        if (registerBtn) {
            registerBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> יוצר חשבון...';
            registerBtn.disabled = true;
        }
    });
}

// ולידציה בזמן אמת לטופס רישום
function setupRealTimeValidation() {
    // בדיקת שם משתמש
    const usernameField = document.getElementById('username');
    if (usernameField) {
        usernameField.addEventListener('input', Utils.debounce(function() {
            validateUsername(this.value);
        }, 300));
    }
    
    // בדיקת אימייל
    const emailField = document.getElementById('email');
    if (emailField) {
        emailField.addEventListener('input', Utils.debounce(function() {
            validateEmail(this.value);
        }, 300));
    }
    
    // בדיקת עוצמת סיסמה
    const passwordField = document.getElementById('password');
    if (passwordField) {
        passwordField.addEventListener('input', function() {
            checkPasswordStrength(this.value);
        });
    }
    
    // פורמט טלפון
    const phoneField = document.getElementById('phone');
    if (phoneField) {
        phoneField.addEventListener('input', function() {
            this.value = Utils.formatPhone(this.value);
        });
    }
    
    // ויזואל feedback לשדות נדרשים
    document.querySelectorAll('input[required], textarea[required]').forEach(field => {
        field.addEventListener('blur', function() {
            if (!this.value.trim()) {
                this.classList.add('border-danger');
                this.classList.remove('border-success');
            } else {
                this.classList.remove('border-danger');
                this.classList.add('border-success');
            }
        });
    });
}

// בדיקת שם משתמש
function validateUsername(username) {
    const helpText = document.getElementById('usernameHelp');
    if (!helpText) return;
    
    if (username.length === 0) {
        setValidationMessage(helpText, 'לפחות 3 תווים, רק אותיות ומספרים', 'muted');
        return;
    }
    
    if (username.length < 3) {
        setValidationMessage(helpText, 'שם המשתמש קצר מדי (מינימום 3 תווים)', 'danger');
        return false;
    }
    
    if (!/^[a-zA-Z0-9]+$/.test(username)) {
        setValidationMessage(helpText, 'שם המשתמש יכול להכיל רק אותיות ומספרים', 'danger');
        return false;
    }
    
    setValidationMessage(helpText, 'שם משתמש תקין!', 'success');
    return true;
}

// בדיקת אימייל
function validateEmail(email) {
    const helpText = document.getElementById('emailHelp');
    if (!helpText) return;
    
    if (email.length === 0) {
        setValidationMessage(helpText, 'כתובת אימייל תקינה', 'muted');
        return;
    }
    
    if (!Utils.validateEmail(email)) {
        setValidationMessage(helpText, 'כתובת אימייל לא תקינה', 'danger');
        return false;
    }
}