const fs = require('fs');
const path = 'src/pages/AIJobAssistantPage.tsx';
const s = fs.readFileSync(path, 'utf8');
let inS=false,inD=false,inTpl=false,inLine=false,inBlock=false;
let curly=0,paren=0,angle=0;let prev='';let line=1;
for(let i=0;i<s.length;i++){
  const ch=s[i];
  if(ch==='\n'){line++; inLine=false}
  if(inLine){prev=ch; continue}
  if(!inS&&!inD&&!inTpl&&!inBlock && ch==='/' && s[i+1]==='/'){inLine=true; prev=ch; continue}
  if(!inS&&!inD&&!inTpl && ch==='/' && s[i+1]=='*'){inBlock=true; i++; prev=ch; continue}
  if(inBlock){ if(ch==='*' && s[i+1]==='/'){ inBlock=false; i++ } prev=ch; continue }
  if(ch==="'" && !inD && !inTpl){ if(!inS) inS=true; else if(prev!=='\\') inS=false; prev=ch; continue }
  if(ch==='"' && !inS && !inTpl){ if(!inD) inD=true; else if(prev!=='\\') inD=false; prev=ch; continue }
  if(ch==='`' && !inS && !inD){ if(!inTpl) inTpl=true; else if(prev!=='\\') inTpl=false; prev=ch; continue }
  if(inS||inD||inTpl){ prev=ch; continue }
  if(ch==='{') curly++; else if(ch==='}') curly--; else if(ch==='(') paren++; else if(ch===')') paren--; else if(ch==='<' ){
    const nxt = s.slice(i+1,i+6);
    if(/^[A-Za-z\/:]/.test(nxt)) angle++; 
  } else if(ch==='>') angle--;
  if(curly<0||paren<0||angle<0){
    console.log('mismatch at line',line,'curly',curly,'paren',paren,'angle',angle);
    console.log('context:', s.slice(Math.max(0,i-120), Math.min(s.length,i+120)));
    process.exit(0)
  }
  prev=ch
}
console.log('final counts', {curly,paren,angle});
