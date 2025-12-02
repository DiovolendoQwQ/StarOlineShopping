// 购物车相关功能

// 添加商品到购物车
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
            const result = await response.json();
            alert('Item added to cart successfully!');
            // 可以在这里更新购物车图标的数量显示
            updateCartCount();
        } else if (response.status === 401) {
            alert('Please log in before adding items to cart');
            window.location.href = '/login.html';
        } else {
            const error = await response.text();
            alert('Failed to add to cart: ' + error);
        }
    } catch (error) {
        console.error('添加到购物车时发生错误:', error);
        alert('Network error. Please try again later');
    }
}

// 立即购买功能
function buyNow(productId) {
    // 先添加到购物车，然后跳转到购物车页面
    addToCart(productId, 1).then(() => {
        window.location.href = '/cart';
    });
}

// 更新购物车数量显示（可选功能）
async function updateCartCount() {
    try {
        const response = await fetch('/cart');
        if (response.ok) {
            // 这里可以解析购物车数据并更新显示
            // 暂时跳过，因为需要修改HTML结构
        }
    } catch (error) {
        console.error('更新购物车数量失败:', error);
    }
}

// 为页面上的按钮添加事件监听器
document.addEventListener('DOMContentLoaded', function() {
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
            const quantity = this.getAttribute('data-quantity') || 1;
            if (productId) {
                addToCart(productId, parseInt(quantity));
            }
        });
    });

    // 为商品详情页的按钮添加事件（如果存在）
    const detailBuyButton = document.querySelector('input[value="立即选购"]');
    if (detailBuyButton) {
        detailBuyButton.addEventListener('click', function() {
            // 从页面获取商品ID，这里需要根据实际情况调整
            const productId = getProductIdFromPage();
            if (productId) {
                buyNow(productId);
            }
        });
    }

    const detailAddToCartButton = document.querySelector('input[value="加入购物车"]');
    if (detailAddToCartButton) {
        detailAddToCartButton.addEventListener('click', function() {
            const productId = getProductIdFromPage();
            if (productId) {
                addToCart(productId, 1);
            }
        });
    }
});

// 从页面获取商品ID的辅助函数
function getProductIdFromPage() {
    // 这里需要根据实际页面结构来获取商品ID
    // 可以从URL参数、隐藏字段或其他地方获取
    const urlParams = new URLSearchParams(window.location.search);
    const productId = urlParams.get('id');
    
    if (productId) {
        return productId;
    }
    
    // 如果URL中没有ID，可以尝试从其他地方获取
    // 例如从页面的data属性或隐藏字段
    const productElement = document.querySelector('[data-product-id]');
    if (productElement) {
        return productElement.getAttribute('data-product-id');
    }
    
    // 如果都没有找到，返回默认值或提示用户
    console.warn('无法获取商品ID');
    return null;
}

// 导出函数供其他脚本使用
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        addToCart,
        buyNow,
        updateCartCount
    };
}
