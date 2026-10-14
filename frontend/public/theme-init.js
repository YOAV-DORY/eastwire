// Apply the saved theme before first paint (key shared with src/hooks/useTheme.ts).
// A file rather than an inline script, so the Content-Security-Policy needs no 'unsafe-inline'.
;(function () {
  var theme = 'dark'
  try {
    var saved = localStorage.getItem('eastwire.theme')
    if (saved === 'light' || saved === 'dark') theme = saved
  } catch {
    // Storage can be blocked (private mode); dark stays the default.
  }
  document.documentElement.setAttribute('data-theme', theme)
})()
