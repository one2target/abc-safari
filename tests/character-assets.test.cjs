const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const fs=require('node:fs');
const path=require('node:path');
const {execFileSync}=require('node:child_process');

const root=path.resolve(__dirname,'..');
const manifestPath=path.join(root,'play/images/character-assets.sha256.json');
const requiredAssets=[
 'play/images/giraffe_base.png',
 'play/images/giraffe_jacket_racer.png',
 'play/images/giraffe_jacket_stars.png',
 'play/images/marius_hat_adventure.png',
 'play/images/marius_hat_straw_bow.png',
 'play/images/accessory_bouquet.png',
 'play/images/accessory_balloon.png'
];

function verifyCharacterAssets(){
 assert.ok(fs.existsSync(manifestPath),'character asset SHA-256 manifest is missing');
 const manifest=JSON.parse(fs.readFileSync(manifestPath,'utf8'));
 assert.equal(manifest.algorithm,'sha256');
 assert.ok(manifest.assets&&typeof manifest.assets==='object'&&!Array.isArray(manifest.assets));

 const results=[];
 for(const assetPath of requiredAssets){
  const expected=manifest.assets[assetPath];
  assert.match(expected||'',/^[a-f0-9]{64}$/,`${assetPath} needs a valid SHA-256 in the manifest`);
  const absolutePath=path.join(root,assetPath);
  assert.ok(fs.existsSync(absolutePath),`${assetPath} does not exist`);
  assert.doesNotThrow(
   ()=>execFileSync('git',['ls-files','--error-unmatch','--',assetPath],{cwd:root,stdio:'pipe'}),
   `${assetPath} is not tracked by Git`
  );
  const actual=crypto.createHash('sha256').update(fs.readFileSync(absolutePath)).digest('hex');
  assert.equal(actual,expected,`${assetPath} SHA-256 differs from the manifest; update both only for an intentional asset change`);
  results.push({path:assetPath,sha256:actual});
 }
 return results;
}

if(require.main===module){
 const results=verifyCharacterAssets();
 console.log(JSON.stringify({passed:true,tracked:true,assets:results},null,2));
}

module.exports={verifyCharacterAssets,requiredAssets};
