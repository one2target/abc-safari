const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const root=path.resolve(__dirname,'..');
const privacy=fs.readFileSync(path.join(root,'privacy/index.html'),'utf8');
const analytics=fs.readFileSync(path.join(root,'analytics-consent.js'),'utf8');

const requiredText=[
 'Политика в отношении обработки персональных данных',
 '7 октября 2026 года',
 'Цай Александр Константинович, плательщик налога на профессиональный доход',
 'madison.restoclub@yandex.ru',
 'alfie-abc-v1',
 'status',
 'version',
 'decidedAt',
 'Яндекс Метрика',
 'Webvisor',
 'VK / Top.Mail.Ru / MyTracker',
 'Timeweb',
 'IP-адрес',
 'User-Agent',
 'Локализация и трансграничная передача',
 'Данные несовершеннолетних',
 'localStorage ↔ backend ↔ PostgreSQL',
 'ecommerce: "dataLayer"',
 'Настройки аналитики'
];
for(const text of requiredText)assert.ok(privacy.includes(text),`privacy policy must contain: ${text}`);

const events=[
 'start_learning','letter_started','letter_completed','complete_letter','activity_started',
 'activity_completed','reward_received','start_training','training_started','training_completed'
];
for(const event of events)assert.ok(privacy.includes(`<code>${event}</code>`),`privacy policy must list ${event}`);

const params=['letter','activity','mistakes_bucket','hints_used','reward','source'];
for(const param of params)assert.ok(privacy.includes(`<code>${param}</code>`),`privacy policy must list ${param}`);

assert.match(privacy,/<link rel="canonical" href="https:\/\/abcsafari\.ru\/privacy\/" \/>/);
assert.match(privacy,/data-analytics-settings>Настройки аналитики<\/button>/);
assert.doesNotMatch(privacy,/юридический адрес|домашний адрес|почтовый адрес/i);
assert.match(privacy,/нет личного кабинета, регистрации, серверной базы учебного прогресса и приёма оплаты/);
assert.match(privacy,/не проводит отдельную проверку возраста/);
assert.match(privacy,/чувствительные области должны быть исключены из записи Webvisor/);
assert.match(privacy,/не создаёт отдельную собственную базу этих журналов/);
assert.match(privacy,/не передаёт ФИО ребёнка или родителя, email, телефон, адрес, школу, точную дату рождения, пароль, банковские реквизиты или данные банковской карты/);

assert.match(analytics,/webvisor:true/,'Webvisor configuration must remain enabled');
assert.match(analytics,/ecommerce:'dataLayer'/,'ecommerce dataLayer preparation must remain enabled');

console.log(JSON.stringify({
 passed:true,
 title:'Политика в отношении обработки персональных данных',
 operator:true,
 homeAddressAbsent:true,
 currentArchitecture:true,
 analyticsAndConsent:true,
 childrenSection:true,
 futureFeaturesClearlyMarked:true
},null,2));
