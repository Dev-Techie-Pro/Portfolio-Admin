import { NextResponse } from 'next/server';
import { getAppearance } from '@/lib/cms/repository';

/** Public read-only appearance (accent/theme) for auth pages and favicon boot. */
export async function GET() {
  try {
    const settings = await getAppearance();
    return NextResponse.json({
      theme: settings.theme,
      accent: settings.accent,
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
