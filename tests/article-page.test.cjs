const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const root=path.resolve(__dirname,'..');
const articlePath=path.join(root,'articles/angliyskiy-alfavit-dlya-detey/index.html');
const html=fs.readFileSync(articlePath,'utf8');
const sitemap=fs.readFileSync(path.join(root,'sitemap.xml'),'utf8');

assert.match(html,/<title>Английский алфавит для детей: как учить буквы и звуки \| ABC Safari<\/title>/);
assert.match(html,/<h1>Английский алфавит для детей: как учить буквы и звуки без зубрёжки<\/h1>/);
assert.match(html,/<meta name="description" content="Как познакомить ребёнка 5–7 лет с английским алфавитом: названия букв, звуки, первые слова, игры и простые занятия без зубрёжки\." \/>/);
assert.match(html,/<link rel="canonical" href="https:\/\/abcsafari\.ru\/articles\/angliyskiy-alfavit-dlya-detey\/" \/>/);
assert.match(sitemap,/https:\/\/abcsafari\.ru\/articles\/angliyskiy-alfavit-dlya-detey\//);

const schemaMatch=html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
assert.ok(schemaMatch,'article must contain JSON-LD');
const schema=JSON.parse(schemaMatch[1]);
assert.ok(schema['@graph'].some(item=>item['@type']==='BlogPosting'),'article must contain BlogPosting schema');
assert.ok(schema['@graph'].some(item=>item['@type']==='BreadcrumbList'),'article must contain BreadcrumbList schema');

for(const href of ['href="/"','href="/play/"','href="/contacts/"','href="https://vk.ru/abcsafari"']){
  assert.ok(html.includes(href),`article must contain ${href}`);
}

const localImages=[...html.matchAll(/src="(\/articles\/angliyskiy-alfavit-dlya-detey\/images\/[^"]+)"/g)].map(match=>match[1]);
assert.equal(localImages.length,6,'article must use six selected visuals');
for(const image of localImages){
  assert.ok(fs.existsSync(path.join(root,image.slice(1))),`${image} must exist`);
}

for(const phrase of [
  'Название буквы и её звук — не одно и то же',
  'Нужно ли учить сразу весь английский алфавит',
  'Как это устроено в ABC Safari',
  'Что мы заметили во время тестирования',
  'Можно ли учить английские буквы через игру?'
]){
  assert.ok(html.includes(phrase),`article must contain: ${phrase}`);
}

console.log(JSON.stringify({
  passed:true,
  canonical:'https://abcsafari.ru/articles/angliyskiy-alfavit-dlya-detey/',
  schemaTypes:['BlogPosting','BreadcrumbList'],
  localImages:localImages.length
},null,2));
