async function addToCartRequest(productId, quantity) {
  try {
    var resp = await fetch('/cart/add', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId: productId, quantity: quantity || 1 })
    });
    if (resp.redirected && resp.url.includes('/login')) {
      if (window.showErrorNotification) window.showErrorNotification('Please log in before adding items to cart');
      window.location.href = '/login.html';
      return;
    }
    if (resp.ok || resp.redirected) {
      if (window.showCartNotification) window.showCartNotification();
      return;
    }
    if (resp.status === 401) {
      if (window.showErrorNotification) window.showErrorNotification('Please log in before adding items to cart');
      window.location.href = '/login.html';
      return;
    }
    var text = await resp.text();
    if (window.showErrorNotification) window.showErrorNotification('Failed to add to cart: ' + text);
  } catch (e) {
    if (window.showErrorNotification) window.showErrorNotification('Network error. Please try again later');
  }
}

document.addEventListener('DOMContentLoaded', function () {
  document.body.addEventListener('click', function (e) {
    var target = e.target.closest('.add-to-cart');
    if (!target) return;
    var productId = target.getAttribute('data-product-id');
    if (!productId) return;
    if (target.tagName === 'A') {
      var href = target.getAttribute('href') || '';
      if (href.startsWith('/product/')) return;
    }
    e.preventDefault();
    addToCartRequest(productId, 1);
  });
});

window.HomeCart = { addToCartRequest };
