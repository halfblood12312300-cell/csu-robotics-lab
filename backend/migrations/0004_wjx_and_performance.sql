-- One-time content update requested by the site owner. Keep registrationOpen, deadline,
-- existing form fields, articles, applications, and all unrelated settings unchanged.
INSERT OR IGNORE INTO settings (id,value) VALUES ('site','{}');

UPDATE settings
SET value = json_set(value,
  '$.registration', json_patch(COALESCE(json_extract(value,'$.registration'),'{}'), json_object(
    'mode','external',
    'externalUrl','https://www.wjx.top/vm/rbkF28c.aspx#',
    'externalButton','前往问卷星报名',
    'externalNote','请在问卷星中填写并提交报名信息，无需在本站重复填写。',
    'version',COALESCE(json_extract(value,'$.registration.version'),1)+1
  )),
  '$.revision',COALESCE(json_extract(value,'$.revision'),0)+1
)
WHERE id='site';

-- When the list was never explicitly stored, the new application defaults already
-- contain all three projects. Preserve existing edited lists and append only once.
UPDATE settings
SET value=json_insert(value,'$.home.projects.items[#]',json('{"id":"robot-performance","enabled":true,"kind":"拟开展项目 · 03","title":"机器人表演","subtitle":"","count":"","unit":"","description":"探索机器人的动作编排、音乐节奏配合与互动展示，逐步开展适合校园活动的表演实践。","image":"","imageAlt":"","link":{"label":"了解更多","href":"","enabled":false}}'))
WHERE id='site'
  AND json_type(value,'$.home.projects.items')='array'
  AND json_array_length(value,'$.home.projects.items') < 16
  AND NOT EXISTS (
    SELECT 1 FROM json_each(settings.value,'$.home.projects.items')
    WHERE json_extract(json_each.value,'$.id')='robot-performance'
  );

-- Keep custom column counts except for the original two-card layout.
UPDATE settings SET value=json_set(value,'$.home.projects.columns',3)
WHERE id='site' AND json_extract(value,'$.home.projects.columns')=2
  AND json_array_length(value,'$.home.projects.items')=3
  AND EXISTS (SELECT 1 FROM json_each(settings.value,'$.home.projects.items') WHERE json_extract(json_each.value,'$.id')='museum-guide')
  AND EXISTS (SELECT 1 FROM json_each(settings.value,'$.home.projects.items') WHERE json_extract(json_each.value,'$.id')='robot-delivery')
  AND EXISTS (SELECT 1 FROM json_each(settings.value,'$.home.projects.items') WHERE json_extract(json_each.value,'$.id')='robot-performance');
