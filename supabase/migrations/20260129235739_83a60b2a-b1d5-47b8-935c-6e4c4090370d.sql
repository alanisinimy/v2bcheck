UPDATE storage.buckets 
SET allowed_mime_types = ARRAY[
  'audio/mpeg', 
  'audio/mp3', 
  'audio/wav', 
  'audio/x-m4a',
  'video/mp4', 
  'video/webm', 
  'application/pdf', 
  'text/csv',
  'text/plain',
  'text/markdown',
  'application/vnd.ms-excel', 
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
]
WHERE name = 'project-files';