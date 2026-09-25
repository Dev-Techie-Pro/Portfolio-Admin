import LegacyBody from '@/components/LegacyBody';
import { BODY_HTML } from './bodyHtml';

export const metadata = { title: 'Portfolio Admin — Sign In' };

export default function Page() {
  return <LegacyBody html={BODY_HTML} authBody={true} needsCanvasJs={false} />;
}
