document.addEventListener('DOMContentLoaded', function() {
    initializeDashboard();
});

function initializeDashboard() {
    updateCurrentTime();
    initializeCountUpAnimations();
    initializeOrdersTable();
    initializeMenuManagement();
    initializeModals();
    initializeImagePreview();
    refreshMenuStats();
    
    // Auto refresh every 30 seconds
    setInterval(() => {
        updateCurrentTime();
        refreshOrders();
    }, 30000);
}

// Time Management
function updateCurrentTime() {
    const now = new Date();
    const timeString = now.toLocaleString('he-IL', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
    
    const timeElement = document.getElementById('current-time');
    if (timeElement) {
        timeElement.textContent = timeString;
    }
}

// Statistics Animations
function initializeCountUpAnimations() {
    const observerOptions = {
        threshold: 0.5,
        rootMargin: '0px 0px -100px 0px'
    };

    const observer = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const numbers = entry.target.querySelectorAll('[data-count]');
                numbers.forEach(number => {
                    animateCountUp(number);
                });
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    document.querySelectorAll('.stats-card').forEach(card => {
        observer.observe(card);
    });
}

function animateCountUp(element) {
    const target = parseInt(element.getAttribute('data-count'));
    let current = 0;
    const increment = target / 50;
    
    const timer = setInterval(() => {
        current += increment;
        element.textContent = Math.floor(current);
        
        if (current >= target) {
            clearInterval(timer);
            element.textContent = target;
        }
    }, 30);
}

// Orders Management
function initializeOrdersTable() {
    // Add hover effects to table rows
    const tableRows = document.querySelectorAll('#orders-table-body tr');
    tableRows.forEach(row => {
        row.addEventListener('mouseenter', function() {
            this.style.backgroundColor = 'rgba(102, 126, 234, 0.05)';
        });
        
        row.addEventListener('mouseleave', function() {
            this.style.backgroundColor = '';
        });
    });
    
    // Update time-ago displays
    updateTimeAgo();
}

function updateTimeAgo() {
    document.querySelectorAll('.time-ago').forEach(element => {
        const timeData = element.getAttribute('data-time');
        if (timeData) {
            const time = new Date(timeData);
            const now = new Date();
            const diffMinutes = Math.floor((now - time) / (1000 * 60));
            
            let timeAgoText;
            if (diffMinutes < 1) {
                timeAgoText = 'עכשיו';
            } else if (diffMinutes < 60) {
                timeAgoText = `לפני ${diffMinutes} דקות`;
            } else {
                const diffHours = Math.floor(diffMinutes / 60);
                timeAgoText = `לפני ${diffHours} שעות`;
            }
            
            element.textContent = timeAgoText;
        }
    });
}

function refreshOrders() {
    const tableBody = document.getElementById('orders-table-body');
    if (!tableBody) return;
    
    // Show loading state
    tableBody.classList.add('loading');
    
    fetch('/api/orders/recent')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                updateOrdersTable(data.orders);
                showNotification('הזמנות עודכנו בהצלחה', 'success');
            } else {
                showNotification('שגיאה בטעינת הזמנות', 'error');
            }
        })
        .catch(error => {
            console.error('Error refreshing orders:', error);
            showNotification('שגיאה בחיבור לשרת', 'error');
        })
        .finally(() => {
            tableBody.classList.remove('loading');
        });
}

function updateOrdersTable(orders) {
    const tableBody = document.getElementById('orders-table-body');
    if (!tableBody) return;
    
    tableBody.innerHTML = '';
    
    orders.forEach(order => {
        const row = createOrderTableRow(order);
        tableBody.appendChild(row);
    });
    
    initializeOrdersTable();
}

function createOrderTableRow(order) {
    const row = document.createElement('tr');
    
    const statusClasses = {
        'pending': 'status-pending',
        'confirmed': 'status-confirmed',
        'preparing': 'status-preparing',
        'ready': 'status-ready',
        'delivered': 'status-delivered',
        'cancelled': 'status-cancelled'
    };
    
    const statusIcons = {
        'pending': 'fas fa-clock',
        'confirmed': 'fas fa-check',
        'preparing': 'fas fa-utensils',
        'ready': 'fas fa-bell',
        'delivered': 'fas fa-truck',
        'cancelled': 'fas fa-times'
    };
    
    const statusTexts = {
        'pending': 'ממתין',
        'confirmed': 'אושר',
        'preparing': 'בהכנה',
        'ready': 'מוכן',
        'delivered': 'נמסר',
        'cancelled': 'בוטל'
    };
    
    row.innerHTML = `
        <td>
            <strong class="order-number">#${order.order_number}</strong>
        </td>
        <td>
            <div class="customer-info">
                <i class="fas fa-user text-muted"></i>
                ${order.username}
            </div>
        </td>
        <td>
            <span class="price-tag">₪${parseFloat(order.total_amount).toFixed(2)}</span>
        </td>
        <td>
            <span class="status-badge ${statusClasses[order.status] || 'status-pending'}">
                <i class="${statusIcons[order.status] || 'fas fa-clock'}"></i>
                ${statusTexts[order.status] || 'לא ידוע'}
            </span>
        </td>
        <td>
            <small class="text-muted time-ago" data-time="${order.created_at}">
                ${formatTime(order.created_at)}
            </small>
        </td>
        <td>
            <div class="btn-group btn-group-sm">
                <button class="btn btn-outline-primary btn-sm" onclick="viewOrderDetails(${order.id})">
                    <i class="fas fa-eye"></i>
                </button>
                <div class="btn-group">
                    <button class="btn btn-outline-success btn-sm dropdown-toggle" data-bs-toggle="dropdown">
                        <i class="fas fa-edit"></i>
                    </button>
                    <ul class="dropdown-menu">
                        <li><a class="dropdown-item" href="#" onclick="updateOrderStatus(${order.id}, 'confirmed')">אשר הזמנה</a></li>
                        <li><a class="dropdown-item" href="#" onclick="updateOrderStatus(${order.id}, 'preparing')">התחל הכנה</a></li>
                        <li><a class="dropdown-item" href="#" onclick="updateOrderStatus(${order.id}, 'ready')">מוכן למסירה</a></li>
                        <li><a class="dropdown-item" href="#" onclick="updateOrderStatus(${order.id}, 'delivered')">נמסר</a></li>
                        <li><hr class="dropdown-divider"></li>
                        <li><a class="dropdown-item text-danger" href="#" onclick="updateOrderStatus(${order.id}, 'cancelled')">בטל הזמנה</a></li>
                    </ul>
                </div>
            </div>
        </td>
    `;
    
    return row;
}

function formatTime(timeString) {
    const time = new Date(timeString);
    return time.toLocaleTimeString('he-IL', { 
        hour: '2-digit', 
        minute: '2-digit' 
    });
}

function viewOrderDetails(orderId) {
    const modal = new bootstrap.Modal(document.getElementById('orderDetailsModal'));
    const content = document.getElementById('orderDetailsContent');
    
    content.innerHTML = '<div class="text-center"><i class="fas fa-spinner fa-spin fa-2x"></i><br>טוען פרטי הזמנה...</div>';
    modal.show();
    
    fetch(`/api/orders/${orderId}`)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                content.innerHTML = generateOrderDetailsHTML(data.order);
            } else {
                content.innerHTML = '<div class="alert alert-danger">שגיאה בטעינת פרטי ההזמנה</div>';
            }
        })
        .catch(error => {
            console.error('Error fetching order details:', error);
            content.innerHTML = '<div class="alert alert-danger">שגיאה בחיבור לשרת</div>';
        });
}

function generateOrderDetailsHTML(order) {
    let itemsHTML = '';
    if (order.items && order.items.length > 0) {
        itemsHTML = order.items.map(item => `
            <div class="d-flex justify-content-between align-items-center mb-2 p-2 bg-light rounded">
                <div>
                    <strong>${item.name}</strong>
                    ${item.special_requests ? `<br><small class="text-muted">בקשות: ${item.special_requests}</small>` : ''}
                </div>
                <div class="text-end">
                    <div>כמות: ${item.quantity}</div>
                    <div class="price-tag">₪${(item.price * item.quantity).toFixed(2)}</div>
                </div>
            </div>
        `).join('');
    }
    
    return `
        <div class="order-details">
            <div class="row mb-3">
                <div class="col-md-6">
                    <h6><i class="fas fa-hashtag text-primary"></i> מספר הזמנה</h6>
                    <p class="order-number">#${order.order_number}</p>
                </div>
                <div class="col-md-6">
                    <h6><i class="fas fa-user text-primary"></i> לקוח</h6>
                    <p>${order.customer_name}</p>
                </div>
            </div>
            
            <div class="row mb-3">
                <div class="col-md-6">
                    <h6><i class="fas fa-calendar text-primary"></i> תאריך ושעה</h6>
                    <p>${formatDateTime(order.created_at)}</p>
                </div>
                <div class="col-md-6">
                    <h6><i class="fas fa-info-circle text-primary"></i> סטטוס</h6>
                    <p><span class="status-badge status-${order.status}">${getStatusText(order.status)}</span></p>
                </div>
            </div>
            
            ${order.delivery_address ? `
            <div class="mb-3">
                <h6><i class="fas fa-map-marker-alt text-primary"></i> כתובת משלוח</h6>
                <p>${order.delivery_address}</p>
            </div>
            ` : ''}
            
            ${order.delivery_phone ? `
            <div class="mb-3">
                <h6><i class="fas fa-phone text-primary"></i> טלפון</h6>
                <p>${order.delivery_phone}</p>
            </div>
            ` : ''}
            
            ${order.special_instructions ? `
            <div class="mb-3">
                <h6><i class="fas fa-sticky-note text-primary"></i> הוראות מיוחדות</h6>
                <p>${order.special_instructions}</p>
            </div>
            ` : ''}
            
            <div class="mb-3">
                <h6><i class="fas fa-shopping-cart text-primary"></i> פריטים בהזמנה</h6>
                ${itemsHTML}
            </div>
            
            <div class="order-total text-end">
                <h5>סכום כולל: <span class="price-tag">₪${parseFloat(order.total_amount).toFixed(2)}</span></h5>
            </div>
        </div>
    `;
}

function formatDateTime(dateString) {
    const date = new Date(dateString);
    return date.toLocaleString('he-IL', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function getStatusText(status) {
    const statusTexts = {
        'pending': 'ממתין לאישור',
        'confirmed': 'אושר',
        'preparing': 'בהכנה',
        'ready': 'מוכן למסירה',
        'delivered': 'נמסר',
        'cancelled': 'בוטל'
    };
    return statusTexts[status] || 'לא ידוע';
}

function updateOrderStatus(orderId, newStatus) {
    if (!confirm(`האם אתה בטוח שברצונך לעדכן את סטטוס ההזמנה ל"${getStatusText(newStatus)}"?`)) {
        return;
    }
    
    const formData = new FormData();
    formData.append('order_id', orderId);
    formData.append('status', newStatus);
    
    fetch('/update_order_status', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showNotification(data.message, 'success');
            refreshOrders();
        } else {
            showNotification(data.message || 'שגיאה בעדכון הסטטוס', 'error');
        }
    })
    .catch(error => {
        console.error('Error updating order status:', error);
        showNotification('שגיאה בחיבור לשרת', 'error');
    });
}

// Menu Management
function initializeMenuManagement() {
    loadRecentMenuItems();
    
    // Add event listeners for bulk actions
    const bulkButtons = document.querySelectorAll('[onclick*="bulkToggleAvailability"]');
    bulkButtons.forEach(button => {
        button.addEventListener('click', function() {
            this.innerHTML = '<i class="fas fa-spinner fa-spin"></i> מעדכן...';
            this.disabled = true;
        });
    });
}

function refreshMenuStats() {
    fetch('/api/menu/stats')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                document.getElementById('total-menu-items').textContent = data.total || 0;
                document.getElementById('available-items').textContent = data.available || 0;
                document.getElementById('unavailable-items').textContent = data.unavailable || 0;
            }
        })
        .catch(error => {
            console.error('Error fetching menu stats:', error);
        });
}

function loadRecentMenuItems() {
    const container = document.getElementById('recent-menu-items');
    if (!container) return;
    
    fetch('/api/menu/recent')
        .then(response => response.json())
        .then(data => {
            if (data.success && data.items) {
                container.innerHTML = '';
                if (data.items.length === 0) {
                    container.innerHTML = '<div class="menu-item-preview"><i class="fas fa-info-circle text-muted"></i> אין פריטים חדשים</div>';
                } else {
                    data.items.forEach(item => {
                        const itemHTML = `
                            <div class="menu-item-preview">
                                <i class="fas fa-utensils text-primary"></i>
                                <div class="flex-grow-1">
                                    <strong>${item.name}</strong>
                                    <br><small class="text-muted">${item.category} • ₪${item.price}</small>
                                </div>
                            </div>
                        `;
                        container.insertAdjacentHTML('beforeend', itemHTML);
                    });
                }
            }
        })
        .catch(error => {
            console.error('Error loading recent menu items:', error);
            container.innerHTML = '<div class="menu-item-preview"><i class="fas fa-exclamation-triangle text-warning"></i> שגיאה בטעינת נתונים</div>';
        });
}

