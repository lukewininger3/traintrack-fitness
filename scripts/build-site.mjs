// Builds the public website (privacy policy, terms, support) into site/ from
// the in-app screens, so the App Store URLs always match the app.
//
//   node scripts/build-site.mjs
//
// The site/ folder is published from a separate public GitHub repo
// (GitHub Pages doesn't work on private repos on the free plan).

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, 'site');
const SUPPORT_EMAIL = 'traintrack.app.support@gmail.com';

// Turn the JSX body of a policy screen into HTML
function screenToHtml(file) {
  const src = fs.readFileSync(path.join(root, file), 'utf8');
  let body = src.slice(src.indexOf('<ScrollView'), src.indexOf('<View style={styles.bottomSpacer}'));
  body = body.slice(body.indexOf('>') + 1);

  body = body
    .replace(/<Text style=\{\[styles\.lastUpdated[^>]*>([\s\S]*?)<\/Text>/, '<p class="updated">$1</p>')
    .replace(/<Section title="([^"]+)"[^>]*>/g, '<h2>$1</h2>')
    .replace(/<\/Section>/g, '')
    .replace(/<Paragraph[^>]*>/g, '<p>')
    .replace(/<\/Paragraph>/g, '</p>')
    .replace(/<BulletPoint[^>]*>/g, '<li>')
    .replace(/<\/BulletPoint>/g, '</li>')
    .replace(/\s+/g, ' ')
    .replace(/((?:<li>.*?<\/li>\s*)+)/g, '<ul>$1</ul>')
    .replace(/>\s+</g, '><')
    .replace(/<(h2|p|li|ul)>\s+/g, '<$1>')
    .replace(/\s+<\/(h2|p|li|ul)>/g, '</$1>')
    .replace(new RegExp(SUPPORT_EMAIL.replace(/\./g, '\\.'), 'g'), `<a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a>`)
    .replace(/<\/(h2|p|ul)>/g, '</$1>\n');

  if (/[{}]|<[A-Z]/.test(body)) {
    throw new Error(`${file}: unconverted JSX left in output:\n${body.match(/.*(?:[{}]|<[A-Z]).*/)[0]}`);
  }
  return body;
}

const page = (title, content) => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title} · TrainTrack</title>
<style>
  :root { color-scheme: light dark; --bg: #ffffff; --text: #1a1a1a; --muted: #666; --accent: #2f7d4f; --line: #e5e5e5; }
  @media (prefers-color-scheme: dark) { :root { --bg: #0a0a0a; --text: #f2f2f2; --muted: #9a9a9a; --accent: #5fd08b; --line: #262626; } }
  body { margin: 0; background: var(--bg); color: var(--text); font: 16px/1.6 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
  main { max-width: 720px; margin: 0 auto; padding: 32px 20px 64px; }
  nav { display: flex; gap: 20px; flex-wrap: wrap; padding-bottom: 16px; border-bottom: 1px solid var(--line); margin-bottom: 24px; }
  nav a { color: var(--muted); text-decoration: none; font-weight: 500; }
  nav a.brand { color: var(--text); font-weight: 700; margin-right: auto; }
  h1 { font-size: 28px; margin: 0 0 4px; }
  h2 { font-size: 19px; margin: 32px 0 8px; }
  .updated { color: var(--muted); font-size: 14px; margin-top: 0; }
  a { color: var(--accent); }
  ul { padding-left: 22px; }
  li { margin: 6px 0; }
  .card { border: 1px solid var(--line); border-radius: 12px; padding: 16px 20px; margin: 16px 0; }
</style>
</head>
<body>
<main>
<nav><a class="brand" href="./">TrainTrack</a><a href="support.html">Support</a><a href="privacy.html">Privacy</a><a href="terms.html">Terms</a></nav>
<h1>${title}</h1>
${content}
</main>
</body>
</html>
`;

const support = `<p>Need help with TrainTrack, found a bug, or want to report a user? We're here to help.</p>

<div class="card">
<h2 style="margin-top:0">Contact us</h2>
<p>Email <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a>. We usually reply within 1–2 days.</p>
<p>You can also send feedback from inside the app: <strong>Settings &gt; Send Feedback</strong>.</p>
</div>

<h2>Report a user or comment</h2>
<p>Open the user's profile and tap <strong>⋯ &gt; Report User</strong>, or press and hold a comment and choose <strong>Report Comment</strong>. We review every report within 24 hours. You can also block a user from the same menus, and manage blocked users in <strong>Settings &gt; Blocked Users</strong>.</p>

<h2>Delete your account</h2>
<p>Go to <strong>Settings &gt; Delete Account</strong>. This permanently deletes your account and all of your data right away. If you can't sign in, email us from the address on your account and we'll delete it for you.</p>

<h2>Export your data</h2>
<p>Go to <strong>Settings &gt; Export Workout Data</strong>.</p>

<h2>Forgot your password?</h2>
<p>On the sign-in screen, tap <strong>Forgot Password?</strong> and we'll email you a reset link.</p>
`;

const index = `<p>TrainTrack is a free workout tracker: log workouts, track personal records and body weight, set weekly goals, and share your training with friends.</p>
<ul>
<li><a href="support.html">Support</a></li>
<li><a href="privacy.html">Privacy Policy</a></li>
<li><a href="terms.html">Terms of Service</a></li>
</ul>
`;

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'index.html'), page('TrainTrack', index));
fs.writeFileSync(path.join(outDir, 'support.html'), page('Support', support));
fs.writeFileSync(path.join(outDir, 'privacy.html'), page('Privacy Policy', screenToHtml('app/privacy-policy.js')));
fs.writeFileSync(path.join(outDir, 'terms.html'), page('Terms of Service', screenToHtml('app/terms-of-service.js')));
console.log('Built site/: index.html, support.html, privacy.html, terms.html');
