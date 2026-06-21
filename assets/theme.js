// W8st Shop Theme JavaScript

document.addEventListener('DOMContentLoaded', function() {
  initMobileMenu();
  initCartDrawer();
  initAjaxCart();
  initAccordion();
  initProductGallery();
  initSizeSelector();
  initColorSelector();
});

// Mobile Hamburger Menu
function initMobileMenu() {
  const hamburger = document.getElementById('hamburger');
  const nav = document.getElementById('nav');
  
  if (hamburger && nav) {
    hamburger.addEventListener('click', function() {
      nav.classList.toggle('open');
      hamburger.textContent = nav.classList.contains('open') ? '✕' : '☰';
    });
    
    // Close menu when clicking on a link
    nav.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', function() {
        nav.classList.remove('open');
        hamburger.textContent = '☰';
      });
    });
  }
}

// Cart Drawer
function initCartDrawer() {
  const openCartBtns = document.querySelectorAll('[data-open-cart]');
  const closeCartBtn = document.querySelector('.cart-close');
  const cartDrawer = document.querySelector('.cart-drawer');
  const cartOverlay = document.querySelector('.cart-drawer-overlay');
  
  openCartBtns.forEach(btn => {
    btn.addEventListener('click', function() {
      if (cartDrawer) cartDrawer.classList.add('open');
      if (cartOverlay) cartOverlay.classList.add('open');
      document.body.style.overflow = 'hidden';
    });
  });
  
  function closeCart() {
    if (cartDrawer) cartDrawer.classList.remove('open');
    if (cartOverlay) cartOverlay.classList.remove('open');
    document.body.style.overflow = '';
  }
  
  if (closeCartBtn) {
    closeCartBtn.addEventListener('click', closeCart);
  }
  
  if (cartOverlay) {
    cartOverlay.addEventListener('click', closeCart);
  }
}

// AJAX Cart Functionality
function initAjaxCart() {
  const addToCartForms = document.querySelectorAll('[data-add-to-cart]');
  
  addToCartForms.forEach(form => {
    form.addEventListener('submit', function(e) {
      e.preventDefault();
      
      const formData = new FormData(form);
      const productId = formData.get('id') || form.querySelector('[name="id"]')?.value;
      const quantity = formData.get('quantity') || 1;
      
      fetch('/cart/add.js', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: productId,
          quantity: parseInt(quantity)
        })
      })
      .then(response => response.json())
      .then(data => {
        updateCartCount();
        openCartDrawer();
        showNotification('Added to cart!');
      })
      .catch(error => {
        console.error('Error adding to cart:', error);
        showNotification('Error adding to cart', 'error');
      });
    });
  });
}

function updateCartCount() {
  fetch('/cart.js')
    .then(response => response.json())
    .then(cart => {
      const countElements = document.querySelectorAll('[data-cart-count]');
      countElements.forEach(el => {
        el.textContent = cart.item_count;
      });
    })
    .catch(error => console.error('Error updating cart count:', error));
}

function openCartDrawer() {
  const cartDrawer = document.querySelector('.cart-drawer');
  const cartOverlay = document.querySelector('.cart-drawer-overlay');
  
  if (cartDrawer) cartDrawer.classList.add('open');
  if (cartOverlay) cartOverlay.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function showNotification(message, type = 'success') {
  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;
  notification.textContent = message;
  notification.style.cssText = `
    position: fixed;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: ${type === 'success' ? '#e8b84b' : '#dc3545'};
    color: ${type === 'success' ? '#1a1208' : '#fff'};
    padding: 1rem 2rem;
    border-radius: 4px;
    font-weight: 600;
    z-index: 3000;
    animation: slideUp 0.3s ease;
  `;
  
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.style.animation = 'slideDown 0.3s ease';
    setTimeout(() => notification.remove(), 300);
  }, 2000);
}

// Accordion functionality
function initAccordion() {
  const accordionHeaders = document.querySelectorAll('.accordion-header');
  
  accordionHeaders.forEach(header => {
    header.addEventListener('click', function() {
      const item = this.closest('.accordion-item');
      const isActive = item.classList.contains('active');
      
      // Close all accordions
      document.querySelectorAll('.accordion-item').forEach(i => {
        i.classList.remove('active');
      });
      
      // Open clicked accordion if it wasn't active
      if (!isActive) {
        item.classList.add('active');
      }
    });
  });
}

// Product Gallery
function initProductGallery() {
  const thumbnails = document.querySelectorAll('.thumbnail');
  const mainImage = document.querySelector('.product-main-image img');
  
  thumbnails.forEach(thumb => {
    thumb.addEventListener('click', function() {
      // Remove active class from all thumbnails
      thumbnails.forEach(t => t.classList.remove('active'));
      
      // Add active class to clicked thumbnail
      this.classList.add('active');
      
      // Update main image
      if (mainImage) {
        mainImage.src = this.querySelector('img').src;
      }
    });
  });
}

// Size Selector
function initSizeSelector() {
  const sizeBtns = document.querySelectorAll('.size-btn');
  
  sizeBtns.forEach(btn => {
    btn.addEventListener('click', function() {
      sizeBtns.forEach(b => b.classList.remove('selected'));
      this.classList.add('selected');
    });
  });
}

// Color Selector
function initColorSelector() {
  const colorBtns = document.querySelectorAll('.color-btn');
  
  colorBtns.forEach(btn => {
    btn.addEventListener('click', function() {
      colorBtns.forEach(b => b.classList.remove('selected'));
      this.classList.add('selected');
    });
  });
}

// Sticky Header on Scroll
let lastScroll = 0;
window.addEventListener('scroll', function() {
  const header = document.querySelector('.header');
  const currentScroll = window.pageYOffset;
  
  if (currentScroll > 100) {
    header.style.background = 'rgba(26, 18, 8, 0.98)';
    header.style.boxShadow = '0 2px 20px rgba(0, 0, 0, 0.3)';
  } else {
    header.style.background = '#1a1208';
    header.style.boxShadow = 'none';
  }
  
  lastScroll = currentScroll;
});

// Language Switcher
function setLocale(locale) {
  const url = new URL(window.location);
  url.searchParams.set('locale', locale);
  window.location.href = url.toString();
}

// Lazy Loading Images
if ('loading' in HTMLImageElement.prototype) {
  const images = document.querySelectorAll('img[loading="lazy"]');
  images.forEach(img => {
    img.src = img.dataset.src;
  });
} else {
  // Fallback for browsers that don't support lazy loading
  const script = document.createElement('script');
  script.src = 'https://cdnjs.cloudflare.com/ajax/libs/lazysizes/5.3.2/lazysizes.min.js';
  document.head.appendChild(script);
}

// Cart Quantity Update
function updateCartItem(line, quantity) {
  fetch('/cart/change.js', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      line: line,
      quantity: quantity
    })
  })
  .then(response => response.json())
  .then(data => {
    updateCartCount();
    location.reload();
  })
  .catch(error => console.error('Error updating cart:', error));
}

function removeCartItem(line) {
  updateCartItem(line, 0);
}
