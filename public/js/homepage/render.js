
import { navData, featuredData, accessoriesData, accessoriesData2 } from './data.js';

export function renderNav() {
    const navContainer = document.querySelector('.banner_y .nav ul');
    if (!navContainer) return;

    navContainer.innerHTML = navData.map(category => {
        const products = category.products;
        const leftProducts = products.slice(0, 6);
        const ctnProducts = products.slice(6, 12);
        const rightProducts = products.slice(12);

        const renderProductItem = (p) => `
            <div>
                <div class="xuangou_left fl">
                    <a href="${p.link || 'javascript:void(0)'}">
                        <div class="img fl"><img src="${p.img}" alt="${p.name}" loading="lazy"></div>
                        <span class="fl">${p.name}</span>
                        <div class="clear"></div>
                    </a>
                </div>
                <div class="xuangou_right fr">
                    <a href="${p.link || 'javascript:void(0)'}" class="add-to-cart" ${p.id ? `data-product-id="${p.id}"` : ''}>选购</a>
                </div>
                <div class="clear"></div>
            </div>
        `;

        const renderColumn = (items, className) => {
            if (items.length === 0) return '';
            return `<div class="${className} fl">${items.map(renderProductItem).join('')}</div>`;
        };

        return `
            <li>
                <div class="nav-categories">
                    <a href="" class="nav-category">${category.category}</a>
                </div>
                <div class="pop">
                    ${renderColumn(leftProducts, 'left')}
                    ${renderColumn(ctnProducts, 'ctn')}
                    ${renderColumn(rightProducts, 'right')}
                    <div class="clear"></div>
                </div>
            </li>
        `;
    }).join('');
}

export function renderFeatured() {
    const container = document.querySelector('.danpin .main');
    if (!container) return;

    container.innerHTML = featuredData.map(item => `
        <div class="mingxing fl">
            <div class="sub_mingxing">
                <a href="${item.link}"><img src="${item.img}" alt="${item.name}" loading="lazy"></a>
            </div>
            <div class="pinpai">
                <a href="${item.link}">${item.name}</a>
            </div>
            <div class="youhui">${item.description}</div>
            <div class="jiage">${item.subtitle}</div>
        </div>
    `).join('') + '<div class="clear"></div>';
}

export function renderAccessories() {
    const container = document.querySelector('.peijian .main');
    if (!container) return;

    const renderRow = (items) => {
        return `<div class="content">
            ${items.map(item => {
                if (item.type === 'featured') {
                    return `<div class="remen fl" data-tag="${item.tag}"><a href="${item.link}"><img src="${item.img}" loading="lazy"></a></div>`;
                } else {
                    return `
                    <div class="remen fl">
                        ${item.tag ? `<div class="xinpin"><span style="background:${item.tagColor || '#83c44e'}">${item.tag}</span></div>` : ''}
                        <div class="tu"><a href="${item.link || ''}"><img src="${item.img}" loading="lazy" class="${item.id === '122' || item.id === '123' ? 'featured-center' : ''}"></a></div>
                        <div class="miaoshu"><a href="${item.link || ''}">${item.name}</a></div>
                        <div class="jiage">${item.price}</div>
                        <div class="pingjia">${item.reviews}</div>
                    </div>`;
                }
            }).join('')}
            <div class="clear"></div>
        </div>`;
    };

    container.innerHTML = renderRow(accessoriesData) + renderRow(accessoriesData2);
    
    // Dispatch event for listeners
    document.dispatchEvent(new CustomEvent('accessories:ready'));
}
