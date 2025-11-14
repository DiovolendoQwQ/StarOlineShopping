document.addEventListener('DOMContentLoaded', async () => {
  try {
    const response = await fetch('/product/api/all');
    const products = await response.json();

    const productContainer = document.querySelector('.product-list');
    if (productContainer) {
      products.forEach(product => {
        const productElement = document.createElement('div');
        productElement.classList.add('product-item');
        productElement.innerHTML = `
          <img src="${product.image}" alt="${product.name}">
          <h3>${product.name}</h3>
          <p>价格: ¥${product.price}</p>
          <div class="product-buttons">
            <button class="buy-now-btn" data-product-id="${product.id}">立即购买</button>
            <button class="add-to-cart-btn" data-product-id="${product.id}">加入购物车</button>
          </div>
        `;
        productContainer.appendChild(productElement);
      });
      
      // 为新创建的按钮添加事件监听器
  addButtonEventListeners();
  }
  } catch (err) {
  console.error("无法获取商品数据:", err);
  }
  });

// 添加按钮事件监听器的函数
function addButtonEventListeners() {
  // 为所有"立即购买"按钮添加事件
  const buyButtons = document.querySelectorAll('.buy-now-btn');
  buyButtons.forEach(button => {
    button.addEventListener('click', function() {
      const productId = this.getAttribute('data-product-id');
      if (productId) {
        buyNow(productId);
      }
    });
  });

  // 为所有"加入购物车"按钮添加事件
  const addToCartButtons = document.querySelectorAll('.add-to-cart-btn');
  addToCartButtons.forEach(button => {
    button.addEventListener('click', function() {
      const productId = this.getAttribute('data-product-id');
      if (productId) {
        addToCart(productId, 1);
      }
    });
  });
}

// 添加商品到购物车的函数
async function addToCart(productId, quantity = 1) {
  try {
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

    if (response.ok) {
      alert('商品已成功添加到购物车！');
    } else if (response.status === 401) {
      alert('请先登录后再添加商品到购物车');
      window.location.href = '/login.html';
    } else {
      const error = await response.text();
      alert('添加到购物车失败：' + error);
    }
  } catch (error) {
    console.error('添加到购物车时发生错误:', error);
  alert('网络错误，请稍后重试');
  }
}

// 立即购买功能
function buyNow(productId) {
  // 跳转到商品详情页
  window.location.href = `/product/${productId}`;
}

function generateOrderId() {
  const prefix = 'ORD-';
  const randomNumber = Math.floor(Math.random() * 1000000000);
  return prefix + randomNumber;
}

async function getProductDetails(orderId) {
  try {
    const response = await fetch(`/product/${orderId}`);
    if (!response.ok) {
      throw new Error('商品未找到');
    }
    const product = await response.json();
    const nameEl = document.getElementById('product-name');
    const priceEl = document.getElementById('price');
    if (nameEl) nameEl.innerText = product.name;
    if (priceEl) priceEl.innerText = `¥${product.price}`;
  } catch (error) {
    const nameEl = document.getElementById('product-name');
    const priceEl = document.getElementById('price');
    if (nameEl) nameEl.innerText = '加载失败';
    if (priceEl) priceEl.innerText = '加载失败';
  }
}

window.ShopUtils = { generateOrderId, getProductDetails };
