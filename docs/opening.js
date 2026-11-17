// Golf/Nine-Wicket: toss winner chooses colours; Blue starts.
// Association: winner may choose lead or colours; opponent takes the other choice.
export function openingChoice(kind,humanWon,choice){
  if(kind==='association'){
    if(choice==='first'||choice==='second'){
      if(!humanWon)throw Error('The computer has already chosen the lead');
      return {humanSide:1,firstSide:choice==='first'?1:0};
    }
    const humanSide=choice==='blue'?0:1;
    return {humanSide,firstSide:1-humanSide}; // computer elects to lead
  }
  return {humanSide:humanWon?(choice==='blue'?0:1):1,firstSide:0};
}
export function drawHumanColour(playerCount,random=Math.random){return Math.min(playerCount-1,Math.floor(random()*playerCount))}
