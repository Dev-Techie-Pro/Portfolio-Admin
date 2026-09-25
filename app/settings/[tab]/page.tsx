import LegacyBody from '@/components/LegacyBody';
import { ADD_USER_PANEL_HTML } from '@/app/addUserPanelHtml';
import { CUSTOM_PANEL_HTML } from '@/app/customPanelHtml';
import { BODY_HTML } from '../bodyHtml';
import { getSettingsPageMeta, resolveSettingsTab, SETTINGS_TABS } from '@/lib/settings/page-meta';

export async function generateMetadata({ params }) {
  const tab = resolveSettingsTab(params?.tab);
  const meta = getSettingsPageMeta(tab);
  return { title: `Portfolio Admin — ${meta.title}` };
}

export function generateStaticParams() {
  return SETTINGS_TABS.map((tab) => ({ tab }));
}

export default function SettingsTabPage() {
  return (
    <LegacyBody
      html={BODY_HTML + ADD_USER_PANEL_HTML + CUSTOM_PANEL_HTML}
      authBody={false}
    />
  );
}
