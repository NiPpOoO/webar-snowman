/**
 * Simple smoke test: ensure DOM has key elements.
 */
window.addEventListener('load', () => {
  const hasScene = !!document.querySelector('a-scene');
  const hasMarker = !!document.getElementById('marker');
  const hasAssets = !!document.querySelector('a-assets');
  console.log('[test] scene:', hasScene, 'marker:', hasMarker, 'assets:', hasAssets);
});
