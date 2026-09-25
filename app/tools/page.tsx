export const metadata = { title: 'Portfolio Admin — Tools' };

import LegacyBody from '@/components/LegacyBody';
import { ADD_USER_PANEL_HTML } from '@/app/addUserPanelHtml';
import { ICON_PICKER_PANEL_HTML } from '@/app/iconPickerPanelHtml';
import { BODY_HTML } from './bodyHtml';

export default function Page() {
  return <LegacyBody html={BODY_HTML + ICON_PICKER_PANEL_HTML + ADD_USER_PANEL_HTML} authBody={false} needsCanvasJs={false} />;
}
