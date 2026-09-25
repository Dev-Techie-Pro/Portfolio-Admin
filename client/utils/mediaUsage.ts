import { storage } from '../core/StorageService.js';

function pushMatch(matches, seen, entry) {
  const key = `${entry.type}|${entry.label}|${entry.detail || ''}`;
  if (seen.has(key)) return;
  seen.add(key);
  matches.push(entry);
}

function urlMatches(recordUrl, targetUrl) {
  if (!recordUrl || !targetUrl) return false;
  return recordUrl === targetUrl;
}

/**
 * Find portfolio records that reference a media file URL.
 */
export async function findMediaUsage(url) {
  if (!url) return [];

  const [projects, testimonials, blogPosts, contactMessages] = await Promise.all([
    storage.get('pa_projects', []),
    storage.get('pa_testimonials', []),
    storage.get('pa_blog_posts', []),
    storage.get('pa_contact_messages', []),
  ]);

  const matches = [];
  const seen = new Set();

  if (Array.isArray(projects)) {
    projects.forEach((p) => {
      if (urlMatches(p.bannerImgUrl, url) || urlMatches(p.imageUrl, url)) {
        pushMatch(matches, seen, {
          type: 'Project',
          label: p.title || 'Untitled project',
          detail: 'Featured image',
          path: '/projects',
          icon: 'ri-apps-line',
        });
      }
      if (Array.isArray(p.gallery)) {
        p.gallery.forEach((g, i) => {
          const gUrl = typeof g === 'string' ? g : g?.url;
          if (urlMatches(gUrl, url)) {
            pushMatch(matches, seen, {
              type: 'Project',
              label: p.title || 'Untitled project',
              detail: `Gallery image ${i + 1}`,
              path: '/projects',
              icon: 'ri-gallery-line',
            });
          }
        });
      }
    });
  }

  if (Array.isArray(testimonials)) {
    testimonials.forEach((t) => {
      if (urlMatches(t.imageUrl, url)) {
        pushMatch(matches, seen, {
          type: 'Testimonial',
          label: t.name || 'Untitled testimonial',
          detail: 'Avatar image',
          path: '/testimonials',
          icon: 'ri-chat-quote-line',
        });
      }
    });
  }

  if (Array.isArray(blogPosts)) {
    blogPosts.forEach((b) => {
      if (urlMatches(b.imageUrl, url)) {
        pushMatch(matches, seen, {
          type: 'Blog Post',
          label: b.title || 'Untitled post',
          detail: 'Cover image',
          path: '/blog-post',
          icon: 'ri-article-line',
        });
      }
    });
  }

  if (Array.isArray(contactMessages)) {
    contactMessages.forEach((message) => {
      const label = message.name || message.subject || 'Contact message';
      const replies = Array.isArray(message.replies) ? message.replies : [];
      replies.forEach((reply, index) => {
        if (!urlMatches(reply.attachmentUrl, url)) return;
        pushMatch(matches, seen, {
          type: 'Contact Reply',
          label,
          detail: `Reply attachment ${index + 1}`,
          path: '/contact-messages',
          icon: 'ri-mail-line',
        });
      });
    });
  }

  return matches;
}
