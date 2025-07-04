/**
 * 数据分析汇总模型
 * 用于管理analytics_summary表的数据操作
 */

const db = require('../config/database');

class AnalyticsSummary {
    /**
     * 保存每日汇总数据
     * @param {Object} summaryData - 汇总数据对象
     * @returns {Promise<Object>} 保存结果
     */
    static async saveDailySummary(summaryData) {
        const {
            date,
            total_users,
            active_users,
            total_actions,
            unique_products_viewed,
            conversion_rate,
            top_products,
            user_segments,
            revenue_data,
            additional_metrics
        } = summaryData;

        const sql = `
            INSERT OR REPLACE INTO analytics_summary (
                date, total_users, active_users, total_actions,
                unique_products_viewed, conversion_rate, top_products,
                user_segments, revenue_data, additional_metrics
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        try {
            const result = await new Promise((resolve, reject) => {
                db.run(sql, [
                    date,
                    total_users,
                    active_users,
                    total_actions,
                    unique_products_viewed,
                    conversion_rate,
                    JSON.stringify(top_products || []),
                    JSON.stringify(user_segments || {}),
                    JSON.stringify(revenue_data || {}),
                    JSON.stringify(additional_metrics || {})
                ], function(err) {
                    if (err) {
                        reject(err);
                    } else {
                        resolve({
                            success: true,
                            id: this.lastID,
                            changes: this.changes
                        });
                    }
                });
            });

            return result;
        } catch (error) {
            console.error('保存每日汇总数据失败:', error);
            throw error;
        }
    }

    /**
     * 获取指定日期范围的汇总数据
     * @param {string} startDate - 开始日期 (YYYY-MM-DD)
     * @param {string} endDate - 结束日期 (YYYY-MM-DD)
     * @returns {Promise<Array>} 汇总数据列表
     */
    static async getSummaryByDateRange(startDate, endDate) {
        const sql = `
            SELECT * FROM analytics_summary
            WHERE date BETWEEN ? AND ?
            ORDER BY date DESC
        `;

        try {
            const rows = await new Promise((resolve, reject) => {
                db.all(sql, [startDate, endDate], (err, rows) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(rows);
                    }
                });
            });

            // 解析JSON字段
            return rows.map(row => ({
                ...row,
                top_products: this.parseJSON(row.top_products),
                user_segments: this.parseJSON(row.user_segments),
                revenue_data: this.parseJSON(row.revenue_data),
                additional_metrics: this.parseJSON(row.additional_metrics)
            }));
        } catch (error) {
            console.error('获取汇总数据失败:', error);
            throw error;
        }
    }

    /**
     * 获取最新的汇总数据
     * @param {number} limit - 限制返回数量，默认30天
     * @returns {Promise<Array>} 最新汇总数据
     */
    static async getLatestSummary(limit = 30) {
        const sql = `
            SELECT * FROM analytics_summary
            ORDER BY date DESC
            LIMIT ?
        `;

        try {
            const rows = await new Promise((resolve, reject) => {
                db.all(sql, [limit], (err, rows) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(rows);
                    }
                });
            });

            return rows.map(row => ({
                ...row,
                top_products: this.parseJSON(row.top_products),
                user_segments: this.parseJSON(row.user_segments),
                revenue_data: this.parseJSON(row.revenue_data),
                additional_metrics: this.parseJSON(row.additional_metrics)
            }));
        } catch (error) {
            console.error('获取最新汇总数据失败:', error);
            throw error;
        }
    }

    /**
     * 获取指定日期的汇总数据
     * @param {string} date - 日期 (YYYY-MM-DD)
     * @returns {Promise<Object|null>} 汇总数据或null
     */
    static async getSummaryByDate(date) {
        const sql = `
            SELECT * FROM analytics_summary
            WHERE date = ?
        `;

        try {
            const row = await new Promise((resolve, reject) => {
                db.get(sql, [date], (err, row) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(row);
                    }
                });
            });

            if (!row) return null;

            return {
                ...row,
                top_products: this.parseJSON(row.top_products),
                user_segments: this.parseJSON(row.user_segments),
                revenue_data: this.parseJSON(row.revenue_data),
                additional_metrics: this.parseJSON(row.additional_metrics)
            };
        } catch (error) {
            console.error('获取指定日期汇总数据失败:', error);
            throw error;
        }
    }

    /**
     * 删除指定日期之前的旧数据
     * @param {string} beforeDate - 删除此日期之前的数据
     * @returns {Promise<Object>} 删除结果
     */
    static async cleanOldData(beforeDate) {
        const sql = `
            DELETE FROM analytics_summary
            WHERE date < ?
        `;

        try {
            const result = await new Promise((resolve, reject) => {
                db.run(sql, [beforeDate], function(err) {
                    if (err) {
                        reject(err);
                    } else {
                        resolve({
                            success: true,
                            deletedRows: this.changes
                        });
                    }
                });
            });

            return result;
        } catch (error) {
            console.error('清理旧数据失败:', error);
            throw error;
        }
    }

    /**
     * 获取趋势数据
     * @param {number} days - 天数
     * @param {string} metric - 指标名称
     * @returns {Promise<Array>} 趋势数据
     */
    static async getTrendData(days = 30, metric = 'active_users') {
        const sql = `
            SELECT date, ${metric} as value
            FROM analytics_summary
            WHERE date >= date('now', '-${days} days')
            ORDER BY date ASC
        `;

        try {
            const rows = await new Promise((resolve, reject) => {
                db.all(sql, [], (err, rows) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(rows);
                    }
                });
            });

            return rows;
        } catch (error) {
            console.error('获取趋势数据失败:', error);
            throw error;
        }
    }

    /**
     * 获取汇总统计
     * @param {number} days - 天数
     * @returns {Promise<Object>} 汇总统计
     */
    static async getSummaryStats(days = 30) {
        const sql = `
            SELECT 
                AVG(active_users) as avg_active_users,
                MAX(active_users) as max_active_users,
                MIN(active_users) as min_active_users,
                AVG(conversion_rate) as avg_conversion_rate,
                MAX(conversion_rate) as max_conversion_rate,
                MIN(conversion_rate) as min_conversion_rate,
                SUM(total_actions) as total_actions_sum,
                COUNT(*) as total_days
            FROM analytics_summary
            WHERE date >= date('now', '-${days} days')
        `;

        try {
            const row = await new Promise((resolve, reject) => {
                db.get(sql, [], (err, row) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(row);
                    }
                });
            });

            return row || {};
        } catch (error) {
            console.error('获取汇总统计失败:', error);
            throw error;
        }
    }

    /**
     * 安全解析JSON字符串
     * @param {string} jsonString - JSON字符串
     * @returns {Object|Array|null} 解析结果
     */
    static parseJSON(jsonString) {
        if (!jsonString) return null;
        try {
            return JSON.parse(jsonString);
        } catch (error) {
            console.warn('JSON解析失败:', jsonString);
            return null;
        }
    }

    /**
     * 检查今天是否已有汇总数据
     * @returns {Promise<boolean>} 是否存在今日数据
     */
    static async hasTodaySummary() {
        const today = new Date().toISOString().split('T')[0];
        const summary = await this.getSummaryByDate(today);
        return !!summary;
    }
}

module.exports = AnalyticsSummary;