function bulkToggleAvailability(available) {
    if (!confirm(`האם אתה בטוח שברצונך להפוך את כל הפריטים ל${available ? 'זמינים' : 'לא זמינים'}?`)) {
        return;
    }
    
    fetch('/api/menu/bulk-toggle', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ available: available })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showNotification(`כל הפריטים הפכו ל${available ? 'זמינים' : 'לא זמינים'}`, 'success');
            refreshMenuStats();
        } else {
            showNotification('שגיאה בעדכון הפריטים', 'error');
        }
    })
    .catch(error => {
        console.error('Error bulk toggling availability:', error);
        showNotification('שגיאה בחיבור לשרת', 'error');
    })
    .finally(() => {
        // Reset button states
        document.querySelectorAll('[onclick*="bulkToggleAvailability"]').forEach(button => {
            button.disabled = false;
            if (button.innerHTML.includes('check')) {
                button.innerHTML = '<i class="fas fa-check-circle"></i> הפוך הכל לזמין';
            } else {
                button.innerHTML = '<i class="fas fa-times-circle"></i> הפוך הכל ללא זמין';
            }
        });
    });
}

// Modal Management
function initializeModals() {
    const addMenuItemModal = document.getElementById('addMenuItemModal');
    if (addMenuItemModal) {
        addMenuItemModal.addEventListener('hidden.bs.modal', function () {
            document.getElementById('addMenuItemForm').reset();
            hideImagePreview();
        });
    }
}

// Image Preview
function initializeImagePreview() {
    const imageInput = document.querySelector('input[name="image"]');
    if (imageInput) {
        imageInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                if (file.size > 5 * 1024 * 1024) {
                    showNotification('הקובץ גדול מדי. הגודל המקסימלי הוא 5MB', 'error');
                    this.value = '';
                    return;
                }
                
                const reader = new FileReader();
                reader.onload = function(e) {
                    showImagePreview(e.target.result);
                };
                reader.readAsDataURL(file);
            } else {
                hideImagePreview();
            }
        });
    }
}

function showImagePreview(src) {
    const preview = document.getElementById('image-preview');
    const img = document.getElementById('preview-img');
    
    if (preview && img) {
        img.src = src;
        preview.style.display = 'block';
    }
}

function hideImagePreview() {
    const preview = document.getElementById('image-preview');
    if (preview) {
        preview.style.display = 'none';
    }
}

// Add Menu Item
function addMenuItem() {
    const form = document.getElementById('addMenuItemForm');
    const formData = new FormData(form);
    
    const addButton = document.querySelector('[onclick="addMenuItem()"]');
    const originalText = addButton.innerHTML;
    
    addButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> מוסיף...';
    addButton.disabled = true;
    
    fetch('/api/menu/add', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showNotification('פריט התפריט נוסף בהצלחה!', 'success');
            bootstrap.Modal.getInstance(document.getElementById('addMenuItemModal')).hide();
            refreshMenuStats();
            loadRecentMenuItems();
        } else {
            showNotification(data.message || 'שגיאה בהוספת הפריט', 'error');
        }
    })
    .catch(error => {
        console.error('Error adding menu item:', error);
        showNotification('שגיאה בחיבור לשרת', 'error');
    })
    .finally(() => {
        addButton.innerHTML = originalText;
        addButton.disabled = false;
    });
}

// Quick Actions
function exportReport() {
    const button = event.target;
    const originalText = button.innerHTML;
    
    button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> מייצא...';
    button.disabled = true;
    
    fetch('/api/reports/export')
        .then(response => {
            if (response.ok) {
                return response.blob();
            } else {
                throw new Error('Failed to export report');
            }
        })
        .then(blob => {
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            a.download = `roladin_report_${new Date().toISOString().split('T')[0]}.xlsx`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            showNotification('הדוח יוצא בהצלחה!', 'success');
        })
        .catch(error => {
            console.error('Error exporting report:', error);
            showNotification('שגיאה בייצוא הדוח', 'error');
        })
        .finally(() => {
            button.innerHTML = originalText;
            button.disabled = false;
        });
}

