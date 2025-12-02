    // 显示购物车通知弹窗
    function showCartNotification() {
      const overlay = document.getElementById('overlay');
      const notification = document.getElementById('cartNotification');

      overlay.classList.add('show');
      notification.classList.add('show');

      // 3秒后自动关闭
      setTimeout(() => {
        closeNotification();
      }, 3000);
    }

    // 关闭通知弹窗
    function closeNotification() {
      const overlay = document.getElementById('overlay');
      const notification = document.getElementById('cartNotification');

      overlay.classList.remove('show');
      notification.classList.remove('show');
    }

    // 显示错误通知
    function showErrorNotification(message) {
      const notification = document.getElementById('cartNotification');
      const icon = notification.querySelector('.icon');
      const title = notification.querySelector('h3');
      const text = notification.querySelector('p');

      // 修改为错误样式
      icon.innerHTML = '✕';
      icon.style.background = 'linear-gradient(135deg, #f44336, #d32f2f)';
      title.textContent = 'Add Failed';
      text.textContent = message;

      showCartNotification();

      // 恢复原样式
      setTimeout(() => {
        icon.innerHTML = '✓';
        icon.style.background = 'linear-gradient(135deg, #4CAF50, #45a049)';
        title.textContent = 'Added Successfully!';
        text.textContent = 'Item added to cart successfully';
      }, 3000);
    }

    // 添加商品到购物车的函数
    async function addToCart(productId, quantity = 1) {
      const button = document.querySelector('.add-to-cart-btn');
      const spinner = document.querySelector('.loading-spinner');

      try {
        // 添加点击动画效果
        button.classList.add('clicked');
        button.classList.add('loading');

        // 移除点击动画
        setTimeout(() => {
          button.classList.remove('clicked');
        }, 600);

        const response = await fetch('/cart/add', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            productId: productId,
            quantity: quantity
          })
        });

        button.classList.remove('loading');

        if (response.ok) {
          showCartNotification();
        } else if (response.status === 401) {
          showErrorNotification('Please log in before adding items to cart');
          setTimeout(() => {
            window.location.href = '/login.html';
          }, 2000);
        } else {
          const error = await response.text();
          showErrorNotification('Failed to add to cart: ' + error);
        }
      } catch (error) {
        button.classList.remove('loading');
        console.error('添加到购物车时发生错误:', error);
        showErrorNotification('Network error. Please try again later');
      }
    }

    // 页面加载完成后添加事件监听器
    document.addEventListener('DOMContentLoaded', function () {
      const addToCartButton = document.querySelector('.add-to-cart-btn');
      const overlay = document.getElementById('overlay');

      if (addToCartButton) {
        addToCartButton.addEventListener('click', function () {
          const productId = this.getAttribute('data-product-id');
          const qtyInput = document.getElementById('buyQty');
          const qty = qtyInput ? Math.max(1, parseInt(qtyInput.value || '1', 10)) : 1;
          if (productId) {
            addToCart(productId, qty);
          }
        });
      }
      const buyNowButton = document.querySelector('.buy-btn');
      if (buyNowButton) {
        buyNowButton.addEventListener('click', async function () {
          const productId = this.getAttribute('data-product-id');
          const qtyInput = document.getElementById('buyQty');
          const qty = qtyInput ? Math.max(1, parseInt(qtyInput.value || '1', 10)) : 1;
          try {
            await addToCart(productId, qty);
            window.location.href = '/cart';
          } catch (e) {}
        });
      }
      const qtyInput = document.getElementById('buyQty');
      const minusBtn = document.querySelector('.qty-btn.minus');
      const plusBtn = document.querySelector('.qty-btn.plus');
      if (qtyInput && minusBtn && plusBtn) {
        minusBtn.addEventListener('click', function () {
          qtyInput.value = Math.max(1, parseInt(qtyInput.value || '1', 10) - 1);
        });
        plusBtn.addEventListener('click', function () {
          qtyInput.value = Math.max(1, parseInt(qtyInput.value || '1', 10) + 1);
        });
      }
      const thumb = document.querySelector('.gallery .thumbs img');
      const main = document.getElementById('mainImage');
      if (thumb && main) {
        thumb.addEventListener('click', function(){ main.src = this.src; });
      }

      // 点击遮罩层关闭弹窗
      if (overlay) {
        overlay.addEventListener('click', closeNotification);
      }

      // ESC键关闭弹窗
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') {
          closeNotification();
        }
      });

      const mainPic = document.querySelector('.gallery .main-pic');
      const mainImg = document.getElementById('mainImage');
      if (mainPic && mainImg) {
        const lens = document.createElement('div');
        lens.className = 'zoom-lens';
        mainPic.appendChild(lens);
        const overlay = document.createElement('div');
        overlay.id = 'zoomOverlay';
        overlay.className = 'zoom-overlay';
        document.body.appendChild(overlay);
        const zoom = 2.2;
        lens.style.left = '0px';
        lens.style.top = '0px';
        let picRect, imgRect, minX, minY, maxX, maxY, lensW, lensH, overlayW, overlayH;
        const placeOverlay = () => {
          const rect = mainPic.getBoundingClientRect();
          const margin = 20;
          let left = rect.right + margin;
          if (left + overlay.offsetWidth > window.innerWidth - 12) left = rect.left - overlay.offsetWidth - margin;
          let top = rect.top;
          if (top + overlay.offsetHeight > window.innerHeight - 12) top = Math.max(12, window.innerHeight - overlay.offsetHeight - 12);
          overlay.style.left = left + 'px';
          overlay.style.top = top + 'px';
        };
        const setBg = () => {
          if (!mainImg.src) return;
          imgRect = mainImg.getBoundingClientRect();
          overlay.style.backgroundImage = 'url(' + mainImg.src + ')';
          overlay.style.backgroundSize = (imgRect.width * zoom) + 'px ' + (imgRect.height * zoom) + 'px';
          picRect = mainPic.getBoundingClientRect();
          lensW = lens.offsetWidth; lensH = lens.offsetHeight; overlayW = overlay.clientWidth; overlayH = overlay.clientHeight;
          minX = imgRect.left - picRect.left;
          minY = imgRect.top - picRect.top;
          maxX = minX + imgRect.width - lensW;
          maxY = minY + imgRect.height - lensH;
        };
        setBg();
        placeOverlay();
        mainImg.addEventListener('load', () => { setBg(); placeOverlay(); });
        window.addEventListener('resize', () => { setBg(); placeOverlay(); });
        let targetX = minX || 0, targetY = minY || 0;
        let running = false;
        const render = () => {
          lens.style.transform = 'translate3d(' + targetX + 'px,' + targetY + 'px,0)';
          const cxRel = (targetX - minX) + lensW / 2;
          const cyRel = (targetY - minY) + lensH / 2;
          const bgX = cxRel * zoom - overlayW / 2;
          const bgY = cyRel * zoom - overlayH / 2;
          overlay.style.backgroundPosition = '-' + bgX + 'px -' + bgY + 'px';
        };
        const loop = () => { if (!running) return; render(); requestAnimationFrame(loop); };
        const move = (e) => {
          const clientX = e.touches ? e.touches[0].clientX : e.clientX;
          const clientY = e.touches ? e.touches[0].clientY : e.clientY;
          let x = clientX - picRect.left - lensW / 2;
          let y = clientY - picRect.top - lensH / 2;
          if (x < minX) x = minX;
          if (y < minY) y = minY;
          if (x > maxX) x = maxX;
          if (y > maxY) y = maxY;
          targetX = x; targetY = y;
        };
        const show = () => { lens.classList.add('show'); overlay.classList.add('show'); placeOverlay(); };
        const hide = () => { lens.classList.remove('show'); overlay.classList.remove('show'); running = false; };
        mainPic.addEventListener('mousemove', move, { passive: true });
        mainPic.addEventListener('mouseenter', show);
        mainPic.addEventListener('mouseleave', hide);
        mainPic.addEventListener('touchmove', move, { passive: true });
        mainPic.addEventListener('touchstart', show, { passive: true });
        mainPic.addEventListener('touchend', hide);
        mainPic.addEventListener('mouseenter', () => { running = true; requestAnimationFrame(loop); });
        mainPic.addEventListener('touchstart', () => { running = true; requestAnimationFrame(loop); }, { passive: true });
      }
      const tabs = document.querySelectorAll('.image-tabs .tabs-nav .tab');
      const panels = document.querySelectorAll('.image-tabs .tab-panel');
      if (tabs.length && panels.length) {
        tabs.forEach(function(tab, idx){
          tab.addEventListener('click', function(){
            tabs.forEach(function(t){ t.classList.remove('active'); });
            panels.forEach(function(p){ p.classList.remove('active'); });
            tab.classList.add('active');
            panels[idx].classList.add('active');
          });
        });
      }

      const specsPre = document.getElementById('product-specs-json');
      if (specsPre) {
        const text = (specsPre.textContent || '').trim();
        let json;
        try { json = JSON.parse(text || '{}'); } catch (e) { json = null; }
        if (json && (Array.isArray(json) ? json.length > 0 : Object.keys(json).length > 0)) {
          const entries = Array.isArray(json) ? json.map(function(it){ return { k: String(it.name || it.key || ''), v: String(it.value || it.val || '') }; }) : Object.keys(json).map(function(k){ return { k: String(k), v: String(json[k]) }; });
          const rowsTarget = entries.length % 2 === 0 ? entries.length : entries.length + 1;
          const table = document.createElement('div');
          table.className = 'spec-grid-table';
          const header = document.createElement('div');
          header.className = 'row';
          header.innerHTML = '<div class="cell title">参数名称</div><div class="cell">参数值</div>';
          table.appendChild(header);
          entries.forEach(function(item){
            const row = document.createElement('div');
            row.className = 'row';
            const name = document.createElement('div');
            name.className = 'cell title';
            const value = document.createElement('div');
            value.className = 'cell';
            const esc = function(s){ return String(s == null ? '' : s).replace(/[&<>"']/g,function(ch){return ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"})[ch] || ch;}); };
            name.innerHTML = esc(item.k);
            value.innerHTML = esc(item.v);
            row.appendChild(name);
            row.appendChild(value);
            table.appendChild(row);
          });
          while (table.querySelectorAll('.row').length - 1 < rowsTarget) {
            const row = document.createElement('div');
            row.className = 'row';
            row.innerHTML = '<div class="cell title">&nbsp;</div><div class="cell">&nbsp;</div>';
            table.appendChild(row);
          }
          specsPre.replaceWith(table);
          const count = table.querySelectorAll('.row').length - 1;
          if (count % 2 !== 0) {
            const row = document.createElement('div');
            row.className = 'row';
            row.innerHTML = '<div class="cell title">&nbsp;</div><div class="cell">&nbsp;</div>';
            table.appendChild(row);
          }
        } else {
          const empty = document.createElement('div');
          empty.className = 'spec-empty';
          empty.textContent = '暂无参数信息';
          specsPre.replaceWith(empty);
        }
      }
    });
