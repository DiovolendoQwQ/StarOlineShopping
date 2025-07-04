/**
 * 定时任务调度服务
 * 用于自动执行数据汇总、清理等定时任务
 */

const cron = require('node-cron');
const analyticsService = require('./analyticsService');
const AnalyticsSummary = require('../models/AnalyticsSummary');
const UserBehavior = require('../models/UserBehavior');
const UserPreference = require('../models/UserPreference');

class SchedulerService {
    constructor() {
        this.tasks = new Map();
        this.isInitialized = false;
    }

    /**
     * 初始化所有定时任务
     */
    init() {
        if (this.isInitialized) {
            console.log('定时任务已经初始化');
            return;
        }

        try {
            // 每日数据汇总任务 - 每天凌晨1点执行
            this.scheduleDailySummary();
            
            // 数据清理任务 - 每周日凌晨2点执行
            this.scheduleDataCleanup();
            
            // 偏好数据更新任务 - 每小时执行
            this.schedulePreferenceUpdate();
            
            // 实时数据刷新任务 - 每5分钟执行
            this.scheduleRealTimeUpdate();

            this.isInitialized = true;
            console.log('定时任务调度服务已启动');
        } catch (error) {
            console.error('初始化定时任务失败:', error);
        }
    }

    /**
     * 每日数据汇总任务
     */
    scheduleDailySummary() {
        const task = cron.schedule('0 1 * * *', async () => {
            console.log('开始执行每日数据汇总任务...');
            try {
                const yesterday = new Date();
                yesterday.setDate(yesterday.getDate() - 1);
                const dateStr = yesterday.toISOString().split('T')[0];
                
                // 检查是否已经生成过昨天的汇总
                const existingSummary = await AnalyticsSummary.getSummaryByDate(dateStr);
                if (existingSummary) {
                    console.log(`${dateStr} 的数据汇总已存在，跳过生成`);
                    return;
                }
                
                // 生成昨天的数据汇总
                const summary = await analyticsService.generateDailySummary(dateStr);
                console.log(`${dateStr} 每日数据汇总完成:`, {
                    total_users: summary.total_users,
                    active_users: summary.active_users,
                    total_actions: summary.total_actions
                });
            } catch (error) {
                console.error('每日数据汇总任务执行失败:', error);
            }
        }, {
            scheduled: false,
            timezone: 'Asia/Shanghai'
        });
        
        task.start();
        this.tasks.set('dailySummary', task);
        console.log('每日数据汇总任务已调度 (每天凌晨1点)');
    }

    /**
     * 数据清理任务
     */
    scheduleDataCleanup() {
        const task = cron.schedule('0 2 * * 0', async () => {
            console.log('开始执行数据清理任务...');
            try {
                const cleanupDate = new Date();
                cleanupDate.setDate(cleanupDate.getDate() - 90); // 清理90天前的数据
                const cleanupDateStr = cleanupDate.toISOString().split('T')[0];
                
                // 清理旧的用户行为数据
                const behaviorResult = await UserBehavior.cleanOldData(cleanupDateStr);
                console.log(`清理了 ${behaviorResult.deletedRows} 条旧的用户行为数据`);
                
                // 清理低分偏好数据
                const preferenceResult = await UserPreference.cleanLowScorePreferences(1.0);
                console.log(`清理了 ${preferenceResult.deletedRows} 条低分偏好数据`);
                
                // 清理旧的汇总数据（保留1年）
                const summaryCleanupDate = new Date();
                summaryCleanupDate.setDate(summaryCleanupDate.getDate() - 365);
                const summaryCleanupDateStr = summaryCleanupDate.toISOString().split('T')[0];
                const summaryResult = await AnalyticsSummary.cleanOldData(summaryCleanupDateStr);
                console.log(`清理了 ${summaryResult.deletedRows} 条旧的汇总数据`);
                
                console.log('数据清理任务完成');
            } catch (error) {
                console.error('数据清理任务执行失败:', error);
            }
        }, {
            scheduled: false,
            timezone: 'Asia/Shanghai'
        });
        
        task.start();
        this.tasks.set('dataCleanup', task);
        console.log('数据清理任务已调度 (每周日凌晨2点)');
    }