function viewAnalytics() {
    // This would typically open an analytics dashboard
    showNotification('פתיחת דשבורד ניתוח נתונים - בפיתוח', 'info');
}

// Utility Functions
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `alert alert-${type} position-fixed top-0 start-50 translate-middle-x mt-3 notification-alert`;
    notification.style.zIndex = '9999';
    notification.style.minWidth = '300px';
    notification.style.textAlign = 'center';
    
    const icons = {
        'success': 'fas fa-check-circle',
        'error': 'fas fa-exclamation-triangle',
        'warning': 'fas fa-exclamation-circle',
        'info': 'fas fa-info-circle'
    };
    
    notification.innerHTML = `
        <div class="d-flex align-items-center justify-content-between">
            <div class="d-flex align-items-center">
                <i class="${icons[type] || icons.info} me-2"></i>
                <span>${message}</span>
            </div>
            <button type="button" class="btn-close btn-close-white ms-3" onclick="this.parentElement.parentElement.remove()"></button>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (notification.parentElement) {
            notification.style.animation = 'slideOutUp 0.3s ease forwards';
            setTimeout(() => {
                if (notification.parentElement) {
                    notification.remove();
                }
            }, 300);
        }
    }, 5000);
    
    // Animate in
    setTimeout(() => {
        notification.style.animation = 'slideInDown 0.3s ease forwards';
    }, 100);
}

function formatCurrency(amount) {
    return `₪${parseFloat(amount).toFixed(2)}`;
}

function formatNumber(number) {
    return new Intl.NumberFormat('he-IL').format(number);
}

// Real-time Updates
let updateInterval;

function startRealTimeUpdates() {
    updateInterval = setInterval(() => {
        refreshOrders();
        refreshMenuStats();
        updateTimeAgo();
    }, 60000); // Update every minute
}

function stopRealTimeUpdates() {
    if (updateInterval) {
        clearInterval(updateInterval);
    }
}

// Page Visibility API for performance
document.addEventListener('visibilitychange', function() {
    if (document.hidden) {
        stopRealTimeUpdates();
    } else {
        startRealTimeUpdates();
        refreshOrders();
        refreshMenuStats();
    }
});

// Keyboard shortcuts
document.addEventListener('keydown', function(e) {
    // Alt + R = Refresh orders
    if (e.altKey && e.key === 'r') {
        e.preventDefault();
        refreshOrders();
        showNotification('הזמנות רוענו (Alt+R)', 'info');
    }
    
    // Alt + A = Add menu item
    if (e.altKey && e.key === 'a') {
        e.preventDefault();
        const modal = new bootstrap.Modal(document.getElementById('addMenuItemModal'));
        modal.show();
    }
    
    // Alt + E = Export report
    if (e.altKey && e.key === 'e') {
        e.preventDefault();
        exportReport();
    }
});

// Error Handling
window.addEventListener('error', function(e) {
    console.error('Dashboard error:', e.error);
    showNotification('שגיאה לא צפויה במערכת', 'error');
});

window.addEventListener('unhandledrejection', function(e) {
    console.error('Unhandled promise rejection:', e.reason);
    showNotification('שגיאה בטעינת נתונים', 'error');
});

// Initialize real-time updates
startRealTimeUpdates();

// Expose functions to global scope for onclick handlers
window.refreshOrders = refreshOrders;
window.viewOrderDetails = viewOrderDetails;
window.updateOrderStatus = updateOrderStatus;
window.bulkToggleAvailability = bulkToggleAvailability;
window.refreshMenuStats = refreshMenuStats;
window.addMenuItem = addMenuItem;
window.exportReport = exportReport;
window.viewAnalytics = viewAnalytics;

// Additional CSS animations for notifications
const style = document.createElement('style');
style.textContent = `
@keyframes slideInDown {
    from {
        transform: translate(-50%, -100%);
        opacity: 0;
    }
    to {
        transform: translate(-50%, 0);
        opacity: 1;
    }
}

@keyframes slideOutUp {
    from {
        transform: translate(-50%, 0);
        opacity: 1;
    }
    to {
        transform: translate(-50%, -100%);
        opacity: 0;
    }
}

.notification-alert {
    border-radius: 15px;
    border: none;
    box-shadow: 0 10px 30px rgba(0,0,0,0.15);
    backdrop-filter: blur(10px);
}
`;
document.head.appendChild(style);

console.log('🚀 Dashboard initialized successfully!');