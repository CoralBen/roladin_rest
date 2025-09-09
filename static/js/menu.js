document.addEventListener('DOMContentLoaded', function() {
    initializeMenu();
});

function initializeMenu() {
    initializeFilters();
    initializeSearch();
    initializeQuantityControls();
    initializeAddToCartForms();
    initializeCartSummary();
    updateCartDisplay();
    initializeAnimations();
    initializeImageManagement();
    initializeImageModal();
    initializeLazyLoading();
}

function initializeFilters() {
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const category = this.getAttribute('data-category');
            filterMenuItems(category);
            updateActiveFilter(this);
        });
    });
}

function filterMenuItems(category) {
    const menuItems = document.querySelectorAll('.menu-item-wrapper');
    
    menuItems.forEach(item => {
        const itemCategory = item.getAttribute('data-category');
        
        if (category === 'all' || itemCategory === category) {
            item.classList.remove('filtered-out');
            setTimeout(() => {
                item.style.display = 'block';
            }, 100);
        } else {
            item.classList.add('filtered-out');
            setTimeout(() => {
                if (item.classList.contains('filtered-out')) {
                    item.style.display = 'none';
                }
            }, 500);
        }
    });
    
    updateNoItemsMessage();
}

function updateActiveFilter(activeBtn) {
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    activeBtn.classList.add('active');
}

function initializeSearch() {
    const searchInput = document.getElementById('searchInput');
    
    searchInput.addEventListener('input', Utils.debounce(function() {
        searchMenuItems(this.value.toLowerCase());
    }, 300));
}

function searchMenuItems(searchTerm) {
    const menuItems = document.querySelectorAll('.menu-item-wrapper');
    let hasVisibleItems = false;
    
    menuItems.forEach(item => {
        const itemName = item.getAttribute('data-name');
        const shouldShow = itemName.includes(searchTerm);
        
        if (shouldShow) {
            item.classList.remove('filtered-out');
            item.style.display = 'block';
            hasVisibleItems = true;
        } else {
            item.classList.add('filtered-out');
            setTimeout(() => {
                if (item.classList.contains('filtered-out')) {
                    item.style.display = 'none';
                }
            }, 300);
        }
    });
    
    updateNoItemsMessage();
}

function updateNoItemsMessage() {
    const visibleItems = document.querySelectorAll('.menu-item-wrapper:not(.filtered-out)');
    const noItemsDiv = document.querySelector('.no-items-found');
    const menuGrid = document.getElementById('menuItemsGrid');
    
    if (visibleItems.length === 0) {
        if (!noItemsDiv) {
            const noItemsHtml = `
                <div class="no-items-found col-12">
                    <div class="text-center p-5">
                        <i class="fas fa-search fa-4x text-muted mb-3"></i>
                        <h4>לא נמצאו מוצרים</h4>
                        <p class="text-muted">נסה לחפש בקטגוריה אחרת או נקה את החיפוש</p>
                        <button class="btn btn-primary" onclick="clearFilters()">
                            <i class="fas fa-refresh"></i> נקה סינון
                        </button>
                    </div>
                </div>
            `;
            menuGrid.insertAdjacentHTML('beforeend', noItemsHtml);
        }
    } else {
        if (noItemsDiv) {
            noItemsDiv.remove();
        }
    }
}

function clearFilters() {
    document.getElementById('searchInput').value = '';
    document.querySelector('[data-category="all"]').click();
    
    document.querySelectorAll('.menu-item-wrapper').forEach(item => {
        item.classList.remove('filtered-out');
        item.style.display = 'block';
    });
    
    const noItemsDiv = document.querySelector('.no-items-found');
    if (noItemsDiv) {
        noItemsDiv.remove();
    }
}

