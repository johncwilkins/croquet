export function nextBallTargets(match,balls){
  if(!match)return [];
  return balls.flatMap((ball,index)=>{
    if(match.individual&&index>=match.playerCount)return [];
    if(ball.finished)return [{index,name:ball.name,finished:true,label:'Finished'}];
    const target=match.target(index),direction=target.stake?'':target.d<0?'↑ North':'↓ South';
    const label=target.stake?(target.stake==='peg'?'Centre peg':target.stake==='turning'?'Turning stake':'Finish stake'):'Hoop '+(target.h+1)+' · '+direction;
    return [{index,name:ball.name,finished:false,entered:ball.entered,target,label,step:ball.progress+1,total:match.config.route.length}];
  });
}
