import { brandCss } from "@/lib/brand";

// Applies the saved brand colour on top of the theme. Renders nothing when the default theme is in use.
// The colour is checked by brandCss before it goes into the style tag.
export function BrandStyle({ color }) {
  const css = brandCss(color);
  if (!css) return null;
  return <style dangerouslySetInnerHTML={{ __html: css }} />;
}
