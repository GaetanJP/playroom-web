// Site configuration. Everything here is public: it ships to every visitor's browser.
// Never put a secret (Supabase service-role key, database password, API secret) in this file.
window.PLAYROOM_CONFIG = {
    // App Store listing. Leave empty until the app is live: the badge then reads
    // "Coming soon" and scrolls to the updates form instead of linking out.
    appStoreUrl: '',

    // Google Apps Script web app that appends sign-ups to a Google Sheet
    // (see google-apps-script.js and README.md). Same setup as book-web.
    signupUrl: 'YOUR_GOOGLE_SCRIPT_URL_HERE',

    supportEmail: 'byldforfun@gmail.com',
};
