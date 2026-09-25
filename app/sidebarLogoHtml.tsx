/** Inline sidebar logo: pixel SVG + wordmark (colors via CSS variables). */
export const SIDEBAR_LOGO_HTML = `<a href="/" class="pa-logo-link" aria-label="Portfolio Dashboard home">
  <div class="pa-logo">
    <div class="pa-logo-icon" aria-hidden="true">
      <svg class="pa-logo-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96" shape-rendering="crispEdges">
        <rect class="pa-logo-svg-bg" width="96" height="96"/>
        <g class="pa-logo-svg-mark" id="logo">
          <rect x="11" y="22" width="4" height="3"/>
          <rect x="11" y="29" width="3" height="4"/>
          <rect x="12" y="21" width="2" height="1"/>
          <rect x="14" y="26" width="4" height="2"/>
          <rect x="15" y="25" width="3" height="1"/>
          <rect x="15" y="28" width="3" height="1"/>
          <rect x="18" y="29" width="4" height="3"/>
          <rect x="18" y="32" width="31" height="1"/>
          <rect x="18" y="33" width="32" height="1"/>
          <rect x="18" y="34" width="33" height="1"/>
          <rect x="18" y="35" width="34" height="1"/>
          <rect x="18" y="36" width="35" height="1"/>
          <rect x="18" y="45" width="35" height="2"/>
          <rect x="18" y="47" width="34" height="1"/>
          <rect x="18" y="48" width="32" height="2"/>
          <rect x="18" y="50" width="30" height="1"/>
          <rect x="18" y="51" width="29" height="1"/>
          <rect x="18" y="52" width="28" height="1"/>
          <rect x="18" y="53" width="8" height="11"/>
          <rect x="18" y="64" width="6" height="1"/>
          <rect x="18" y="65" width="5" height="1"/>
          <rect x="18" y="66" width="4" height="1"/>
          <rect x="18" y="67" width="2" height="1"/>
          <rect x="18" y="68" width="1" height="1"/>
          <rect x="21" y="26" width="4" height="3"/>
          <rect x="22" y="25" width="2" height="1"/>
          <rect x="25" y="29" width="20" height="1"/>
          <rect x="25" y="30" width="22" height="1"/>
          <rect x="25" y="31" width="23" height="1"/>
          <rect x="36" y="67" width="36" height="1"/>
          <rect x="37" y="66" width="38" height="1"/>
          <rect x="38" y="65" width="39" height="1"/>
          <rect x="39" y="64" width="40" height="1"/>
          <rect x="40" y="63" width="40" height="1"/>
          <rect x="41" y="62" width="40" height="1"/>
          <rect x="42" y="37" width="12" height="1"/>
          <rect x="42" y="61" width="40" height="1"/>
          <rect x="43" y="38" width="12" height="1"/>
          <rect x="43" y="44" width="12" height="1"/>
          <rect x="43" y="60" width="40" height="1"/>
          <rect x="44" y="43" width="12" height="1"/>
          <rect x="44" y="59" width="4" height="1"/>
          <rect x="45" y="39" width="11" height="1"/>
          <rect x="45" y="42" width="11" height="1"/>
          <rect x="45" y="58" width="3" height="1"/>
          <rect x="46" y="40" width="11" height="1"/>
          <rect x="46" y="41" width="12" height="1"/>
          <rect x="46" y="57" width="2" height="1"/>
          <rect x="47" y="56" width="1" height="1"/>
          <rect x="50" y="29" width="24" height="1"/>
          <rect x="51" y="30" width="25" height="1"/>
          <rect x="52" y="31" width="26" height="1"/>
          <rect x="53" y="32" width="26" height="1"/>
          <rect x="54" y="33" width="26" height="1"/>
          <rect x="55" y="34" width="26" height="1"/>
          <rect x="56" y="35" width="26" height="1"/>
          <rect x="56" y="53" width="3" height="1"/>
          <rect x="56" y="54" width="4" height="4"/>
          <rect x="56" y="58" width="3" height="1"/>
          <rect x="57" y="36" width="26" height="1"/>
          <rect x="61" y="48" width="4" height="1"/>
          <rect x="61" y="49" width="5" height="9"/>
          <rect x="61" y="58" width="4" height="1"/>
          <rect x="67" y="42" width="5" height="16"/>
          <rect x="67" y="58" width="4" height="1"/>
          <rect x="68" y="41" width="3" height="1"/>
          <rect x="70" y="59" width="13" height="1"/>
          <rect x="71" y="37" width="13" height="1"/>
          <rect x="73" y="38" width="11" height="1"/>
          <rect x="73" y="58" width="11" height="1"/>
          <rect x="74" y="39" width="11" height="1"/>
          <rect x="74" y="57" width="11" height="1"/>
          <rect x="75" y="40" width="10" height="1"/>
          <rect x="75" y="56" width="10" height="1"/>
          <rect x="76" y="41" width="10" height="1"/>
          <rect x="76" y="55" width="9" height="1"/>
          <rect x="77" y="42" width="9" height="2"/>
          <rect x="77" y="53" width="9" height="2"/>
          <rect x="78" y="44" width="8" height="2"/>
          <rect x="78" y="46" width="9" height="4"/>
          <rect x="78" y="50" width="8" height="3"/>
        </g>
      </svg>
    </div>
    <div class="pa-logo-copy">
      <span class="pa-logo-title">Portfolio</span>
      <span class="pa-logo-tagline">Dashboard</span>
    </div>
  </div>
</a>`;

