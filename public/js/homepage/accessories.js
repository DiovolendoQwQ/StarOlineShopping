(function(){
  function enhanceAccessories(){
    var blocks = document.querySelectorAll('.peijian .main .content .remen');
    blocks.forEach(function(block){
      block.setAttribute('data-tag','accessory');
      var nameEl = block.querySelector('.miaoshu a');
      var keyword = nameEl && nameEl.textContent.trim();
      if (!keyword) return;
      var url = '/products/all?keyword=' + encodeURIComponent(keyword) + '&tag=accessory';
      ['.tu a','.miaoshu a','.piao a'].forEach(function(sel){
        var a = block.querySelector(sel);
        if (a && (!a.getAttribute('href') || a.getAttribute('href') === '')) a.setAttribute('href', url);
      });
    });
  }
  function enhanceNavLinks(){
    var links = document.querySelectorAll('.banner_y .nav .xuangou_right a.add-to-cart');
    links.forEach(function(a){
      var right = a.closest('.xuangou_right');
      var container = right && right.parentElement;
      var leftLink = container && container.querySelector('.xuangou_left a');
      var href = leftLink && leftLink.getAttribute('href');
      if (href) a.setAttribute('href', href); else {
        var pid = a.getAttribute('data-product-id');
        if (pid) a.setAttribute('href', '/product/' + pid);
      }
    });
  }
  document.addEventListener('DOMContentLoaded', function(){ enhanceAccessories(); enhanceNavLinks(); });
  document.addEventListener('accessories:ready', function(){ enhanceAccessories(); });
})();
