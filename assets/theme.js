/**
 * W8st Shop Theme JavaScript
 * AJAX Cart and Wishlist functionality
 */

document.addEventListener('DOMContentLoaded', function() {
  // Wishlist functionality
  const wishlist = JSON.parse(localStorage.getItem('w8st-wishlist') || '[]');
  const wishlistCount = document.getElementById('wishlist-count');

  if (wishlistCount) {
    wishlistCount.textContent = wishlist.length;
  }

  // Add to cart with AJAX
  const addToCartForms = document.querySelectorAll('.product-form');

  addToCartForms.forEach(form => {
    form.addEventListener('submit', function(e) {
      e.preventDefault();

      const formData = new FormData(form);
      const variantId = formData.get('id');

      fetch('/cart/add.js', {
        method: 'POST',
        body: JSON.stringify({
          id: variantId,
          quantity: 1
        }),
        headers: {
          'Content-Type': 'application/json'
        }
      })
      .then(response => response.json())
      .then(data => {
        // Update cart count
        fetch('/cart.js')
          .then(res => res.json())
          .then(cart => {
            const cartCount = document.getElementById('cart-count');
            if (cartCount) {
              cartCount.textContent = cart.item_count;
            }
          });

        // Show notification
        showNotification('Product added to cart!', 'success');
      })
      .catch(error => {
        showNotification('Error adding to cart', 'error');
      });
    });
  });

  // Wishlist toggle buttons
  const wishlistButtons = document.querySelectorAll('.wishlist-toggle');
  wishlistButtons.forEach(btn => {
    btn.addEventListener('click', function(e) {
      e.preventDefault();
      // Wishlist modal or page navigation would go here
      window.location.href = '/pages/wishlist';
    });
  });

  // Cart toggle button
  const cartButtons = document.querySelectorAll('.cart-toggle');
  cartButtons.forEach(btn => {
    btn.addEventListener('click', function(e) {
      e.preventDefault();
      // Open cart drawer
      const cartDrawer = document.getElementById('cart-drawer');
      if (cartDrawer) {
        cartDrawer.classList.add('active');
      } else {
        window.location.href = '/cart';
      }
    });
  });

  // Close cart drawer
  const closeCartButtons = document.querySelectorAll('[data-close-cart]');
  closeCartButtons.forEach(btn => {
    btn.addEventListener('click', function() {
      const cartDrawer = document.getElementById('cart-drawer');
      if (cartDrawer) {
        cartDrawer.classList.remove('active');
      }
    });
  });

  // Search toggle
  const searchButtons = document.querySelectorAll('.search-toggle');
  searchButtons.forEach(btn => {
    btn.addEventListener('click', function(e) {
      e.preventDefault();
      // Search modal would go here
      const searchInput = prompt('Search products:');
      if (searchInput) {
        window.location.href = `/search?q=${encodeURIComponent(searchInput)}`;
      }
    });
  });
});

// Notification helper
function showNotification(message, type) {
  const notification = document.createElement('div');
  notification.className = `notification notification--${type}`;
  notification.textContent = message;
  notification.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    background: ${type === 'success' ? '#e8b84b' : '#ff4444'};
    color: #1a1208;
    padding: 15px 25px;
    font-weight: 600;
    z-index: 1000;
    animation: slideIn 0.3s ease;
  `;

  document.body.appendChild(notification);

  setTimeout(() => {
    notification.remove();
  }, 3000);
}

// Add animation keyframes
const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from { transform: translateX(100%); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }
`;
document.head.appendChild(style);