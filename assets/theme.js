(() => {
  const moneyFormatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0
  });

  const strings = {
    cartEmpty: {{ 'cart.drawer.empty' | t | json }},
    selectVariant: {{ 'sections.product.select_variant' | t | json }},
    addToCart: {{ 'sections.product.add_to_cart' | t | json }},
    adding: {{ 'sections.product.adding' | t | json }},
    added: {{ 'sections.product.added' | t | json }},
    addedToCart: {{ 'sections.product.added_to_cart' | t | json }},
    addError: {{ 'sections.product.add_error' | t | json }},
    quickAdd: {{ 'sections.product_card.quick_add' | t | json }},
    product: {{ 'sections.product.product' | t | json }},
    unavailable: {{ 'sections.product.unavailable' | t | json }}
  };

  const state = {
    cart: null,
    cartBusy: false,
    freeShippingThreshold: Number('{{ settings.free_shipping_threshold }}') || 500000
  };

  const qs = (selector, scope = document) => scope.querySelector(selector);
  const qsa = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));

  const escapeHtml = (value = '') => String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

  const formatMoney = (cents) => {
    if (typeof Shopify !== 'undefined' && typeof Shopify.formatMoney === 'function') {
      return Shopify.formatMoney(cents, window.shopMoneyFormat || '{{ money }}');
    }
    return moneyFormatter.format(cents / 100);
  };

  const updateBodyScroll = () => {
    const anyOpen = qs('#CartDrawer.is-open') || qs('.modal.is-open');
    document.body.style.overflow = anyOpen ? 'hidden' : '';
  };

  const menuToggle = qs('.menu-toggle');
  const primaryNav = qs('#PrimaryNavigation');

  const closeMenu = () => {
    if (!primaryNav || !menuToggle) return;
    primaryNav.classList.remove('is-open');
    menuToggle.setAttribute('aria-expanded', 'false');
    updateBodyScroll();
  };

  if (menuToggle && primaryNav) {
    menuToggle.addEventListener('click', () => {
      const open = primaryNav.classList.toggle('is-open');
      menuToggle.setAttribute('aria-expanded', String(open));
      document.body.style.overflow = open ? 'hidden' : '';
    });

    primaryNav.addEventListener('click', (event) => {
      if (event.target.closest('a') || event.target.closest('[data-close-menu]')) {
        closeMenu();
      }
    });
  }

  qsa('[data-close-menu]').forEach((button) => {
    button.addEventListener('click', closeMenu);
  });

  const normalizeCategory = (value) => String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
    .replace(/ies$/g, 'y');

  const categoryMatches = (filter, categories) => {
    if (filter === 'all') return true;
    const aliases = {
      shoes: ['shoe', 'sneaker', 'sneakers'],
      backpacks: ['backpack', 'bag', 'bags'],
      clothes: ['clothing', 'apparel', 'clothes', 'shirt', 'hoodie', 'pants'],
      sportwear: ['sportswear', 'sport', 'sports', 'gym', 'training', 'active'],
      sportswear: ['sportswear', 'sport', 'sports', 'gym', 'training', 'active'],
      streetwear: ['street', 'urban', 'streetwear']
    };
    const wanted = [filter, ...(aliases[filter] || [])].map(normalizeCategory);
    return categories.some((category) => wanted.includes(normalizeCategory(category)));
  };

  const filterProducts = (filter) => {
    const cards = qsa('[data-product-card]');
    cards.forEach((card) => {
      const categories = `${card.dataset.category || ''} ${card.dataset.title || ''}`.split(/\s+/);
      card.hidden = !categoryMatches(filter, categories);
    });
  };

  qsa('[data-product-filter]').forEach((button) => {
    button.addEventListener('click', () => {
      const filter = button.dataset.productFilter || 'all';
      qsa('[data-product-filter]').forEach((item) => {
        const active = item === button;
        item.classList.toggle('is-active', active);
        item.setAttribute('aria-pressed', String(active));
      });
      filterProducts(filter);
    });
  });

  const openCart = () => {
    const drawer = qs('#CartDrawer');
    if (!drawer) return;
    drawer.classList.add('is-open');
    drawer.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    const panel = qs('.cart-drawer__panel', drawer);
    if (panel) panel.focus({ preventScroll: true });
  };

  const closeCart = () => {
    const drawer = qs('#CartDrawer');
    if (!drawer) return;
    drawer.classList.remove('is-open');
    drawer.setAttribute('aria-hidden', 'true');
    updateBodyScroll();
  };

  const fetchCart = async () => {
    const response = await fetch('/cart.js', { headers: { 'Accept': 'application/json' } });
    if (!response.ok) throw new Error('Cart fetch failed');
    state.cart = await response.json();
    renderCart();
    return state.cart;
  };

  const renderCart = () => {
    const cart = state.cart;
    if (!cart) return;

    qsa('[data-cart-count]').forEach((node) => {
      node.textContent = cart.item_count;
    });

    qsa('[data-cart-subtotal]').forEach((node) => {
      node.textContent = formatMoney(cart.total_price);
    });

    const drawerItems = qs('[data-cart-items]');
    if (drawerItems) {
      if (cart.item_count === 0) {
        drawerItems.innerHTML = `<p class="empty-cart-note">${escapeHtml(strings.cartEmpty)}</p>`;
      } else {
        drawerItems.innerHTML = cart.items.map((item) => `
          <article class="cart-drawer__item" data-drawer-line="${escapeHtml(item.key)}">
            ${item.image ? `<img src="${escapeHtml(item.image)}" width="76" height="92" alt="${escapeHtml(item.product_title)}">` : `<span>W8ST</span>`}
            <div>
              <h3>${escapeHtml(item.product_title)}</h3>
              <p>${escapeHtml(item.variant_title || '')} · ${formatMoney(item.final_line_price)}</p>
              <div class="cart-drawer__item__controls">
                <button type="button" data-drawer-qty="${escapeHtml(item.key)}" data-qty="-1" aria-label="Decrease quantity">−</button>
                <span>${item.quantity}</span>
                <button type="button" data-drawer-qty="${escapeHtml(item.key)}" data-qty="1" aria-label="Increase quantity">+</button>
              </div>
            </div>
          </article>
        `).join('');
      }
    }

    updateFreeShipping(cart.total_price);
  };

  const updateFreeShipping = (total) => {
    const remaining = Math.max(state.freeShippingThreshold - total, 0);
    const message = remaining > 0
      ? `Add ${formatMoney(remaining)} more for free shipping in Tashkent.`
      : '{{ settings.free_shipping_label }}';
    qsa('[data-free-shipping]').forEach((node) => {
      node.textContent = message;
    });
  };

  const cartRequest = async (url, body) => {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(body)
    });
    if (!response.ok) throw new Error(await response.text() || 'Cart request failed');
    return response.json();
  };

  const showNotification = (message) => {
    const existing = qs('.notification');
    if (existing) existing.remove();
    const node = document.createElement('div');
    node.className = 'notification';
    node.textContent = message;
    document.body.appendChild(node);
    setTimeout(() => node.remove(), 2600);
  };

  const getVariantImage = (variant) => {
    if (!variant) return '';
    return variant.featured_media?.preview_image?.url
      || variant.featured_media?.image?.url
      || variant.featured_image
      || variant.image?.src
      || '';
  };

  const getVariantMediaId = (variant) => {
    if (!variant) return '';
    return String(variant.featured_media?.id || variant.image?.id || '');
  };

  const getSelectedVariant = (form) => {
    const variantJson = form.dataset.variantJson ? JSON.parse(form.dataset.variantJson) : [];
    if (!variantJson.length) return null;

    const selected = {};
    qsa('input[name^="options["]:checked, select[name^="options["]', form).forEach((input) => {
      selected[input.name.replace('options[', '').replace(']', '')] = input.value;
    });

    const selectedOptions = Object.values(selected);
    return variantJson.find((item) => (
      item.options && item.options.every((option, index) => option === selectedOptions[index])
    )) || null;
  };

  const updateVariantId = (form) => {
    const variant = getSelectedVariant(form);
    const input = form.querySelector('input[name="id"]');
    if (input && variant?.id) input.value = variant.id;
    return variant?.id;
  };

  const updateButtonState = (form) => {
    const variant = getSelectedVariant(form);
    const input = form.querySelector('input[name="id"]');
    const button = qs('button[type="submit"]', form);
    if (input && variant?.id) input.value = variant.id;

    if (!button) return;
    const unavailable = !variant || !variant.available;
    button.disabled = unavailable;
    button.textContent = unavailable ? strings.unavailable : strings.addToCart;
  };

  const updateVariantImage = (form, event) => {
    const mainImage = qs('#MainProductImage');
    if (!mainImage) return;

    const selectedVariant = getSelectedVariant(form);
    let image = '';
    let mediaId = '';

    if (event?.target?.matches?.('input[name^="options["]')) {
      const label = document.querySelector(`label[for="${event.target.id}"]`);
      image = label?.dataset.optionImage || '';
      mediaId = label?.dataset.mediaId || '';
    }

    if (!image) {
      image = getVariantImage(selectedVariant);
      mediaId = getVariantMediaId(selectedVariant);
    }

    if (!image) return;
    mainImage.src = image;
    mainImage.dataset.zoomSrc = image;
    qsa('[data-product-media]').forEach((button) => {
      const active = mediaId ? String(button.dataset.mediaId) === String(mediaId) : button.dataset.src === image;
      button.classList.toggle('is-active', active);
    });
  };

  qsa('[data-open-cart]').forEach((button) => {
    button.addEventListener('click', openCart);
  });

  qsa('[data-close-cart]').forEach((button) => {
    button.addEventListener('click', closeCart);
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      closeCart();
      qsa('.modal.is-open').forEach(closeModal);
    }
  });

  qsa('[data-product-form]').forEach((form) => {
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const button = qs('button[type="submit"]', form);
      const status = qs('[data-product-status]', form);
      const originalText = button?.textContent;
      const selectedVariant = getSelectedVariant(form);
      const hiddenInput = form.querySelector('input[name="id"]');
      const variantId = selectedVariant?.id || Number(hiddenInput?.value);

      if (!variantId) {
        if (status) status.textContent = strings.selectVariant;
        return;
      }

      if (selectedVariant && !selectedVariant.available) {
        if (status) status.textContent = strings.unavailable;
        return;
      }

      if (button) {
        button.disabled = true;
        button.textContent = strings.adding;
      }

      try {
        await cartRequest('/cart/add.js', { id: Number(variantId), quantity: 1 });
        await fetchCart();
        openCart();
        if (status) status.textContent = strings.added;
        showNotification(`${button?.dataset.productTitle || strings.product} ${strings.addedToCart}`);
      } catch (error) {
        if (status) status.textContent = error.message;
        showNotification(strings.addError);
      } finally {
        if (button) {
          button.disabled = false;
          button.textContent = originalText || strings.adding;
        }
      }
    });

    form.addEventListener('change', (event) => {
      updateVariantId(form);
      updateVariantImage(form, event);
      updateButtonState(form);
    });

    updateButtonState(form);
  });

  qsa('[data-quick-add]').forEach((button) => {
    button.addEventListener('click', async () => {
      const variantId = button.dataset.variantId;
      if (!variantId || button.disabled) return;
      button.disabled = true;
      button.textContent = strings.adding;
      try {
        await cartRequest('/cart/add.js', { id: Number(variantId), quantity: 1 });
        await fetchCart();
        openCart();
        showNotification(`${button.dataset.productTitle || strings.product} ${strings.addedToCart}`);
      } catch (error) {
        showNotification(error.message || strings.addError);
      } finally {
        button.disabled = false;
        button.textContent = strings.quickAdd;
      }
    });
  });

  const changeCartQuantity = async (line, quantity) => {
    if (state.cartBusy) return;
    if (quantity < 0) quantity = 0;
    state.cartBusy = true;
    try {
      const id = /^\d+$/.test(String(line)) ? Number(line) : line;
      await cartRequest('/cart/change.js', { id, quantity });
      await fetchCart();
    } finally {
      state.cartBusy = false;
    }
  };

  document.addEventListener('click', async (event) => {
    const cartButton = event.target.closest('[data-cart-qty]');
    if (cartButton) {
      const line = cartButton.dataset.line;
      const input = qs(`[data-cart-line="${line}"]`);
      const delta = Number(cartButton.dataset.qty);
      if (!input) return;
      const next = Math.max(Number(input.value || 0) + delta, 0);
      input.value = next;
      await changeCartQuantity(line, next);
      return;
    }

    const removeLink = event.target.closest('[data-remove-line]');
    if (removeLink) {
      event.preventDefault();
      await changeCartQuantity(removeLink.dataset.line, 0);
      return;
    }

    const drawerButton = event.target.closest('[data-drawer-qty]');
    if (drawerButton) {
      const key = drawerButton.dataset.drawerQty;
      const item = state.cart?.items?.find((cartItem) => String(cartItem.key) === String(key));
      if (!item) return;
      await changeCartQuantity(item.key, item.quantity + Number(drawerButton.dataset.qty));
    }
  });

  const mainImage = qs('#MainProductImage');
  const gallery = qs('[data-gallery]');
  if (mainImage && gallery) {
    const zoom = (event) => {
      const rect = mainImage.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width) * 100;
      const y = ((event.clientY - rect.top) / rect.height) * 100;
      mainImage.style.transformOrigin = `${x}% ${y}%`;
      mainImage.style.transform = 'scale(1.08)';
    };
    const reset = () => {
      mainImage.style.transformOrigin = 'center';
      mainImage.style.transform = '';
    };
    gallery.addEventListener('pointermove', zoom);
    gallery.addEventListener('pointerleave', reset);
  }

  qsa('[data-product-media]').forEach((button) => {
    button.addEventListener('click', () => {
      const src = button.dataset.src;
      const zoomSrc = button.dataset.zoomSrc;
      if (!src || !mainImage) return;
      mainImage.src = src;
      if (zoomSrc) mainImage.dataset.zoomSrc = zoomSrc;
      qsa('[data-product-media]').forEach((item) => item.classList.remove('is-active'));
      button.classList.add('is-active');
    });
  });

  const openModal = (modal) => {
    if (!modal) return;
    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  };

  function closeModal(modal) {
    if (!modal) return;
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
    updateBodyScroll();
  }

  qsa('[data-open-size-guide]').forEach((button) => {
    button.addEventListener('click', () => openModal(qs('#SizeGuideModal')));
  });

  qsa('[data-close-modal]').forEach((button) => {
    button.addEventListener('click', () => closeModal(button.closest('.modal')));
  });

  qsa('.accordion__trigger').forEach((trigger) => {
    trigger.addEventListener('click', () => {
      const expanded = trigger.getAttribute('aria-expanded') === 'true';
      trigger.setAttribute('aria-expanded', String(!expanded));
      const icon = trigger.querySelector('[aria-hidden="true"]');
      if (icon) icon.textContent = expanded ? '+' : '−';
    });
  });

  const renderRecommendations = (container, products) => {
    if (!products.length) {
      container.innerHTML = `<div class="empty-state product-catalog__empty"><h2>No related products yet</h2><p>Add more products and Shopify will suggest related items here.</p></div>`;
      return;
    }

    container.innerHTML = products.map((product) => {
      const image = product.featured_image?.src || product.featured_media?.preview_image?.url || '';
      return `
        <article class="product-card" data-product-card>
          <div class="product-card__media">
            <a href="${escapeHtml(product.url || `/products/${product.handle}`)}">
              ${image ? `<img src="${escapeHtml(image)}" alt="${escapeHtml(product.title)}" width="520" height="620" loading="lazy">` : `<div class="product-placeholder">W8ST</div>`}
            </a>
          </div>
          <div class="product-card__info">
            <h3><a href="${escapeHtml(product.url || `/products/${product.handle}`)}">${escapeHtml(product.title)}</a></h3>
            <div class="product-card__prices">
              ${product.compare_at_price ? `<span class="price price--compare">${formatMoney(product.compare_at_price)}</span>` : ''}
              <span class="price">${formatMoney(product.price)}</span>
            </div>
          </div>
        </article>
      `;
    }).join('');
  };

  qsa('[data-product-recommendations]').forEach((container) => {
    const productId = container.dataset.productId;
    if (!productId) return;
    fetch(`/recommendations/products.json?product_id=${productId}&limit=4`, { headers: { 'Accept': 'application/json' } })
      .then((response) => response.ok ? response.json() : [])
      .then((data) => renderRecommendations(container, data.products || []))
      .catch(() => {
        container.innerHTML = `<div class="empty-state product-catalog__empty"><h2>No related products yet</h2><p>More products will appear here when Shopify can recommend them.</p></div>`;
      });
  });

  fetchCart().catch(() => {
    qsa('[data-cart-count]').forEach((node) => {
      node.textContent = '0';
    });
  });
})();
