'use strict';

const fs=require('node:fs');
const http=require('node:http');
const os=require('node:os');
const path=require('node:path');
const crypto=require('node:crypto');

const root=path.resolve(__dirname,'..');
const baselineDir=path.join(root,'tests','visual-baselines','home');
const sizes=Object.freeze([
  Object.freeze({width:1440,height:900}),
  Object.freeze({width:390,height:844}),
  Object.freeze({width:320,height:568})
]);
const states=Object.freeze(['locked','unlocked']);
const update=process.argv.includes('--update');

function loadPlaywright(){
  const requested=process.env.HOME_VISUAL_PLAYWRIGHT||'playwright';
  try{
    const resolved=require.resolve(requested);
    return {api:require(resolved),resolved};
  }catch(error){
    throw new Error('Playwright is required for the optional home visual test. Set HOME_VISUAL_PLAYWRIGHT to its module directory.');
  }
}

function loadComparator(playwrightEntry){
  const coreEntry=require.resolve('playwright-core',{paths:[path.dirname(playwrightEntry)]});
  const coreBundle=require(path.join(path.dirname(coreEntry),'lib','coreBundle.js'));
  return coreBundle.utils.getComparator('image/jpeg');
}

function contentType(file){
  return ({'.css':'text/css','.html':'text/html','.js':'text/javascript','.json':'application/json','.mp3':'audio/mpeg','.wav':'audio/wav','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml','.webmanifest':'application/manifest+json'})[path.extname(file).toLowerCase()]||'application/octet-stream';
}

function localServer(){
  const server=http.createServer((request,response)=>{
    const pathname=decodeURIComponent(new URL(request.url,'http://localhost').pathname);
    let file=path.resolve(root,'.'+pathname);
    if(!file.startsWith(root+path.sep)){response.writeHead(403).end();return;}
    try{if(fs.statSync(file).isDirectory())file=path.join(file,'index.html');}catch{}
    fs.readFile(file,(error,data)=>{
      if(error){response.writeHead(404).end('Not found');return;}
      response.writeHead(200,{'content-type':contentType(file),'cache-control':'no-store'});response.end(data);
    });
  });
  return new Promise((resolve,reject)=>{
    server.once('error',reject);
    server.listen(0,'127.0.0.1',()=>resolve({server,baseURL:`http://127.0.0.1:${server.address().port}/play/`}));
  });
}

function screenshotName(state,size){return `home-${state}-${size.width}x${size.height}.jpg`;}

async function readyHome(page){
  await page.locator('.home-actions').waitFor({state:'visible'});
  await page.evaluate(async()=>{
    if(document.fonts?.ready)await document.fonts.ready;
    await Promise.all([...document.images].map(image=>image.complete?null:new Promise(resolve=>{image.addEventListener('load',resolve,{once:true});image.addEventListener('error',resolve,{once:true});})));
  });
}

async function openState(page,baseURL,state){
  const suffix=state==='unlocked'?'?demo=1&screen=training':'?demo=1';
  await page.goto(baseURL+suffix,{waitUntil:'networkidle'});
  if(state==='unlocked'){
    await page.locator('#home-button').click();
    await page.getByText('Повтори изученные буквы',{exact:true}).waitFor({state:'visible'});
  }
  await readyHome(page);
}

async function capture(browser,baseURL,state,size){
  const context=await browser.newContext({viewport:size,deviceScaleFactor:1,reducedMotion:'reduce',locale:'ru-RU'});
  const page=await context.newPage();
  await openState(page,baseURL,state);
  const buffer=await page.screenshot({fullPage:true,type:'jpeg',quality:80,animations:'disabled',caret:'hide'});
  await context.close();
  return buffer;
}

async function main(){
  const {api:playwright,resolved}=loadPlaywright();
  const compare=loadComparator(resolved);
  const actualDir=!update&&process.env.HOME_VISUAL_ACTUAL_DIR?path.resolve(process.env.HOME_VISUAL_ACTUAL_DIR):null;
  const local=update||actualDir?null:await localServer();
  const baseURL=update?(process.env.HOME_VISUAL_REFERENCE_URL||'https://abcsafari.ru/play/'):local?.baseURL;
  const launchOptions={headless:true};
  if(process.env.HOME_VISUAL_BROWSER)launchOptions.executablePath=process.env.HOME_VISUAL_BROWSER;
  const browser=actualDir?null:await playwright.chromium.launch(launchOptions);
  const temp=fs.mkdtempSync(path.join(os.tmpdir(),'abc-home-visual-'));
  const failures=[];
  try{
    fs.mkdirSync(baselineDir,{recursive:true});
    for(const state of states)for(const size of sizes){
      const name=screenshotName(state,size),actual=actualDir?fs.readFileSync(path.join(actualDir,`local-${name}`)):await capture(browser,baseURL,state,size),baseline=path.join(baselineDir,name);
      if(update){fs.writeFileSync(baseline,actual);continue;}
      if(!fs.existsSync(baseline)){failures.push(`${name}: baseline missing`);continue;}
      const result=compare(actual,fs.readFileSync(baseline),{threshold:.15,maxDiffPixelRatio:.003});
      if(result){
        const stem=name.replace(/\.jpg$/,'');
        const actualPath=path.join(temp,`${stem}-actual.jpg`);fs.writeFileSync(actualPath,actual);
        if(result.diff)fs.writeFileSync(path.join(temp,`${stem}-diff.png`),result.diff);
        failures.push(`${name}: ${result.errorMessage}`);
      }
    }
    if(update){
      const baselines=states.flatMap(state=>sizes.map(size=>{
        const name=screenshotName(state,size),data=fs.readFileSync(path.join(baselineDir,name));
        return {name,bytes:data.length,sha256:crypto.createHash('sha256').update(data).digest('hex')};
      }));
      fs.writeFileSync(path.join(baselineDir,'manifest.json'),JSON.stringify({source:baseURL,capturedAt:new Date().toISOString(),format:'image/jpeg',states,sizes,baselines},null,2)+'\n');
      console.log(`Updated ${states.length*sizes.length} production baselines in ${path.relative(root,baselineDir)}`);
    }else if(failures.length){
      throw new Error(`Home visual regression failed:\n${failures.join('\n')}\nArtifacts: ${temp}`);
    }else{
      console.log(`Home visual regression passed: ${states.length*sizes.length} screenshots match production.`);
      fs.rmSync(temp,{recursive:true,force:true});
    }
  }finally{
    if(browser)await browser.close();
    if(local)await new Promise(resolve=>local.server.close(resolve));
  }
}

main().catch(error=>{console.error(error.stack||error);process.exitCode=1;});