    /**
     * 偏好数据更新任务
     */
    schedulePreferenceUpdate() {
        const task = cron.schedule('0 * * * *', async () => {
            console.log('开始执行偏好数据更新任务...');
            try {
                // 这里可以添加基于最新行为数据更新偏好的逻辑
                // 例如：重新计算用户偏好分数、更新推荐算法等
                
                // 获取最近1小时的行为数据并更新偏好
                const oneHourAgo = new Date();
                oneHourAgo.setHours(oneHourAgo.getHours() - 1);
                
                // 这里可以实现更复杂的偏好更新逻辑
                console.log('偏好数据更新任务完成');
            } catch (error) {
                console.error('偏好数据更新任务执行失败:', error);
            }
        }, {
            scheduled: false,
            timezone: 'Asia/Shanghai'
        });
        
        task.start();
        this.tasks.set('preferenceUpdate', task);
        console.log('偏好数据更新任务已调度 (每小时执行)');
    }

    /**
     * 实时数据刷新任务
     */
    scheduleRealTimeUpdate() {
        const task = cron.schedule('*/5 * * * *', async () => {
            try {
                // 这里可以添加实时数据缓存更新逻辑
                // 例如：更新热门产品缓存、活跃用户统计等
                
                // 可以通过WebSocket推送实时数据更新
                // 这里暂时只记录日志
                // console.log('实时数据已刷新');
            } catch (error) {
                console.error('实时数据刷新任务执行失败:', error);
            }
        }, {
            scheduled: false,
            timezone: 'Asia/Shanghai'
        });
        
        task.start();
        this.tasks.set('realTimeUpdate', task);
        console.log('实时数据刷新任务已调度 (每5分钟执行)');
    }

    /**
     * 手动执行每日汇总
     * @param {string} date - 日期 (YYYY-MM-DD)，可选
     */
    async runDailySummary(date) {
        try {
            const targetDate = date || new Date().toISOString().split('T')[0];
            console.log(`手动执行每日汇总任务: ${targetDate}`);
            
            const summary = await analyticsService.generateDailySummary(targetDate);
            console.log('手动每日汇总完成:', summary);
            return summary;
        } catch (error) {
            console.error('手动执行每日汇总失败:', error);
            throw error;
        }
    }

    /**
     * 手动执行数据清理
     */
    async runDataCleanup() {
        try {
            console.log('手动执行数据清理任务');
            
            const cleanupDate = new Date();
            cleanupDate.setDate(cleanupDate.getDate() - 90);
            const cleanupDateStr = cleanupDate.toISOString().split('T')[0];
            
            const behaviorResult = await UserBehavior.cleanOldData(cleanupDateStr);
            const preferenceResult = await UserPreference.cleanLowScorePreferences(1.0);
            
            console.log('手动数据清理完成:', {
                behaviorDeleted: behaviorResult.deletedRows,
                preferenceDeleted: preferenceResult.deletedRows
            });
            
            return {
                behaviorDeleted: behaviorResult.deletedRows,
                preferenceDeleted: preferenceResult.deletedRows
            };
        } catch (error) {
            console.error('手动执行数据清理失败:', error);
            throw error;
        }
    }

    /**
     * 停止指定任务
     * @param {string} taskName - 任务名称
     */
    stopTask(taskName) {
        const task = this.tasks.get(taskName);
        if (task) {
            task.stop();
            console.log(`任务 ${taskName} 已停止`);
        } else {
            console.log(`任务 ${taskName} 不存在`);
        }
    }

    /**
     * 启动指定任务
     * @param {string} taskName - 任务名称
     */
    startTask(taskName) {
        const task = this.tasks.get(taskName);
        if (task) {
            task.start();
            console.log(`任务 ${taskName} 已启动`);
        } else {
            console.log(`任务 ${taskName} 不存在`);
        }
    }

    /**
     * 停止所有任务
     */
    stopAll() {
        this.tasks.forEach((task, name) => {
            task.stop();
            console.log(`任务 ${name} 已停止`);
        });
        console.log('所有定时任务已停止');
    }

    /**
     * 获取任务状态
     */
    getTaskStatus() {
        const status = {};
        this.tasks.forEach((task, name) => {
            status[name] = {
                running: task.running || false,
                scheduled: true
            };
        });
        return status;
    }
}

// 创建单例实例
const schedulerService = new SchedulerService();

module.exports = schedulerService;