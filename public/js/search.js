// 搜索功能实现
class SearchManager {
    constructor() {
        this.searchForm = null;
        this.searchInput = null;
        this.searchButton = null;
        this.resultsContainer = null;
        this.suggestionsContainer = null;
        this.hotSearchContainer = null;
        this.searchTimeout = null;
        this.currentSuggestionIndex = -1;
        this.init();
    }

    init() {
        // Wait for components to be loaded if they are being loaded dynamically
        if (document.querySelector('.search form')) {
            this.setupSearch();
        } else {
            document.addEventListener('components:loaded', () => this.setupSearch());
            // Fallback if components are already loaded or not used
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => {
                    if (!this.searchForm) this.setupSearch();
                });
            } else {
                // setTimeout to allow async renders to finish if any
                setTimeout(() => {
                    if (!this.searchForm) this.setupSearch();
                }, 100);
            }
        }
    }

    setupSearch() {
        // 获取搜索表单元素
        this.searchForm = document.querySelector('.search form');
        this.searchInput = document.querySelector('.search .shuru');
        this.searchButton = document.querySelector('.search .sousuo');

        if (!this.searchForm || !this.searchInput || !this.searchButton) {
            console.warn('Search elements not found');
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
            max-height: 400px;
            overflow-y: auto;
            z-index: 10000;
            margin-top: 1px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            display: none;
        `;

        // 创建搜索建议容器
        this.suggestionsContainer = document.createElement('div');
        this.suggestionsContainer.className = 'search-suggestions';
        this.suggestionsContainer.style.cssText = `
            position: absolute;
            top: calc(100% + 2px);
            left: 0;
            right: 0;
            background: white;
            border: 1px solid #e0e0e0;
            border-radius: 0 0 8px 8px;
            max-height: 300px;
            overflow-y: auto;
            z-index: 10001;
            box-shadow: 0 8px 24px rgba(0,0,0,0.15);
            display: none;
            margin-top: 1px;
        `;

        // 创建热门搜索容器
        this.hotSearchContainer = document.createElement('div');
        this.hotSearchContainer.className = 'hot-searches';
        this.hotSearchContainer.style.cssText = `
            position: absolute;
            top: calc(100% + 2px);
            left: 0;
            right: 0;
            background: white;
            border: 1px solid #e0e0e0;
            border-radius: 0 0 8px 8px;
            max-height: 200px;
            overflow-y: auto;
            z-index: 10002;
            box-shadow: 0 8px 24px rgba(0,0,0,0.15);
            display: none;
            margin-top: 1px;
        `;

        // 将容器添加到搜索表单的父元素
        const searchContainer = this.searchForm.parentElement;
        searchContainer.style.position = 'relative';
        searchContainer.appendChild(this.resultsContainer);
        searchContainer.appendChild(this.suggestionsContainer);
        searchContainer.appendChild(this.hotSearchContainer);
    }

    bindEvents() {
        // 表单提交时跳转到搜索结果页面
        this.searchForm.addEventListener('submit', (e) => {
            const query = this.searchInput.value.trim();
            if (query) {
                // 允许表单正常提交，跳转到搜索结果页面
                return true;
            } else {
                e.preventDefault();
                return false;
            }
        });

        // 输入时实时搜索和建议
        this.searchInput.addEventListener('input', (e) => {
            const query = e.target.value.trim();

            // 清除之前的定时器
            if (this.searchTimeout) {
                clearTimeout(this.searchTimeout);
            }

            if (query.length >= 2) {
                // 延迟搜索，避免频繁请求
                this.searchTimeout = setTimeout(() => {
                    this.showSuggestions(query);
                    this.performSearch(query);
                }, 300);
            } else if (query.length === 0) {
                this.showHotSearches();
            } else {
                this.hideAllContainers();
            }
        });

        // 获得焦点时显示热门搜索
        this.searchInput.addEventListener('focus', () => {
            if (this.searchInput.value.trim().length === 0) {
                this.showHotSearches();
            }
        });

        // 点击搜索按钮
        this.searchButton.addEventListener('click', (e) => {
            const query = this.searchInput.value.trim();
            if (query) {
                // 跳转到搜索结果页面
                window.location.href = `/products/all?keyword=${encodeURIComponent(query)}`;
            }
            e.preventDefault();
        });

        // 点击外部隐藏结果
        document.addEventListener('click', (e) => {
            if (!this.searchForm.contains(e.target) &&
                !this.resultsContainer.contains(e.target) &&
                !this.suggestionsContainer.contains(e.target) &&
                !this.hotSearchContainer.contains(e.target)) {
                this.hideAllContainers();
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
                throw new Error('Search request failed');
            }

            const products = await response.json();
            this.displayResults(products, searchQuery);

        } catch (error) {
            console.error('Search failed:', error);
            this.showError('Search failed. Please try again later');
        }
    }

    showLoading() {
        this.resultsContainer.innerHTML = `
            <div class="search-loading" style="padding: 20px; text-align: center; color: #666;">
                <div style="display: inline-block; width: 20px; height: 20px; border: 2px solid #f3f3f3; border-top: 2px solid #ff6700; border-radius: 50%; animation: spin 1s linear infinite;"></div>
                <span style="margin-left: 10px;">Searching...</span>
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
                    <p>No products found matching "${this.escapeHtml(query)}"</p>
                    <p style="font-size: 12px; margin-top: 10px;">Tip: check spelling or try other keywords</p>
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
                        <img src="${this.normalizeImage(product.image)}" alt="${this.escapeHtml(product.name)}" style="
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
                    Found ${products.length} related products
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
                        View all ${products.length} results →
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

    hideSuggestions() {
        this.suggestionsContainer.style.display = 'none';
    }

    hideHotSearches() {
        this.hotSearchContainer.style.display = 'none';
    }

    hideAllContainers() {
        this.hideResults();
        this.hideSuggestions();
        this.hideHotSearches();
        this.currentSuggestionIndex = -1;
    }

    // 显示搜索建议
    async showSuggestions(query) {
        try {
            const response = await fetch(`/products/api/suggestions?q=${encodeURIComponent(query)}&limit=5`);
            const suggestions = await response.json();

            if (suggestions.length > 0) {
                this.displaySuggestions(suggestions, query);
            } else {
                this.hideSuggestions();
            }
        } catch (error) {
            console.error('Failed to fetch search suggestions:', error);
            this.hideSuggestions();
        }
    }

    // 显示热门搜索词
    async showHotSearches() {
        try {
            const response = await fetch('/products/api/hot-searches?limit=8');
            const hotSearches = await response.json();

            if (hotSearches.length > 0) {
                this.displayHotSearches(hotSearches);
            }
        } catch (error) {
            console.error('Failed to fetch hot searches:', error);
        }
    }

    // 显示搜索建议列表
    displaySuggestions(suggestions, query) {
        const suggestionsHtml = suggestions.map((suggestion, index) => `
            <div class="suggestion-item" data-index="${index}" style="
                padding: 12px 16px;
                border-bottom: 1px solid #f5f5f5;
                cursor: pointer;
                display: flex;
                align-items: center;
                transition: all 0.2s ease;
                background: white;
            " onmouseover="this.style.backgroundColor='#f8f9fa'; this.style.borderLeftColor='#ff6700'; this.style.borderLeftWidth='3px'" 
               onmouseout="this.style.backgroundColor='white'; this.style.borderLeftColor='transparent'; this.style.borderLeftWidth='3px'">
                <i style="margin-right: 10px; color: #999; font-size: 14px;">🔍</i>
                <span style="color: #333; font-size: 14px; line-height: 1.4;">${this.highlightQuery(this.escapeHtml(suggestion), query)}</span>
            </div>
        `).join('');

        this.suggestionsContainer.innerHTML = suggestionsHtml;
        this.suggestionsContainer.style.display = 'block';
        this.hideResults();
        this.hideHotSearches();

        // 绑定点击事件
        this.suggestionsContainer.querySelectorAll('.suggestion-item').forEach(item => {
            item.addEventListener('click', () => {
                const suggestion = item.querySelector('span').textContent;
                this.searchInput.value = suggestion;
                this.hideAllContainers();
                this.performSearch(suggestion);
            });
        });
    }

    // 显示热门搜索词
    displayHotSearches(hotSearches) {
        const MAP = {
            '小米手机':'Xiaomi Phone',
            '华为手机':'Huawei Phone',
            '苹果手机':'Apple iPhone',
            '三星手机':'Samsung Phone',
            '手机壳':'Phone Case',
            '手机膜':'Screen Protector',
            '耳机':'Earphones',
            '音箱':'Speaker',
            '路由器':'Router',
            '笔记本':'Laptop',
            '平板':'Tablet',
            '电视':'TV',
            '相机':'Camera',
            '充电宝':'Power Bank',
            '水杯':'Bottle',
            '插线板':'Power Strip'
        };
        const hotSearchesHtml = `
            <div style="padding: 16px; border-bottom: 1px solid #f5f5f5;">
                <div style="color: #666; font-size: 13px; margin-bottom: 12px; font-weight: 500;">🔥 Hot Searches</div>
                <div style="display: flex; flex-wrap: wrap; gap: 8px;">
                    ${hotSearches.map(term => {
                        const text = MAP[term] || term;
                        return `
                        <span class="hot-search-tag" data-term="${this.escapeHtml(term)}" style="
                            background: #f8f9fa;
                            color: #666;
                            padding: 6px 12px;
                            border-radius: 16px;
                            font-size: 12px;
                            cursor: pointer;
                            border: 1px solid #e9ecef;
                            transition: all 0.2s ease;
                            white-space: nowrap;
                        " onmouseover="this.style.backgroundColor='#ff6700'; this.style.color='white'; this.style.borderColor='#ff6700'; this.style.transform='translateY(-1px)'; this.style.boxShadow='0 2px 8px rgba(255,103,0,0.3)'" 
                           onmouseout="this.style.backgroundColor='#f8f9fa'; this.style.color='#666'; this.style.borderColor='#e9ecef'; this.style.transform='translateY(0)'; this.style.boxShadow='none'">
                            ${this.escapeHtml(text)}
                        </span>`;
                    }).join('')}
                </div>
            </div>
        `;

        this.hotSearchContainer.innerHTML = hotSearchesHtml;
        this.hotSearchContainer.style.display = 'block';
        this.hideResults();
        this.hideSuggestions();

        // 绑定点击事件
        this.hotSearchContainer.querySelectorAll('.hot-search-tag').forEach(tag => {
            tag.addEventListener('click', () => {
                const term = tag.getAttribute('data-term') ? tag.getAttribute('data-term').trim() : tag.textContent.trim();
                this.searchInput.value = term;
                this.hideAllContainers();
                this.performSearch(term);
            });
        });
    }

    handleKeyNavigation(e) {
        // 获取当前可见的导航项
        let items = [];
        let containerType = '';

        if (this.suggestionsContainer.style.display === 'block') {
            items = this.suggestionsContainer.querySelectorAll('.suggestion-item');
            containerType = 'suggestions';
        } else if (this.resultsContainer.style.display === 'block') {
            items = this.resultsContainer.querySelectorAll('.search-result-item');
            containerType = 'results';
        } else if (this.hotSearchContainer.style.display === 'block') {
            items = this.hotSearchContainer.querySelectorAll('.hot-search-tag');
            containerType = 'hotSearches';
        }

        if (items.length === 0) return;

        let currentIndex = this.currentSuggestionIndex;

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                currentIndex = Math.min(currentIndex + 1, items.length - 1);
                this.selectNavigationItem(items, currentIndex, containerType);
                break;
            case 'ArrowUp':
                e.preventDefault();
                currentIndex = Math.max(currentIndex - 1, -1);
                this.selectNavigationItem(items, currentIndex, containerType);
                break;
            case 'Enter':
                e.preventDefault();
                if (currentIndex >= 0 && items[currentIndex]) {
                    this.handleNavigationItemSelect(items[currentIndex], containerType);
                }
                break;
            case 'Escape':
                this.hideAllContainers();
                this.searchInput.blur();
                break;
        }
    }

    selectNavigationItem(items, index, containerType) {
        // 清除之前的选中状态
        items.forEach(item => {
            item.style.backgroundColor = containerType === 'hotSearches' ? '#f8f9fa' : 'white';
        });

        this.currentSuggestionIndex = index;

        // 设置新的选中状态
        if (index >= 0 && items[index]) {
            items[index].style.backgroundColor = '#e3f2fd';
            items[index].scrollIntoView({ block: 'nearest' });
        }
    }

    handleNavigationItemSelect(item, containerType) {
        let searchTerm = '';

        switch (containerType) {
            case 'suggestions':
                searchTerm = item.querySelector('span').textContent.replace(/\s+/g, ' ').trim();
                break;
            case 'results':
                item.click();
                return;
            case 'hotSearches':
                searchTerm = item.textContent.trim();
                break;
        }

        if (searchTerm) {
            this.searchInput.value = searchTerm;
            this.hideAllContainers();
            this.performSearch(searchTerm);
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

    normalizeImage(image) {
        if (!image) return '/image/default.png';
        const str = String(image).trim();
        if (/^https?:\/\//i.test(str)) return str;
        const cleaned = str.replace(/^\.?\/?image\/?/i, '').replace(/^\/+/, '');
        return `/image/${cleaned || 'default.png'}`;
    }
}

// 初始化搜索管理器
const searchManager = new SearchManager();

// 导出供其他脚本使用
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SearchManager;
}
