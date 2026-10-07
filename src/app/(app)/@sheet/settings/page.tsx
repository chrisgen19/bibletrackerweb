/**
 * No sheet over settings. A slot keeps its last page during client navigation, so each
 * of the app's other routes needs an empty one here, or an open day sheet would follow
 * the reader. They are listed one by one rather than with a catch-all: a catch-all also
 * matches unknown URLs, pulling them into this layout and its loading screen, which
 * turns their 404 into a 200.
 */
export default function NoSheet() {
  return null;
}
