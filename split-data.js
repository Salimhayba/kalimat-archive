#!/usr/bin/env node
// split-data.js
// يأخذ ملف JSON مُجمَّع (مثل data-export.json الناتج من زر "تصدير" في التطبيق)
// ويعيد توليد ملفات <year>.json + meta.json في نفس المجلد (بنية مسطّحة بلا مجلدات فرعية،
// عشان تتطابق مع طريقة الرفع على GitHub من الموبايل).
//
// الاستخدام (من نفس مجلد المشروع):
//   node split-data.js data-export.json
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

const outDir = __dirname; // نكتب في نفس مجلد السكربت مباشرة (بنية مسطّحة بلا مجلد data/ فرعي،
                            // عشان تتطابق مع الطريقة اللي بترفع بيها الملفات فعليًا على GitHub)

const byYear = {};
const yearCounts = {};
const typeCounts = {};
const categoryCounts = {};

data.forEach(function(p){
  const year = p.date ? p.date.slice(0,4) : 'unknown';
  (byYear[year] = byYear[year] || []).push(p);
  yearCounts[year] = (yearCounts[year] || 0) + 1;
  // نستخدم القيمة الفعّالة (المصحَّحة إن وُجدت) بدل الأصلية دايمًا — نفس مبدأ الواجهة effectiveType/effectiveCategory
  const effType = p.type_revised || p.type;
  const effCategory = p.category_revised || p.category;
  if(effType) typeCounts[effType] = (typeCounts[effType] || 0) + 1;
  if(effCategory) categoryCounts[effCategory] = (categoryCounts[effCategory] || 0) + 1;
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
console.log('تم بنجاح. راجع ملفات .json الجديدة وارفعها على GitHub بجانب باقي الملفات.');