function initializeQuantityControls() {
    document.querySelectorAll('.quantity-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const action = this.getAttribute('data-action');
            const inputGroup = this.closest('.quantity-input-group');
            const input = inputGroup.querySelector('.quantity-input');
            
            let currentValue = parseInt(input.value);
            
            if (action === 'increase' && currentValue < 10) {
                currentValue++;
            } else if (action === 'decrease' && currentValue > 1) {
                currentValue--;
            }
            
            input.value = currentValue;
            updateItemTotal(inputGroup);
            animateQuantityChange(input);
        });
    });
}

function updateItemTotal(inputGroup) {
    const card = inputGroup.closest('.menu-item-card');
    const quantity = parseInt(inputGroup.querySelector('.quantity-input').value);
    const priceElement = card.querySelector('.price-tag');
    const basePrice = parseFloat(priceElement.textContent.replace('₪', ''));
    
    let totalElement = card.querySelector('.item-total');
    if (!totalElement) {
        totalElement = document.createElement('small');
        totalElement.className = 'item-total text-primary d-block mt-1';
        priceElement.parentNode.appendChild(totalElement);
    }
    
    if (quantity > 1) {
        const total = (basePrice * quantity).toFixed(2);
        totalElement.textContent = `סה"כ: ₪${total}`;
        totalElement.style.display = 'block';
    } else {
        totalElement.style.display = 'none';
    }
}

function animateQuantityChange(input) {
    input.style.transform = 'scale(1.2)';
    input.style.background = '#e7f3ff';
    
    setTimeout(() => {
        input.style.transform = 'scale(1)';
        input.style.background = '#f8f9fa';
    }, 200);
}

function initializeAddToCartForms() {
    document.querySelectorAll('.add-to-cart-form').forEach(form => {
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const card = this.closest('.menu-item-card');
            const quantityInput = card.querySelector('.quantity-input');
            const specialRequestsTextarea = card.querySelector('.special-requests');
            
            const formData = new FormData();
            formData.append('item_id', this.querySelector('input[name="item_id"]').value);
            formData.append('quantity', quantityInput.value);
            formData.append('special_requests', specialRequestsTextarea.value);
            
            const button = this.querySelector('.add-to-cart-btn');
            const originalText = button.innerHTML;
            
            button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> מוסיף...';
            button.disabled = true;
            
            fetch('/add_to_cart', {
                method: 'POST',
                body: formData
            })
            .then(response => {
                if (response.ok) {
                    showSuccessAnimation(button, card);
                    updateCartDisplay();
                    resetItemForm(card);
                    
                    const itemName = card.querySelector('.card-title').textContent;
                    showAlert('success', `${itemName} נוסף לעגלה בהצלחה!`);
                } else {
                    throw new Error('Network response was not ok');
                }
            })
            .catch(error => {
                console.error('Error:', error);
                showAlert('error', 'שגיאה בהוספת הפריט לעגלה');
            })
            .finally(() => {
                setTimeout(() => {
                    button.innerHTML = originalText;
                    button.disabled = false;
                }, 1500);
            });
        });
    });
}

// ========================
// ניהול תמונות
// ========================

function initializeImageManagement() {
    // כפתורי ניהול תמונות
    document.querySelectorAll('.upload-image-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const itemId = this.getAttribute('data-item-id');
            openImageUpload(itemId);
        });
    });
    
    document.querySelectorAll('.delete-image-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const itemId = this.getAttribute('data-item-id');
            deleteItemImage(itemId);
        });
    });
    
    document.querySelectorAll('.change-image-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const itemId = this.getAttribute('data-item-id');
            openImageUpload(itemId, true);
        });
    });
}

function openImageUpload(itemId, isReplace = false) {
    const modal = document.getElementById('imageUploadModal');
    const input = document.getElementById('imageFileInput');
    const dropZone = document.getElementById('imageDropZone');
    const itemIdInput = document.getElementById('uploadItemId');
    
    if (!modal) {
        createImageUploadModal();
        return openImageUpload(itemId, isReplace);
    }
    
    itemIdInput.value = itemId;
    modal.classList.add('show');
    
    // עדכון טקסט בהתאם למצב
    const modalTitle = modal.querySelector('.modal-title');
    modalTitle.textContent = isReplace ? 'החלף תמונה' : 'העלה תמונה';
    
    // איפוס הקלט
    input.value = '';
    updateDropZoneText();
}

function createImageUploadModal() {
    const modalHtml = `
        <div id="imageUploadModal" class="image-upload-modal">
            <div class="upload-modal-content">
                <div class="d-flex justify-content-between align-items-center mb-3">
                    <h5 class="modal-title">העלה תמונה</h5>
                    <button type="button" class="btn-close" onclick="closeImageUpload()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                
                <form id="imageUploadForm" enctype="multipart/form-data">
                    <input type="hidden" id="uploadItemId" name="item_id">
                    
                    <div id="imageDropZone" class="file-drop-zone mb-3">
                        <i class="fas fa-cloud-upload-alt fa-3x mb-3 text-primary"></i>
                        <h6 class="drop-zone-title">גרור תמונה לכאן או לחץ לבחירה</h6>
                        <p class="drop-zone-subtitle text-muted">JPG, PNG, GIF עד 5MB</p>
                        <input type="file" id="imageFileInput" name="image" accept="image/*" style="display: none;">
                    </div>
                    
                    <div id="imagePreview" class="mb-3" style="display: none;">
                        <img id="previewImg" style="max-width: 100%; height: 200px; object-fit: cover; border-radius: 10px;">
                        <p id="imageInfo" class="text-muted small mt-2"></p>
                    </div>
                    
                    <div class="d-flex gap-2">
                        <button type="submit" class="btn btn-primary flex-fill">
                            <i class="fas fa-upload"></i> העלה תמונה
                        </button>
                        <button type="button" class="btn btn-secondary" onclick="closeImageUpload()">
                            ביטול
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    initializeImageModal();
}

function initializeImageModal() {
    const modal = document.getElementById('imageUploadModal');
    const dropZone = document.getElementById('imageDropZone');
    const fileInput = document.getElementById('imageFileInput');
    const form = document.getElementById('imageUploadForm');
    
    if (!modal) return;
    
    // Drag & Drop functionality
    dropZone.addEventListener('click', () => fileInput.click());
    
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('dragover');
    });
    
    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('dragover');
    });
    
    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('dragover');
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleFileSelection(files[0]);
        }
    });
    
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleFileSelection(e.target.files[0]);
        }
    });
    
    form.addEventListener('submit', handleImageUpload);
    
    // סגירת מודל בלחיצה על הרקע
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeImageUpload();
        }
    });
}

function handleFileSelection(file) {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    const maxSize = 5 * 1024 * 1024; // 5MB
    
    if (!allowedTypes.includes(file.type)) {
        showAlert('error', 'סוג קובץ לא נתמך. אנא בחר JPG, PNG, GIF או WebP');
        return;
    }
    
    if (file.size > maxSize) {
        showAlert('error', 'הקובץ גדול מדי. הגודל המקסימלי הוא 5MB');
        return;
    }
    
    // הצגת תצוגה מקדימה
    const reader = new FileReader();
    reader.onload = (e) => {
        const previewDiv = document.getElementById('imagePreview');
        const previewImg = document.getElementById('previewImg');
        const imageInfo = document.getElementById('imageInfo');
        
        previewImg.src = e.target.result;
        imageInfo.textContent = `${file.name} (${(file.size / 1024).toFixed(1)} KB)`;
        previewDiv.style.display = 'block';
        
        updateDropZoneText('תמונה נבחרה בהצלחה');
    };
    reader.readAsDataURL(file);
    
    // הגדרת הקובץ בשדה הקלט
    const fileInput = document.getElementById('imageFileInput');
    const dt = new DataTransfer();
    dt.items.add(file);
    fileInput.files = dt.files;
}

function updateDropZoneText(message = null) {
    const dropZone = document.getElementById('imageDropZone');
    const title = dropZone.querySelector('.drop-zone-title');
    const subtitle = dropZone.querySelector('.drop-zone-subtitle');
    
    if (message) {
        title.textContent = message;
        subtitle.textContent = 'לחץ לבחירת תמונה אחרת';
        dropZone.style.borderColor = '#28a745';
        dropZone.style.background = 'rgba(40, 167, 69, 0.05)';
    } else {
        title.textContent = 'גרור תמונה לכאן או לחץ לבחירה';
        subtitle.textContent = 'JPG, PNG, GIF עד 5MB';
        dropZone.style.borderColor = '#667eea';
        dropZone.style.background = '';
    }
}

function handleImageUpload(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> מעלה...';
    submitBtn.disabled = true;
    
    fetch('/upload_item_image', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showAlert('success', 'התמונה הועלתה בהצלחה!');
            closeImageUpload();
            
            // עדכון התמונה בדף
            updateItemImage(formData.get('item_id'), data.image_url);
        } else {
            showAlert('error', data.error || 'שגיאה בהעלאת התמונה');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showAlert('error', 'שגיאה בהעלאת התמונה');
    })
    .finally(() => {
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    });
}

function updateItemImage(itemId, imageUrl) {
    const itemCard = document.querySelector(`[data-item-id="${itemId}"]`);
    if (!itemCard) return;
    
    const imageContainer = itemCard.querySelector('.menu-item-image-container');
    const placeholder = imageContainer.querySelector('.menu-item-placeholder');
    
    if (placeholder) {
        // החלפת placeholder בתמונה
        const img = document.createElement('img');
        img.className = 'menu-item-image';
        img.src = imageUrl;
        img.alt = itemCard.querySelector('.card-title').textContent;
        img.loading = 'lazy';
        
        imageContainer.innerHTML = '';
        imageContainer.appendChild(img);
        
        // הוספת כפתורי ניהול
        addImageManagementButtons(imageContainer, itemId);
    } else {
        // עדכון תמונה קיימת
        const img = imageContainer.querySelector('.menu-item-image');
        if (img) {
            img.src = imageUrl;
        }
    }
}

function addImageManagementButtons(container, itemId) {
    const managementDiv = document.createElement('div');
    managementDiv.className = 'image-management';
    managementDiv.innerHTML = `
        <button class="image-btn change-image-btn" data-item-id="${itemId}" title="החלף תמונה">
            <i class="fas fa-edit"></i>
        </button>
        <button class="image-btn delete-image-btn" data-item-id="${itemId}" title="מחק תמונה">
            <i class="fas fa-trash"></i>
        </button>
    `;
    
    container.appendChild(managementDiv);
    
    // הוספת אירועים לכפתורים החדשים
    managementDiv.querySelector('.change-image-btn').addEventListener('click', function() {
        openImageUpload(itemId, true);
    });
    
    managementDiv.querySelector('.delete-image-btn').addEventListener('click', function() {
        deleteItemImage(itemId);
    });
}

function deleteItemImage(itemId) {
    if (!confirm('האם אתה בטוח שברצונך למחוק את התמונה?')) {
        return;
    }
    
    fetch(`/delete_item_image/${itemId}`, {
        method: 'DELETE'
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showAlert('success', 'התמונה נמחקה בהצלחה');
            
            // החזרת placeholder
            const itemCard = document.querySelector(`[data-item-id="${itemId}"]`);
            const imageContainer = itemCard.querySelector('.menu-item-image-container');
            
            imageContainer.innerHTML = `
                <div class="menu-item-placeholder">
                    <i class="fas fa-utensils"></i>
                    <p>אין תמונה זמינה</p>
                </div>
                <div class="image-management">
                    <button class="image-btn upload-image-btn" data-item-id="${itemId}" title="העלה תמונה">
                        <i class="fas fa-camera"></i>
                    </button>
                </div>
            `;
            
            // הוספת אירוע לכפתור החדש
            imageContainer.querySelector('.upload-image-btn').addEventListener('click', function() {
                openImageUpload(itemId);
            });
        } else {
            showAlert('error', data.error || 'שגיאה במחיקת התמונה');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showAlert('error', 'שגיאה במחיקת התמונה');
    });
}

function closeImageUpload() {
    const modal = document.getElementById('imageUploadModal');
    modal.classList.remove('show');
    
    // איפוס הטופס
    setTimeout(() => {
        const form = document.getElementById('imageUploadForm');
        form.reset();
        document.getElementById('imagePreview').style.display = 'none';
        updateDropZoneText();
    }, 300);
}

// ========================
// Lazy Loading לתמונות
// ========================

function initializeLazyLoading() {
    if ('IntersectionObserver' in window) {
        const imageObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    img.src = img.dataset.src;
                    img.classList.remove('image-loading');
                    observer.unobserve(img);
                }
            });
        });
        
        document.querySelectorAll('img[data-src]').forEach(img => {
            img.classList.add('image-loading');
            imageObserver.observe(img);
        });
    }
}

// ========================
// פונקציות מקוריות
// ========================

function showSuccessAnimation(button, card) {
    button.innerHTML = '<i class="fas fa-check"></i> נוסף!';
    button.classList.remove('btn-primary');
    button.classList.add('btn-success');
    
    card.style.transform = 'scale(1.02)';
    card.style.boxShadow = '0 15px 35px rgba(102, 126, 234, 0.3)';
    
    setTimeout(() => {
        card.style.transform = '';
        card.style.boxShadow = '';
    }, 300);
    
    setTimeout(() => {
        button.classList.remove('btn-success');
        button.classList.add('btn-primary');
    }, 1500);
}

function resetItemForm(card) {
    const quantityInput = card.querySelector('.quantity-input');
    const specialRequestsTextarea = card.querySelector('.special-requests');
    const totalElement = card.querySelector('.item-total');
    
    quantityInput.value = 1;
    specialRequestsTextarea.value = '';
    
    if (totalElement) {
        totalElement.style.display = 'none';
    }
}

function initializeCartSummary() {
    updateCartSummaryPosition();
    
    window.addEventListener('scroll', Utils.debounce(function() {
        updateCartSummaryPosition();
    }, 100));
}

function updateCartSummaryPosition() {
    const cartSummary = document.getElementById('cartSummary');
    if (!cartSummary) return;
    
    const footer = document.querySelector('.footer');
    if (!footer) return;
    
    const footerRect = footer.getBoundingClientRect();
    
    if (footerRect.top < window.innerHeight) {
        cartSummary.style.bottom = `${window.innerHeight - footerRect.top + 20}px`;
    } else {
        cartSummary.style.bottom = '20px';
    }
}

function updateCartDisplay() {
    fetch('/api/cart-count')
        .then(response => response.json())
        .then(data => {
            updateCartBadge(data.count);
            updateCartSummary(data.count, data.total);
        })
        .catch(error => {
            console.error('Error updating cart display:', error);
            
            const cartBadge = document.querySelector('.cart-badge');
            if (cartBadge) {
                const currentCount = parseInt(cartBadge.textContent) || 0;
                updateCartBadge(currentCount + 1);
            }
        });
}

function updateCartBadge(count) {
    const cartBadge = document.querySelector('.cart-badge');
    if (cartBadge) {
        cartBadge.textContent = count;
        if (count > 0) {
            cartBadge.style.display = 'inline-block';
            cartBadge.classList.add('cart-badge');
        } else {
            cartBadge.style.display = 'none';
        }
    }
}

function updateCartSummary(count, total) {
    const cartSummary = document.getElementById('cartSummary');
    if (!cartSummary) return;
    
    const countElement = document.getElementById('cartItemCount');
    const totalElement = document.getElementById('cartTotal');
    
    if (count > 0) {
        cartSummary.style.display = 'block';
        if (countElement) countElement.textContent = count;
        if (totalElement) totalElement.textContent = `₪${total.toFixed(2)}`;
    } else {
        cartSummary.style.display = 'none';
    }
}

function initializeAnimations() {
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
    
    document.querySelectorAll('.menu-item-wrapper').forEach(item => {
        observer.observe(item);
    });
}

function sortMenuItems(sortBy) {
    const grid = document.getElementById('menuItemsGrid');
    const items = Array.from(grid.querySelectorAll('.menu-item-wrapper'));
    
    items.sort((a, b) => {
        switch(sortBy) {
            case 'name':
                return a.getAttribute('data-name').localeCompare(b.getAttribute('data-name'));
            case 'price-low':
                return parseFloat(a.getAttribute('data-price')) - parseFloat(b.getAttribute('data-price'));
            case 'price-high':
                return parseFloat(b.getAttribute('data-price')) - parseFloat(a.getAttribute('data-price'));
            default:
                return 0;
        }
    });
    
    items.forEach(item => grid.appendChild(item));
}

function toggleFavorite(itemId) {
    const favorites = JSON.parse(localStorage.getItem('favorites')) || [];
    const index = favorites.indexOf(itemId);
    
    if (index > -1) {
        favorites.splice(index, 1);
    } else {
        favorites.push(itemId);
    }
    
    localStorage.setItem('favorites', JSON.stringify(favorites));
    updateFavoriteButtons();
}

function updateFavoriteButtons() {
    const favorites = JSON.parse(localStorage.getItem('favorites')) || [];
    
    document.querySelectorAll('[data-item-id]').forEach(btn => {
        const itemId = btn.getAttribute('data-item-id');
        const icon = btn.querySelector('i');
        
        if (favorites.includes(itemId)) {
            icon.classList.remove('far');
            icon.classList.add('fas');
            btn.classList.add('favorite-active');
        } else {
            icon.classList.remove('fas');
            icon.classList.add('far');
            btn.classList.remove('favorite-active');
        }
    });
}

// פונקציית עזר להצגת התרעות
function showAlert(type, message) {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type === 'success' ? 'success' : 'danger'} alert-dismissible fade show position-fixed`;
    alertDiv.style.cssText = 'top: 20px; right: 20px; z-index: 10000; min-width: 300px;';
    alertDiv.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'} me-2"></i>
        ${message}
        <button type="button" class="btn-close" onclick="this.parentElement.remove()"></button>
    `;
    
    document.body.appendChild(alertDiv);
    
    setTimeout(() => {
        if (alertDiv.parentElement) {
            alertDiv.remove();
        }
    }, 5000);
}

const menuUtils = {
    formatPrice: function(price) {
        return `₪${parseFloat(price).toFixed(2)}`;
    },
    
    calculateItemTotal: function(price, quantity) {
        return price * quantity;
    },
    
    validateQuantity: function(quantity) {
        return quantity >= 1 && quantity <= 10;
    },
    
    highlightSearchTerm: function(text, term) {
        if (!term) return text;
        const regex = new RegExp(`(${term})`, 'gi');
        return text.replace(regex, '<mark>$1</mark>');
    },
    
    validateImage: function(file) {
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        const maxSize = 5 * 1024 * 1024; // 5MB
        
        if (!allowedTypes.includes(file.type)) {
            return { valid: false, error: 'סוג קובץ לא נתמך' };
        }
        
        if (file.size > maxSize) {
            return { valid: false, error: 'הקובץ גדול מדי' };
        }
        
        return { valid: true };
    },
    
    compressImage: function(file, maxWidth = 800, quality = 0.8) {
        return new Promise((resolve) => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const img = new Image();
            
            img.onload = function() {
                const ratio = Math.min(maxWidth / img.width, maxWidth / img.height);
                canvas.width = img.width * ratio;
                canvas.height = img.height * ratio;
                
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                
                canvas.toBlob(resolve, 'image/jpeg', quality);
            };
            
            img.src = URL.createObjectURL(file);
        });
    }
};

function addKeyboardShortcuts() {
    document.addEventListener('keydown', function(e) {
        if (e.ctrlKey || e.metaKey) {
            switch(e.key) {
                case 'f':
                    e.preventDefault();
                    document.getElementById('searchInput').focus();
                    break;
                case '1':
                    e.preventDefault();
                    document.querySelector('[data-category="all"]').click();
                    break;
                case 'u':
                    e.preventDefault();
                    if (document.querySelector('.upload-image-btn')) {
                        document.querySelector('.upload-image-btn').click();
                    }
                    break;
            }
        }
        
        if (e.key === 'Escape') {
            const modal = document.getElementById('imageUploadModal');
            if (modal && modal.classList.contains('show')) {
                closeImageUpload();
            } else {
                clearFilters();
            }
        }
    });
}

// פונקציות נוספות לניהול תמונות
function preloadImages() {
    const images = document.querySelectorAll('.menu-item-image[data-src]');
    images.forEach(img => {
        const newImg = new Image();
        newImg.onload = function() {
            img.src = img.dataset.src;
            img.classList.remove('image-loading');
        };
        newImg.src = img.dataset.src;
    });
}

function optimizeImageDisplay() {
    // שיפור ביצועים - טעינת תמונות לפי צורך
    const imageObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                if (img.dataset.src && !img.src.includes(img.dataset.src)) {
                    img.src = img.dataset.src;
                    img.classList.remove('image-loading');
                    imageObserver.unobserve(img);
                }
            }
        });
    }, {
        rootMargin: '50px'
    });
    
    document.querySelectorAll('img[data-src]').forEach(img => {
        imageObserver.observe(img);
    });
}

function handleImageError(img) {
    img.style.display = 'none';
    const container = img.closest('.menu-item-image-container');
    
    if (!container.querySelector('.menu-item-placeholder')) {
        const placeholder = document.createElement('div');
        placeholder.className = 'menu-item-placeholder';
        placeholder.innerHTML = `
            <i class="fas fa-image-slash"></i>
            <p>תמונה לא זמינה</p>
        `;
        container.appendChild(placeholder);
    }
}

// עדכון גלובלי של פונקציות
addKeyboardShortcuts();
window.clearFilters = clearFilters;
window.sortMenuItems = sortMenuItems;
window.toggleFavorite = toggleFavorite;
window.menuUtils = menuUtils;
window.openImageUpload = openImageUpload;
window.closeImageUpload = closeImageUpload;
window.deleteItemImage = deleteItemImage;
window.handleImageError = handleImageError;

// אתחול נוסף אחרי טעינת הדף
window.addEventListener('load', function() {
    optimizeImageDisplay();
    updateFavoriteButtons();
    
    // בדיקת תמיכה בתכונות מתקדמות
    if ('serviceWorker' in navigator) {
        console.log('Service Worker זמין - ניתן להוסיף cache לתמונות');
    }
});

document.addEventListener("DOMContentLoaded", () => {
  // כששולחים טופס "הוסף לעגלה"
  document.querySelectorAll(".add-to-cart-form").forEach(form => {
    form.addEventListener("submit", (e) => {
      const card = form.closest(".menu-item-card");

      // לוקחים את הכמות מהשדה הגלוי ומכניסים ל־hidden
      const qtyInput = card.querySelector(".quantity-input");
      const qtyHidden = form.querySelector(".quantity-hidden");
      qtyHidden.value = qtyInput ? qtyInput.value : 1;

      // לוקחים את הבקשות המיוחדות ומכניסים ל־hidden
      const specialInput = card.querySelector(".special-requests");
      const specialHidden = form.querySelector(".special-requests-hidden");
      specialHidden.value = specialInput ? specialInput.value : "";
    });
  });

  // לחצני + ו־- לשינוי הכמות
  document.querySelectorAll(".quantity-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const input = btn.closest(".quantity-input-group").querySelector(".quantity-input");
      let value = parseInt(input.value, 10);
      if (btn.dataset.action === "increase" && value < 10) value++;
      if (btn.dataset.action === "decrease" && value > 1) value--;
      input.value = value;
    });
  });
});
