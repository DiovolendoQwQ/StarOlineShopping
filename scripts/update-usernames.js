const db = require('../config/database');

(async () => {
  const batchSize = 1000;
  let offset = 0;
  try {
    await db.runAsync('BEGIN TRANSACTION');
    await db.runAsync('COMMIT');
  } catch (e) {}

  while (true) {
    const rows = await db.allAsync(
      `SELECT id, username FROM users 
       WHERE username IS NULL OR username != ('star' || id) 
       ORDER BY CAST(id AS INTEGER) ASC 
       LIMIT ? OFFSET ?`, [batchSize, offset]
    );
    if (!rows || rows.length === 0) break;

    try {
      await db.runAsync('BEGIN TRANSACTION');
      for (const r of rows) {
        const expected = 'star' + String(r.id);
        await db.runAsync('UPDATE users SET username = ? WHERE id = ?', [expected, String(r.id)]);
      }
      await db.runAsync('COMMIT');
      offset += batchSize;
      console.log(`✅ 已更新 ${rows.length} 条，当前偏移 ${offset}`);
    } catch (e) {
      await db.runAsync('ROLLBACK');
      console.error('❌ 批量更新失败:', e.message);
      break;
    }
  }

  // 索引确保
  try {
    await db.runAsync('CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)');
  } catch (e) {}

  console.log('✅ 昵称批量更新完成');
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });