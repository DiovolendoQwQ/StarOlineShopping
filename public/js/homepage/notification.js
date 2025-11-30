function showCartNotification(){
  var overlay=document.getElementById('overlay');
  var notification=document.getElementById('cartNotification');
  if(!overlay||!notification) return;
  overlay.classList.add('show');
  notification.classList.add('show');
  setTimeout(function(){closeNotification();},3000);
}
function closeNotification(){
  var overlay=document.getElementById('overlay');
  var notification=document.getElementById('cartNotification');
  if(!overlay||!notification) return;
  overlay.classList.remove('show');
  notification.classList.remove('show');
}
function showErrorNotification(message){
  var notification=document.getElementById('cartNotification');
  if(!notification) return;
  var icon=notification.querySelector('.icon');
  var title=notification.querySelector('h3');
  var text=notification.querySelector('p');
  if(icon) icon.innerHTML='✕';
  if(icon) icon.style.background='linear-gradient(135deg,#f44336,#d32f2f)';
  if(title) title.textContent='添加失败';
  if(text) text.textContent=message||'操作失败';
  showCartNotification();
  setTimeout(function(){
    if(icon) icon.innerHTML='✓';
    if(icon) icon.style.background='linear-gradient(135deg,#4CAF50,#45a049)';
    if(title) title.textContent='添加成功！';
    if(text) text.textContent='商品已成功添加到购物车';
  },3000);
}
window.showCartNotification=showCartNotification;
window.closeNotification=closeNotification;
window.showErrorNotification=showErrorNotification;
