-- Allow documents and fonts in the media bucket (contact replies, custom fonts).

update storage.buckets
set allowed_mime_types = array[
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/svg+xml',
  'application/pdf',
  'text/plain',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/zip',
  'application/x-zip-compressed',
  'font/woff',
  'font/woff2',
  'application/font-woff',
  'application/font-woff2',
  'application/octet-stream'
]
where id = 'media';
