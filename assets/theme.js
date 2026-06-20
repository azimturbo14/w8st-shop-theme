(() => {
  const moneyFormatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0
  });

  const formatMoney = (cents) => {
    if (typeof Shopify !== 'undefined' && typeof Shopify.formatMoney === 'function') {
      return Shopify.formatMoney(cents, window.shopMoneyFormat || '{{ money }}');
    }
    return moneyFormatter.format(cents / 100);
  };

  const state = {
    cart: null,
    freeShippingThreshold: Number('{{ settings.free_shipping_threshold }}') || 500000
  };

  const qs = (selector, scope = document) => scope.querySelector(selector);
  const qsa = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));

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
    if (!qs('.modal.is-open')) document.body.style.overflow = '';
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

    const subtotalNodes = qsa('[data-cart-subtotal]');
    subtotalNodes.forEach((node) => {
      node.textContent = formatMoney(cart.total_price);
    });

    const drawerItems = qs('[data-cart-items]');
    if (drawerItems) {
      if (cart.item_count === 0) {
        drawerItems.innerHTML = `<p class="empty-cart-note">${'{{ 'cart.drawer.empty' | t }}'}</p>`;
      } else {
        drawerItems.innerHTML = cart.items.map((item) => `
          <article class="cart-drawer__item" data-drawer-line="${item.key}">
            ${item.image ? `<img src="${item.image}" width="76" height="92" alt="${item.title}">` : `<span>W8ST</span>`}
            <div>
              <h3>${item.product_title}</h3>
              <p>${item.variant_title || ''} · ${formatMoney(item.final_line_price)}</p>
              <div class="cart-drawer__item__controls">
                <button type="button" data-drawer-qty="${item.key}" data-qty="-1" aria-label="Decrease quantity">−</button>
                <span>${item.quantity}</span>
                <button type="button" data-drawer-qty="${item.key}" data-qty="1" aria-label="Increase quantity">+</button>
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
    if (!response.ok) throw new Error(await response.text());
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

  const getSelectedVariant = (form) => {
    const variantJson = form.dataset.variantJson ? JSON.parse(form.dataset.variantJson) : [];
    if (!variantJson.length) return form.querySelector('input[name="id"]')?.value;

    const selected = {};
    qsa('input[name^="options["]:checked, select[name^="options["]', form).forEach((input) => {
      selected[input.name.replace('options[', '').replace(']', '')] = input.value;
    });

    const selectedOptions = Object.values(selected);
    const variant = variantJson.find((item) => {
      if (!item.available) return false;
      return item.options && item.options.every((option, index) => option === selectedOptions[index]);
    });

    return variant ? variant.id : form.querySelector('input[name="id"]')?.value;
  };

  const updateVariantId = (form) => {
    const variantId = getSelectedVariant(form);
    const input = form.querySelector('input[name="id"]');
    if (input && variantId) input.value = variantId;
    return variantId;
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
      const variantId = updateVariantId(form);

      if (!variantId) {
        if (status) status.textContent = '{{ 'sections.product.select_variant' | t }}';
        return;
      }

      if (button) {
        button.disabled = true;
        button.textContent = '{{ 'sections.product.adding' | t }}';
      }

      try {
        await cartRequest('/cart/add.js', { id: Number(variantId), quantity: 1 });
        await fetchCart();
        openCart();
        if (status) status.textContent = '{{ 'sections.product.added' | t }}';
        showNotification('{{ 'sections.product.added_to_cart' | t }}');
      } catch (error) {
        if (status) status.textContent = error.message;
        showNotification('{{ 'sections.product.add_error' | t }}');
      } finally {
        if (button) {
          button.disabled = false;
          button.textContent = originalText;
        }
      }
    });

    form.addEventListener('change', () => updateVariantId(form));
  });

  qsa('[data-quick-add]').forEach((button) => {
    button.addEventListener('click', async () => {
      const variantId = button.dataset.variantId;
      if (!variantId) return;
      button.disabled = true;
      button.textContent = '{{ 'sections.product.adding' | t }}';
      try {
        await cartRequest('/cart/add.js', { id: Number(variantId), quantity: 1 });
        await fetchCart();
        openCart();
        showNotification(`${button.dataset.productTitle || '{{ 'sections.product.product' | t }}'} {{ 'sections.product.added_to_cart' | t }}`);
      } catch (error) {
        showNotification('{{ 'sections.product.add_error' | t }}');
      } finally {
        button.disabled = false;
        button.textContent = '{{ 'sections.product.quick_add' | t }}';
      }
    });
  });

  const changeCartQuantity = async (line, quantity) => {
    if (quantity < 0) quantity = 0;
    await cartRequest('/cart/change.js', { id: line, quantity });
    await fetchCart();
  };

  qsa('[data-cart-qty]').forEach((button) => {
    button.addEventListener('click', async () => {
      const line = button.dataset.line;
      const input = qs(`[data-cart-line="${line}"]`);
      const delta = Number(button.dataset.qty);
      if (!input) return;
      const next = Math.max(Number(input.value || 0) + delta, 0);
      input.value = next;
      await changeCartQuantity(line, next);
    });
  });

  qsa('[data-remove-line]').forEach((link) => {
    link.addEventListener('click', async (event) => {
      event.preventDefault();
      await changeCartQuantity(link.dataset.line, 0);
    });
  });

  qsa('[data-drawer-qty]').forEach((button) => {
    button.addEventListener('click', async () => {
      const key = button.dataset.drawerQty;
      const item = state.cart?.items?.find((cartItem) => String(cartItem.key) === String(key));
      if (!item) return;
      await changeCartQuantity(item.key, item.quantity + Number(button.dataset.qty));
    });
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
    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  };

  function closeModal(modal) {
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
    if (!qs('.cart-drawer.is-open')) document.body.style.overflow = '';
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
    });
  });

  fetchCart().catch(() => {
    qsa('[data-cart-count]').forEach((node) => {
      node.textContent = '0';
    });
  });
})();
