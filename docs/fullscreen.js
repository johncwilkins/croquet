// Fullscreen starts at the first user gesture. Exiting never triggers a retry.
export function initFullscreen(button,notice,onResize){
 const root=document.documentElement;
 const active=()=>document.fullscreenElement||document.webkitFullscreenElement;
 const enter=root.requestFullscreen||root.webkitRequestFullscreen;
 const leave=document.exitFullscreen||document.webkitExitFullscreen;
 let automatic=true;
 function update(){const isFull=!!active();button.setAttribute('aria-pressed',String(isFull));button.setAttribute('aria-label',isFull?'Exit fullscreen':'Enter fullscreen');button.title=isFull?'Exit fullscreen (Esc)':'Enter fullscreen';button.innerHTML='⛶ <span>'+(isFull?'Exit fullscreen':'Fullscreen')+'</span>';onResize()}
 async function request(showError){if(active())return;if(!enter){if(showError)notice('Fullscreen is unavailable here. Try your browser’s fullscreen or Add to Home Screen.');return}try{await enter.call(root)}catch(error){if(showError)notice('Your browser blocked fullscreen. Open the game directly and try again.')}}
 function firstGesture(event){if(!automatic||event.target.closest('#fullscreen'))return;if(event.type==='keydown'&&(event.repeat||event.ctrlKey||event.metaKey||event.altKey||!['Space','Enter'].includes(event.code)))return;automatic=false;request(false)}
 document.addEventListener('click',firstGesture,{capture:true});document.addEventListener('keydown',firstGesture,{capture:true});
 button.addEventListener('click',async()=>{automatic=false;if(active()&&leave){try{await leave.call(document)}catch(error){notice('Use Esc to leave fullscreen.')}}else await request(true)});
 document.addEventListener('fullscreenchange',update);document.addEventListener('webkitfullscreenchange',update);update();
}
