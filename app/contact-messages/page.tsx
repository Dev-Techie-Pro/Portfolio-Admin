import LegacyBody from '@/components/LegacyBody';
import { ADD_USER_PANEL_HTML } from '@/app/addUserPanelHtml';
import { MEDIA_PICKER_PANEL_HTML } from '@/app/mediaPickerPanelHtml';
import { BODY_HTML } from './bodyHtml';

export const metadata = { title: 'Portfolio Admin — Contact Messages' };

export default function Page() {
  return (
    <LegacyBody
      html={BODY_HTML + MEDIA_PICKER_PANEL_HTML + ADD_USER_PANEL_HTML}
      authBody={false}
      needsCanvasJs={false}
    />
  );
}
