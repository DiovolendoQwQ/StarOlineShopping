async function addToCartRequest(productId, quantity) {
  try {
    var resp = await fetch('/cart/add', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId: productId, quantity: quantity || 1 })
    });
    if (resp.redirected && resp.url.includes('/login')) {
      if (window.showErrorNotification) window.showErrorNotification('请先登录后再添加商品到购物车');
      window.location.href = '/login.html';
      return;
    }
    if (resp.ok || resp.redirected) {
      if (window.showCartNotification) window.showCartNotification();
      return;
    }
    if (resp.status === 401) {
      if (window.showErrorNotification) window.showErrorNotification('请先登录后再添加商品到购物车');
      window.location.href = '/login.html';
      return;
    }
    var text = await resp.text();
    if (window.showErrorNotification) window.showErrorNotification('添加到购物车失败：' + text);
  } catch (e) {
    if (window.showErrorNotification) window.showErrorNotification('网络错误，请稍后重试');
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
