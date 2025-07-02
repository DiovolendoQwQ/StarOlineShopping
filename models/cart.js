const knex = require('knex')(require('../config/database'));

// 更新购物车总价的辅助函数
const updateCartTotal = async (cartId) => {
  const totalPrice = await knex('cart_items')
    .join('products', 'cart_items.product_id', 'products.id')
    .where('cart_items.cart_id', cartId)
    .sum(knex.raw('cart_items.quantity * products.price as total'))
    .first();

  await knex('carts').where('id', cartId).update({ total_price: totalPrice.total || 0 });
};

// 购物车模型
const Cart = {
  // 创建表结构
  createTables: async () => {
    await knex.schema.createTableIfNotExists('carts', (table) => {
      table.increments('id').primary(); // 主键
      table.integer('user_id').notNullable(); // 用户 ID
      table.decimal('total_price', 10, 2).defaultTo(0); // 总价
    });

    await knex.schema.createTableIfNotExists('cart_items', (table) => {
      table.increments('id').primary(); // 主键
      table.integer('cart_id').references('id').inTable('carts').onDelete('CASCADE'); // 关联购物车
      table.integer('product_id').notNullable(); // 商品 ID
      table.integer('quantity').defaultTo(1); // 商品数量
    });
  },

  // 添加商品到购物车
  addToCart: async (userId, productId, quantity = 1) => {
    const productExists = await knex('products').where('id', productId).first();
    if (!productExists) {
      throw new Error('商品不存在');
    }

    let cart = await knex('carts').where('user_id', userId).first();
    if (!cart) {
      const [cartId] = await knex('carts').insert({ user_id: userId, total_price: 0 });
      cart = { id: cartId, total_price: 0 };
    }

    const item = await knex('cart_items')
      .where({ cart_id: cart.id, product_id: productId })
      .first();

    if (item) {
      await knex('cart_items')
        .where({ cart_id: cart.id, product_id: productId })
        .update({ quantity: item.quantity + quantity });
    } else {
      await knex('cart_items').insert({ cart_id: cart.id, product_id: productId, quantity });
    }

    // 更新总价
    await updateCartTotal(cart.id);
  },

  // 获取购物车商品
  getCart: async (userId) => {
    const cart = await knex('carts').where('user_id', userId).first();
    if (!cart) return null;

    const items = await knex('cart_items')
      .join('products', 'cart_items.product_id', 'products.id')
      .where('cart_items.cart_id', cart.id)
      .select('cart_items.*', 'products.name', 'products.price', 'products.image');

    return { items, totalPrice: cart.total_price };
  },

  // 删除购物车商品
  removeFromCart: async (userId, productId) => {
    const cart = await knex('carts').where('user_id', userId).first();
    if (!cart) return;

    await knex('cart_items')
      .where({ cart_id: cart.id, product_id: productId })
      .del();

    // 更新总价
    await updateCartTotal(cart.id);
  },
};

module.exports = Cart;
