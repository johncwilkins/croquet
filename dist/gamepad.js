// Xbox's standard browser mapping. No Xbox/Home button interception.
export const PAD={A:0,B:1,X:2,Y:3,LB:4,RB:5,LT:6,RT:7,VIEW:8,MENU:9,UP:12,DOWN:13,LEFT:14,RIGHT:15};
export function stick(value,deadzone=.18){if(!Number.isFinite(value)||Math.abs(value)<=deadzone)return 0;return Math.sign(value)*Math.min(1,(Math.abs(value)-deadzone)/(1-deadzone))}
export class PadReader{
 constructor(){this.reset()}
 reset(){this.armed=false;this.previous=Array(16).fill(false);this.nextRepeat=Array(16).fill(Infinity)}
 sample(pad,now){
  const axes=Array.from({length:4},(_,i)=>stick(pad.axes?.[i]??0));
  const held=Array.from({length:16},(_,i)=>{const b=pad.buttons?.[i];return typeof b==='number'?b>.55:!!b?.pressed||(b?.value??0)>.55});
  if(!this.armed){this.armed=!held.some(Boolean)&&axes.every(a=>a===0);return {axes:[0,0,0,0],held:Array(16).fill(false),pressed:[],released:[],repeat:[]}}
  const pressed=[],released=[],repeat=[];
  held.forEach((down,i)=>{if(down&&!this.previous[i]){pressed.push(i);repeat.push(i);this.nextRepeat[i]=now+350}else if(down&&now>=this.nextRepeat[i]){repeat.push(i);this.nextRepeat[i]=now+125}else if(!down&&this.previous[i]){released.push(i);this.nextRepeat[i]=Infinity}});
  this.previous=held;return {axes,held,pressed,released,repeat};
 }
}
export function createGamepadDriver({getState,actions,readPads=()=>navigator.getGamepads(),isSuspended=()=>false}){
 const reader=new PadReader();let id=null,lastTime=null,chargeButton=null,nav=0,nextNav=0;
 function reset(){reader.reset();chargeButton=null;lastTime=null;nav=0;actions.cancel()}
 function update(now){
  let pads;try{pads=Array.from(readPads?.()??[])}catch{pads=[]}
  const pad=pads.find(p=>p&&p.connected!==false&&(p.mapping==='standard'||(!p.mapping&&/xbox|xinput/i.test(p.id??'')))&&p.buttons?.length>=16&&p.axes?.length>=4);
  if(!pad){if(id!==null){id=null;reset();actions.connected(false)}return}
  const key=pad.index+':'+pad.id;if(key!==id){id=key;reset();actions.connected(true)}
  if(isSuspended()){reset();return}
  const dt=lastTime===null?0:Math.max(0,Math.min(.05,(now-lastTime)/1000));lastTime=now;
  const input=reader.sample(pad,now),pressed=b=>input.pressed.includes(b),released=b=>input.released.includes(b),repeat=b=>input.repeat.includes(b);let state=getState();
  if(pressed(PAD.MENU)){actions.settings();chargeButton=null;return}
  if(pressed(PAD.VIEW)){actions.help();chargeButton=null;return}
  if(state.modal){
   chargeButton=null;
   if(pressed(PAD.B)){actions.back();return}
   const direction=Math.abs(input.axes[1])>.5?Math.sign(input.axes[1]):0;
   if(direction&&(direction!==nav||now>=nextNav)){actions.menuMove(direction);nextNav=now+(direction!==nav?350:125)}nav=direction;
   if(repeat(PAD.UP))actions.menuMove(-1);if(repeat(PAD.DOWN))actions.menuMove(1);
   if(repeat(PAD.LEFT))actions.menuAdjust(-1);if(repeat(PAD.RIGHT))actions.menuAdjust(1);
   if(pressed(PAD.A))actions.menuAccept();
   if(input.axes[3])actions.menuScroll(input.axes[3]*dt*500);
   return;
  }
  nav=0;
  if(pressed(PAD.B)){actions.cancel();chargeButton=null;return}
  if(state.phase!=='aim'||!state.human){chargeButton=null;if(pressed(PAD.LB))actions.view(-1);if(pressed(PAD.RB))actions.view(1);return}
  if(state.placing){
   if(pressed(PAD.A)){actions.confirmPlacement();return}
   if(pressed(PAD.LB))actions.view(-1);if(pressed(PAD.RB)||pressed(PAD.X))actions.view(1);
   if(pressed(PAD.Y))actions.recenter();
   const fine=input.held[PAD.LT];const dx=input.axes[0]+(input.held[PAD.RIGHT]?.15:0)-(input.held[PAD.LEFT]?.15:0);
   if(dx)actions.place(dx*dt*(fine?.2:1));
   if(input.axes[2]||input.axes[3])actions.camera(input.axes[2],input.axes[3],dt);
   return;
  }
  if(state.swingStage==='idle'){
   if(pressed(PAD.X))actions.jump();if(pressed(PAD.Y))actions.recenter();
   if(state.chooseBall){if(pressed(PAD.LB))actions.chooseBall(0);if(pressed(PAD.RB))actions.chooseBall(1)}
   else{if(pressed(PAD.LB))actions.view(-1);if(pressed(PAD.RB))actions.view(1)}
   const dx=input.axes[0]+(input.held[PAD.RIGHT]?.12:0)-(input.held[PAD.LEFT]?.12:0);
   if(dx)actions.aim(dx*dt*(input.held[PAD.LT]?.2:1));
   if(input.axes[2]||input.axes[3])actions.camera(input.axes[2],input.axes[3],dt);
  }
  const shotButton=pressed(PAD.A)?PAD.A:pressed(PAD.RT)?PAD.RT:null;
  if(state.swingStage==='accuracy'&&shotButton!==null){actions.center(now);chargeButton=null;return}
  if(state.swingStage==='idle'&&shotButton!==null){chargeButton=shotButton;actions.begin(now)}
  state=getState();
  if(state.swingStage==='power'&&chargeButton!==null){
   if(released(chargeButton)){actions.release(now);chargeButton=null}
   else if(input.held[chargeButton])actions.power(dt*(input.held[PAD.LT]?.25:1));
  }
 }
 return {update,reset};
}