/** Auth brand panel logo — same mark + wordmark as sidebar (no link wrapper). */
export const AUTH_LOGO_HTML = `<div class="pa-auth-logo">
  <div class="pa-logo pa-logo--auth">
    <div class="pa-logo-icon" aria-hidden="true">
      <svg class="pa-logo-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96" shape-rendering="crispEdges">
        <rect class="pa-logo-svg-bg" width="96" height="96"/>
        <g class="pa-logo-svg-mark" id="logo">
          <rect x="11" y="22" width="4" height="3"/>
          <rect x="11" y="29" width="3" height="4"/>
          <rect x="12" y="21" width="2" height="1"/>
          <rect x="14" y="26" width="4" height="2"/>
          <rect x="15" y="25" width="3" height="1"/>
          <rect x="15" y="28" width="3" height="1"/>
          <rect x="18" y="29" width="4" height="3"/>
          <rect x="18" y="32" width="31" height="1"/>
          <rect x="18" y="33" width="32" height="1"/>
          <rect x="18" y="34" width="33" height="1"/>
          <rect x="18" y="35" width="34" height="1"/>
          <rect x="18" y="36" width="35" height="1"/>
          <rect x="18" y="45" width="35" height="2"/>
          <rect x="18" y="47" width="34" height="1"/>
          <rect x="18" y="48" width="32" height="2"/>
          <rect x="18" y="50" width="30" height="1"/>
          <rect x="18" y="51" width="29" height="1"/>
          <rect x="18" y="52" width="28" height="1"/>
          <rect x="18" y="53" width="8" height="11"/>
          <rect x="18" y="64" width="6" height="1"/>
          <rect x="18" y="65" width="5" height="1"/>
          <rect x="18" y="66" width="4" height="1"/>
          <rect x="18" y="67" width="2" height="1"/>
          <rect x="18" y="68" width="1" height="1"/>
          <rect x="21" y="26" width="4" height="3"/>
          <rect x="22" y="25" width="2" height="1"/>
          <rect x="25" y="29" width="20" height="1"/>
          <rect x="25" y="30" width="22" height="1"/>
          <rect x="25" y="31" width="23" height="1"/>
          <rect x="36" y="67" width="36" height="1"/>
          <rect x="37" y="66" width="38" height="1"/>
          <rect x="38" y="65" width="39" height="1"/>
          <rect x="39" y="64" width="40" height="1"/>
          <rect x="40" y="63" width="40" height="1"/>
          <rect x="41" y="62" width="40" height="1"/>
          <rect x="42" y="37" width="12" height="1"/>
          <rect x="42" y="61" width="40" height="1"/>
          <rect x="43" y="38" width="12" height="1"/>
          <rect x="43" y="44" width="12" height="1"/>
          <rect x="43" y="60" width="40" height="1"/>
          <rect x="44" y="43" width="12" height="1"/>
          <rect x="44" y="59" width="4" height="1"/>
          <rect x="45" y="39" width="11" height="1"/>
          <rect x="45" y="42" width="11" height="1"/>
          <rect x="45" y="58" width="3" height="1"/>
          <rect x="46" y="40" width="11" height="1"/>
          <rect x="46" y="41" width="12" height="1"/>
          <rect x="46" y="57" width="2" height="1"/>
          <rect x="47" y="56" width="1" height="1"/>
          <rect x="50" y="29" width="24" height="1"/>
          <rect x="51" y="30" width="25" height="1"/>
          <rect x="52" y="31" width="26" height="1"/>
          <rect x="53" y="32" width="26" height="1"/>
          <rect x="54" y="33" width="26" height="1"/>
          <rect x="55" y="34" width="26" height="1"/>
          <rect x="56" y="35" width="26" height="1"/>
          <rect x="56" y="53" width="3" height="1"/>
          <rect x="56" y="54" width="4" height="4"/>
          <rect x="56" y="58" width="3" height="1"/>
          <rect x="57" y="36" width="26" height="1"/>
          <rect x="61" y="48" width="4" height="1"/>
          <rect x="61" y="49" width="5" height="9"/>
          <rect x="61" y="58" width="4" height="1"/>
          <rect x="67" y="42" width="5" height="16"/>
          <rect x="67" y="58" width="4" height="1"/>
          <rect x="68" y="41" width="3" height="1"/>
          <rect x="70" y="59" width="13" height="1"/>
          <rect x="71" y="37" width="13" height="1"/>
          <rect x="73" y="38" width="11" height="1"/>
          <rect x="73" y="58" width="11" height="1"/>
          <rect x="74" y="39" width="11" height="1"/>
          <rect x="74" y="57" width="11" height="1"/>
          <rect x="75" y="40" width="10" height="1"/>
          <rect x="75" y="56" width="10" height="1"/>
          <rect x="76" y="41" width="10" height="1"/>
          <rect x="76" y="55" width="9" height="1"/>
          <rect x="77" y="42" width="9" height="2"/>
          <rect x="77" y="53" width="9" height="2"/>
          <rect x="78" y="44" width="8" height="2"/>
          <rect x="78" y="46" width="9" height="4"/>
          <rect x="78" y="50" width="8" height="3"/>
        </g>
      </svg>
    </div>
    <div class="pa-logo-copy">
      <span class="pa-logo-title">Portfolio</span>
      <span class="pa-logo-tagline">Dashboard</span>
    </div>
  </div>
</div>`;
