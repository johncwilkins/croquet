export function createMenuNavigator(doc=document){
 let lastDialog=null;
 const dialog=()=>Array.from(doc.querySelectorAll('dialog[open]')).at(-1);
 function items(){const d=dialog();if(!d)return [];return Array.from(d.querySelectorAll('button,select,input,summary,a[href]')).filter(e=>!e.disabled&&!e.hidden&&e.getClientRects().length)}
 function focus(item){doc.querySelectorAll('.controller-focus').forEach(e=>e.classList.remove('controller-focus'));if(item){item.classList.add('controller-focus');item.focus({preventScroll:true});item.scrollIntoView({block:'nearest'})}}
 function selected(){const d=dialog(),list=items();if(d!==lastDialog){lastDialog=d;focus(list.includes(doc.activeElement)?doc.activeElement:list[0])}return {list,index:Math.max(0,list.indexOf(doc.activeElement))}}
 function adjust(direction){const {list,index}=selected(),item=list[index];if(!item)return;
  if(item.tagName==='SELECT'){const options=Array.from(item.options).filter(o=>!o.disabled&&!o.hidden),i=options.findIndex(o=>o.value===item.value);if(!options.length)return;item.value=options[(i+direction+options.length)%options.length].value;item.dispatchEvent(new Event('change',{bubbles:true}))}
  else if(item.type==='range'){const step=Number(item.step)||1;item.value=Math.min(Number(item.max),Math.max(Number(item.min),Number(item.value)+direction*step));item.dispatchEvent(new Event('input',{bubbles:true}))}
 }
 return {
  move(direction){const {list,index}=selected();if(list.length)focus(list[(index+direction+list.length)%list.length])},
  adjust,
  accept(){const {list,index}=selected(),item=list[index];if(!item)return;if(item.tagName==='SELECT'||item.type==='range')adjust(1);else item.click()},
  scroll(amount){const d=dialog();if(d)d.scrollTop+=amount},
  clear(){lastDialog=null;doc.querySelectorAll('.controller-focus').forEach(e=>e.classList.remove('controller-focus'))}
 };
}
