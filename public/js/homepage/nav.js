(function(){
  document.addEventListener('DOMContentLoaded', function(){
    var nav = document.querySelector('.banner_y .nav');
    if (!nav) return;
    var activeItem = null;
    nav.addEventListener('click', function(e){
      var link = e.target.closest('.nav-category');
      if (!link) return;
      e.preventDefault();
      var li = link.closest('li');
      if (!li) return;
      if (activeItem && activeItem !== li) activeItem.classList.remove('open');
      li.classList.add('open');
      activeItem = li;
    });
    document.addEventListener('click', function(e){
      if (!activeItem) return;
      if (activeItem.contains(e.target)) return;
      activeItem.classList.remove('open');
      activeItem = null;
    });
  });
})();
