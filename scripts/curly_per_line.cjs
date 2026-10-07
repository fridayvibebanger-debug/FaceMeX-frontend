const fs=require('fs');
const s=fs.readFileSync('src/pages/AIJobAssistantPage.tsx','utf8');
const lines = s.split('\n');
let inS=false,inD=false,inTpl=false,inBlock=false;
let curly=0,paren=0;
for(let i=0;i<lines.length;i++){
  const line = lines[i];
  for(let j=0;j<line.length;j++){
    const ch=line[j];
    if(!inS&&!inD&&!inTpl&&!inBlock && ch==='/' && line[j+1]==='/' ) break; // rest of line comment
    if(!inS&&!inD&&!inTpl && ch==='/' && line[j+1]==='*'){ inBlock=true; j++; continue }
    if(inBlock){ if(ch==='*' && line[j+1]==='/'){ inBlock=false; j++; } continue }
    if(ch==="'" && !inD && !inTpl){ if(!inS) inS=true; else inS=false; continue }
    if(ch==='"' && !inS && !inTpl){ if(!inD) inD=true; else inD=false; continue }
    if(ch==='`' && !inS && !inD){ if(!inTpl) inTpl=true; else inTpl=false; continue }
    if(inS||inD||inTpl) continue;
    if(ch==='{') curly++; else if(ch==='}') curly--; else if(ch==='(') paren++; else if(ch===')') paren--;
  }
  if(i>4300 && i<4700){
    console.log('L',i+1,'curly',curly,'paren',paren);
  }
  if(curly<0){ console.log('NEGATIVE at line',i+1); console.log('line content:', lines[i]); process.exit(0)}
}
console.log('done, final curly',curly,'paren',paren);
