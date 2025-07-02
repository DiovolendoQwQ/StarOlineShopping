// 搜索功能实现
class SearchManager {
    constructor() {
        this.searchForm = null;
        this.searchInput = null;
        this.searchButton = null;
        this.resultsContainer = null;
        this.init();
    }

    init() {
        // 等待DOM加载完成
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setupSearch());
        } else {
            this.setupSearch();
        }
    }

    setupSearch() {
        // 获取搜索表单元素
        this.searchForm = document.querySelector('.search form');
        this.searchInput = document.querySelector('.search .shuru');
        this.searchButton = document.querySelector('.search .sousuo');
        
        if (!this.searchForm || !this.searchInput || !this.searchButton) {
            console.warn('搜索元素未找到');
            return;
        }

        // 创建搜索结果容器
        this.createResultsContainer();
        
        // 绑定事件
        this.bindEvents();
    }

    createResultsContainer() {
        // 创建搜索结果显示容器
        this.resultsContainer = document.createElement('div');
        this.resultsContainer.className = 'search-results';
        this.resultsContainer.style.cssText = `
            position: absolute;
            top: 100%;
            left: 0;
            right: 0;
            background: white;
            border: 1px solid #ddd;
            border-top: none;
            border-radius: 0 0 4px 4px;
            box-shadow: 0 4px 8px rgba(0,0,0,0.1);
            max-height: 400px;
            overflow-y: auto;
            z-index: 1000;
            display: none;
        `;
        
        // 将结果容器添加到搜索框的父容器
        const searchContainer = this.searchForm.parentElement;
        searchContainer.style.position = 'relative';
        searchContainer.appendChild(this.resultsContainer);
    }

    bindEvents() {
        // 阻止表单默认提交
        this.searchForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.performSearch();
        });

        // 输入时实时搜索（防抖）
        let searchTimeout;
        this.searchInput.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            const query = e.target.value.trim();
            
            if (query.length >= 2) {
                searchTimeout = setTimeout(() => {
                    this.performSearch(query);
                }, 300);
            } else {
                this.hideResults();
            }
        });

        // 点击搜索按钮
        this.searchButton.addEventListener('click', (e) => {
            e.preventDefault();
            this.performSearch();
        });

        // 点击外部隐藏结果
        document.addEventListener('click', (e) => {
            if (!this.searchForm.contains(e.target) && !this.resultsContainer.contains(e.target)) {
                this.hideResults();
            }
        });

        // 键盘导航
        this.searchInput.addEventListener('keydown', (e) => {
            this.handleKeyNavigation(e);
        });
    }

    async performSearch(query = null) {
        const searchQuery = query || this.searchInput.value.trim();
        
        if (!searchQuery) {
            this.hideResults();
            return;
        }

        try {
            // 显示加载状态
            this.showLoading();
            
            // 调用搜索API
            const response = await fetch(`/products/all?keyword=${encodeURIComponent(searchQuery)}&format=json`);
            
            if (!response.ok) {
                throw new Error('搜索请求失败');
            }
            
            const products = await response.json();
            this.displayResults(products, searchQuery);
            
        } catch (error) {
            console.error('搜索失败:', error);
            this.showError('搜索失败，请稍后重试');
        }
    }

    showLoading() {
        this.resultsContainer.innerHTML = `
            <div class="search-loading" style="padding: 20px; text-align: center; color: #666;">
                <div style="display: inline-block; width: 20px; height: 20px; border: 2px solid #f3f3f3; border-top: 2px solid #ff6700; border-radius: 50%; animation: spin 1s linear infinite;"></div>
                <span style="margin-left: 10px;">搜索中...</span>
            </div>
            <style>
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            </style>
        `;
        this.resultsContainer.style.display = 'block';
    }

    displayResults(products, query) {
        if (products.length === 0) {
            this.resultsContainer.innerHTML = `
                <div class="no-results" style="padding: 20px; text-align: center; color: #666;">
                    <p>未找到与 "${this.escapeHtml(query)}" 相关的商品</p>
                    <p style="font-size: 12px; margin-top: 10px;">建议：检查拼写或尝试其他关键词</p>
                </div>
            `;
        } else {
            const resultsHtml = products.slice(0, 8).map(product => `
                <div class="search-result-item" style="
                    padding: 12px;
                    border-bottom: 1px solid #f0f0f0;
                    cursor: pointer;
                    transition: background-color 0.2s;
                " onmouseover="this.style.backgroundColor='#f8f8f8'" onmouseout="this.style.backgroundColor='white'" onclick="window.location.href='/product/${product.id}'">
                    <div style="display: flex; align-items: center;">
                        <img src="${product.image || '/image/default.png'}" alt="${this.escapeHtml(product.name)}" style="
                            width: 40px;
                            height: 40px;
                            object-fit: cover;
                            border-radius: 4px;
                            margin-right: 12px;
                        ">
                        <div style="flex: 1;">
                            <div style="font-size: 14px; color: #333; margin-bottom: 4px;">
                                ${this.highlightQuery(this.escapeHtml(product.name), query)}
                            </div>
                            <div style="font-size: 12px; color: #ff6700; font-weight: bold;">
                                ¥${product.price}
                            </div>
                        </div>
                    </div>
                </div>
            `).join('');
            
            this.resultsContainer.innerHTML = `
                <div class="search-results-header" style="padding: 10px 12px; background: #f8f8f8; border-bottom: 1px solid #e0e0e0; font-size: 12px; color: #666;">
                    找到 ${products.length} 个相关商品
                </div>
                ${resultsHtml}
                ${products.length > 8 ? `
                    <div class="view-all-results" style="
                        padding: 12px;
                        text-align: center;
                        background: #f8f8f8;
                        border-top: 1px solid #e0e0e0;
                        cursor: pointer;
                        color: #ff6700;
                        font-size: 14px;
                    " onclick="window.location.href='/products/all?keyword=${encodeURIComponent(query)}'">
                        查看全部 ${products.length} 个结果 →
                    </div>
                ` : ''}
            `;
        }
        
        this.resultsContainer.style.display = 'block';
    }

    showError(message) {
        this.resultsContainer.innerHTML = `
            <div class="search-error" style="padding: 20px; text-align: center; color: #e74c3c;">
                <p>${this.escapeHtml(message)}</p>
            </div>
        `;
        this.resultsContainer.style.display = 'block';
    }

    hideResults() {
        this.resultsContainer.style.display = 'none';
    }

    handleKeyNavigation(e) {
        const items = this.resultsContainer.querySelectorAll('.search-result-item');
        if (items.length === 0) return;

        let currentIndex = -1;
        items.forEach((item, index) => {
            if (item.classList.contains('selected')) {
                currentIndex = index;
            }
        });

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                currentIndex = Math.min(currentIndex + 1, items.length - 1);
                this.selectItem(items, currentIndex);
                break;
            case 'ArrowUp':
                e.preventDefault();
                currentIndex = Math.max(currentIndex - 1, -1);
                this.selectItem(items, currentIndex);
                break;
            case 'Enter':
                e.preventDefault();
                if (currentIndex >= 0) {
                    items[currentIndex].click();
                } else {
                    this.performSearch();
                }
                break;
            case 'Escape':
                this.hideResults();
                this.searchInput.blur();
                break;
        }
    }

    selectItem(items, index) {
        items.forEach(item => item.classList.remove('selected'));
        if (index >= 0) {
            items[index].classList.add('selected');
            items[index].style.backgroundColor = '#e8f4fd';
        }
    }

    highlightQuery(text, query) {
        if (!query) return text;
        const regex = new RegExp(`(${this.escapeRegex(query)})`, 'gi');
        return text.replace(regex, '<mark style="background: #fff3cd; padding: 0 2px;">$1</mark>');
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    escapeRegex(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
}

// 初始化搜索管理器
const searchManager = new SearchManager();

// 导出供其他脚本使用
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SearchManager;
}