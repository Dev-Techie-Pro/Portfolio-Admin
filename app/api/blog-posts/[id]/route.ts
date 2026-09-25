import { getBlogPostByLegacyId } from '@/lib/cms/repository';
import { withStaffGet } from '@/lib/api/with-staff-get';

export async function GET(_request, { params }) {
  return withStaffGet(async () => {
    const post = await getBlogPostByLegacyId(params.id);
    if (!post) {
      const error = new Error('Blog post not found.');
      error.status = 404;
      throw error;
    }
    return post;
  });
}
