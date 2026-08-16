#!/usr/bin/env node
// tools/split-data.js
// يأخذ ملف JSON مُجمَّع (مثل data-export.json الناتج من زر "تصدير" في التطبيق)
// ويعيد توليد ملفات data/<year>.json + data/meta.json.
//
// الاستخدام:
//   node tools/split-data.js data-export.json
//
// لا يحتاج أي حزمة خارجية (Node العادي كافٍ).

const fs = require('fs');
const path = require('path');

const inputPath = process.argv[2];
if(!inputPath){
  console.error('الاستخدام: node tools/split-data.js <ملف-البيانات-المُجمَّع.json>');
  process.exit(1);
}

const raw = fs.readFileSync(inputPath, 'utf8');
let data;
try{
  data = JSON.parse(raw);
}catch(e){
  console.error('تعذّرت قراءة الملف كـ JSON صالح:', e.message);
  process.exit(1);
}
if(!Array.isArray(data)){
  console.error('الملف المتوقَّع يجب أن يكون مصفوفة (array) من المواد.');
  process.exit(1);
}

const outDir = path.join(__dirname, '..', 'data');
fs.mkdirSync(outDir, {recursive: true});

const byYear = {};
const yearCounts = {};
const typeCounts = {};
const categoryCounts = {};

data.forEach(function(p){
  const year = p.date ? p.date.slice(0,4) : 'unknown';
  (byYear[year] = byYear[year] || []).push(p);
  yearCounts[year] = (yearCounts[year] || 0) + 1;
  if(p.type) typeCounts[p.type] = (typeCounts[p.type] || 0) + 1;
  if(p.category) categoryCounts[p.category] = (categoryCounts[p.category] || 0) + 1;
});

const years = Object.keys(byYear).sort();

years.forEach(function(y){
  const filePath = path.join(outDir, y + '.json');
  fs.writeFileSync(filePath, JSON.stringify(byYear[y]), 'utf8');
  console.log('كتبت', filePath, '(' + byYear[y].length + ' مادة)');
});

// نفس ترتيب الأقسام المعروض في الواجهة، حفاظًا على تناسق ترتيب الشرائط
const CATEGORY_ORDER = ['حب وغزل','رثاء وفراق','إيمانيات ودعاء','حكمة وتأمل','أخلاق وسلوك','وطن وانتماء','حكايا ومواقف','عام','صورة بلا نص'];
const orderedCategoryCounts = {};
CATEGORY_ORDER.forEach(function(c){ if(categoryCounts[c] !== undefined) orderedCategoryCounts[c] = categoryCounts[c]; });
Object.keys(categoryCounts).forEach(function(c){ if(!(c in orderedCategoryCounts)) orderedCategoryCounts[c] = categoryCounts[c]; });

const meta = {
  total: data.length,
  years: years,
  yearCounts: yearCounts,
  typeCounts: typeCounts,
  categoryCounts: orderedCategoryCounts,
};
fs.writeFileSync(path.join(outDir, 'meta.json'), JSON.stringify(meta), 'utf8');
console.log('كتبت', path.join(outDir, 'meta.json'));
console.log('إجمالي المواد:', data.length);
console.log('تم بنجاح. راجع مجلد data/ وارفعه على GitHub.');
