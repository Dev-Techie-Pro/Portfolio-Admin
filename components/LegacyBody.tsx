import LegacyBoot from './LegacyBoot';
import LegacyHtml from './LegacyHtml';

/**
 * LegacyBody — renders one page's original body markup on the server, then
 * boots the vanilla module system via LegacyBoot (client-only).
 */
export default function LegacyBody({ html, authBody = false, needsCanvasJs = false }) {
  return (
    <>
      <LegacyHtml html={html} />
      <LegacyBoot authBody={authBody} needsCanvasJs={needsCanvasJs} />
    </>
  );
}
