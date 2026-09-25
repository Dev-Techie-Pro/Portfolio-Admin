import LegacyBody from '@/components/LegacyBody';
import { ADD_USER_PANEL_HTML } from '@/app/addUserPanelHtml';
import { BODY_HTML } from './bodyHtml';

export const metadata = { title: 'Portfolio Admin — Experience' };

export default function Page() {
  return <LegacyBody html={BODY_HTML + ADD_USER_PANEL_HTML} authBody={false} needsCanvasJs={false} />;
}
