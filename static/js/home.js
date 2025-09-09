document.addEventListener('DOMContentLoaded', function() {
    initializeHome();
});

function initializeHome() {
    initializeAddToCartForms();
    initializeScrollAnimations();
    initializeCategoryCards();
    initializeMenuItems();
    initializeQuickOrderSummary();
    initializeCountUp();
}

function initializeAddToCartForms() {
    document.querySelectorAll('.add-to-cart-form').forEach(form => {
        form.addEventListener('submit', function(e) {
            const button = this.querySelector('.add-to-cart-btn');
            const originalText = button.innerHTML;
            
            button.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
            button.disabled = true;
            
            setTimeout(() => {
                button.innerHTML = originalText;
                button.disabled = false;
            }, 2000);
        });
    });
}

function initializeScrollAnimations() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('fade-in');
            }
        });
    }, observerOptions);

    document.querySelectorAll('.card, .section-title').forEach(element => {
        observer.observe(element);
    });
}

function initializeCategoryCards() {
    document.querySelectorAll('.category-card').forEach(card => {
        card.addEventListener('mouseenter', function() {
            this.style.background = 'linear-gradient(135deg, rgba(102, 126, 234, 0.05), rgba(118, 75, 162, 0.05))';
        });
        
        card.addEventListener('mouseleave', function() {
            this.style.background = '';
        });
    });
}

function initializeMenuItems() {
    document.querySelectorAll('.menu-item-card').forEach(card => {
        const addToCartForm = card.querySelector('.add-to-cart-form');
        
        if (addToCartForm) {
            card.addEventListener('mouseenter', function() {
                addToCartForm.style.opacity = '1';
            });
            
            card.addEventListener('mouseleave', function() {
                addToCartForm.style.opacity = '0';
            });
        }
        
        card.addEventListener('click', function(e) {
            if (!e.target.closest('.add-to-cart-form') && !e.target.closest('a')) {
                const categoryBadge = this.querySelector('.category-badge');
                if (categoryBadge) {
                    const category = categoryBadge.textContent.trim();
                    window.location.href = `/menu?category=${encodeURIComponent(category)}`;
                }
            }
        });
        
        card.style.cursor = 'pointer';
    });
}

function initializeQuickOrderSummary() {
    const cartCount = document.querySelector('.navbar .badge');
    if (cartCount && parseInt(cartCount.textContent) > 0) {
        showQuickOrderSummary();
    }
}

function showQuickOrderSummary() {
    const existingSummary = document.querySelector('.quick-order-summary');
    if (existingSummary) return;
    
    const summaryHtml = `
        <div class="quick-order-summary position-fixed bottom-0 end-0 m-3" style="z-index: 1000;">
            <div class="card" style="max-width: 300px;">
                <div class="card-body">
                    <h6 class="card-title">
                        <i class="fas fa-shopping-cart text-primary"></i>
                        יש לך פריטים בעגלה
                    </h6>
                    <div class="d-flex gap-2">
                        <a href="/cart" class="btn btn-sm btn-outline-primary">
                            <i class="fas fa-eye"></i> צפה בעגלה
                        </a>
                        <a href="/checkout" class="btn btn-sm btn-primary">
                            <i class="fas fa-credit-card"></i> המשך לתשלום
                        </a>
                    </div>
                    <button type="button" class="btn-close position-absolute top-0 end-0 m-2" onclick="hideQuickOrderSummary()"></button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', summaryHtml);
    
    setTimeout(() => {
        const summary = document.querySelector('.quick-order-summary');
        if (summary) {
            summary.style.animation = 'slideInRight 0.5s ease forwards';
        }
    }, 100);
}

function hideQuickOrderSummary() {
    const summary = document.querySelector('.quick-order-summary');
    if (summary) {
        summary.style.animation = 'slideOutRight 0.3s ease forwards';
        setTimeout(() => {
            summary.remove();
        }, 300);
    }
}

function animatePrice(element) {
    element.style.animation = 'pulse 0.6s ease';
    setTimeout(() => {
        element.style.animation = '';
    }, 600);
}

function showSuccessAnimation(button) {
    const originalContent = button.innerHTML;
    button.innerHTML = '<i class="fas fa-check text-success"></i>';
    button.classList.add('btn-success');
    button.classList.remove('btn-primary');
    
    setTimeout(() => {
        button.innerHTML = originalContent;
        button.classList.remove('btn-success');
        button.classList.add('btn-primary');
    }, 1500);
}

function initializeCountUp() {
    const observerOptions = {
        threshold: 0.7
    };
    
    const observer = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const counters = entry.target.querySelectorAll('[data-count]');
                counters.forEach(counter => {
                    animateCountUp(counter);
                });
            }
        });
    }, observerOptions);
    
    document.querySelectorAll('.info-card').forEach(card => {
        observer.observe(card);
    });
}

function animateCountUp(element) {
    const target = parseInt(element.getAttribute('data-count'));
    let current = 0;
    const increment = target / 100;
    const timer = setInterval(() => {
        current += increment;
        element.textContent = Math.floor(current);
        
        if (current >= target) {
            clearInterval(timer);
            element.textContent = target;
        }
    }, 20);
}

const homeUtils = {
    formatPrice: function(price) {
        return `₪${parseFloat(price).toFixed(2)}`;
    },
    
    showNotification: function(message, type = 'success') {
        const notification = document.createElement('div');
        notification.className = `alert alert-${type} position-fixed top-0 start-50 translate-middle-x mt-3`;
        notification.style.zIndex = '9999';
        notification.innerHTML = `
            ${message}
            <button type="button" class="btn-close ms-2" onclick="this.parentElement.remove()"></button>
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 5000);
    },
    
    addToCartWithAnimation: function(itemId, itemName) {
        fetch('/add_to_cart', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: `item_id=${itemId}&quantity=1`
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                homeUtils.showNotification(`${itemName} נוסף לעגלה בהצלחה!`);
                updateCartCount();
            } else {
                homeUtils.showNotification(data.message || 'שגיאה בהוספת הפריט', 'error');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            homeUtils.showNotification('שגיאה בהוספת הפריט לעגלה', 'error');
        });
    }
};

function updateCartCount() {
    const cartBadge = document.querySelector('.navbar .badge');
    if (cartBadge) {
        const currentCount = parseInt(cartBadge.textContent) || 0;
        cartBadge.textContent = currentCount + 1;
        cartBadge.style.animation = 'pulse 0.6s ease';
        
        setTimeout(() => {
            cartBadge.style.animation = '';
        }, 600);
    }
}

window.homeUtils = homeUtils;
window.hideQuickOrderSummary = hideQuickOrderSummary;