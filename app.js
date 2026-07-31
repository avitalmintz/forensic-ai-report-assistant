// ---- Config -----------------------------------------------------------------
// NOTE: the rewritten front end REQUIRES the rewritten Lambda (it sends `mode`).
// On staging, point this at the STAGING Lambda Function URL (public/NONE auth,
// same posture as production). Only switch it to the production URL when promoting.
const STREAM_ENDPOINT = 'https://4voqfpwhf7tiyzxpqcejedrtii0fyhrv.lambda-url.us-east-2.on.aws/';
const COGNITO_USER_POOL_ID = 'us-east-2_gCTbH7Sek';
const COGNITO_CLIENT_ID = 'k8bk5a0462fmoobi07k4gplat';

const userPool = new AmazonCognitoIdentity.CognitoUserPool({
  UserPoolId: COGNITO_USER_POOL_ID, ClientId: COGNITO_CLIENT_ID,
});

let currentUser = null, idToken = null;
let cognitoUserForPasswordChange = null, userAttributesForPasswordChange = null;
let currentMode = 'evaluation';
let isSending = false;
let lastReportText = '';

const $ = (id) => document.getElementById(id);

// ---- Auth (unchanged flow from the original app) -----------------------------
window.onload = function () {
  const u = userPool.getCurrentUser();
  if (u) u.getSession((err, session) => {
    if (err || !session.isValid()) return;
    currentUser = u; idToken = session.getIdToken().getJwtToken();
    showApp(u.getUsername());
  });
};

function login() {
  const email = $('email').value, password = $('password').value;
  const err = $('loginError'), btn = $('loginBtn');
  if (!email || !password) { err.textContent = 'Enter email and password'; err.style.display = 'block'; return; }
  err.style.display = 'none'; btn.disabled = true; btn.textContent = 'Signing in...';
  const details = new AmazonCognitoIdentity.AuthenticationDetails({ Username: email, Password: password });
  const cognitoUser = new AmazonCognitoIdentity.CognitoUser({ Username: email, Pool: userPool });
  cognitoUser.authenticateUser(details, {
    onSuccess: (r) => { currentUser = cognitoUser; idToken = r.getIdToken().getJwtToken(); btn.disabled = false; btn.textContent = 'Sign In'; showApp(email); },
    onFailure: (e) => { btn.disabled = false; btn.textContent = 'Sign In'; err.textContent = e.message || 'Authentication failed'; err.style.display = 'block'; },
    newPasswordRequired: (attrs) => {
      cognitoUserForPasswordChange = cognitoUser;
      delete attrs.email_verified; delete attrs.email;
      userAttributesForPasswordChange = attrs;
      btn.disabled = false; btn.textContent = 'Sign In';
      $('loginSection').style.display = 'none'; $('passwordChangeSection').style.display = 'block';
    },
  });
}

function completeNewPassword() {
  const pw = $('newPassword').value, confirm = $('confirmPassword').value;
  const err = $('passwordError'), btn = $('changePasswordBtn');
  if (!pw || !confirm) { err.textContent = 'Fill in both fields'; err.style.display = 'block'; return; }
  if (pw !== confirm) { err.textContent = 'Passwords do not match'; err.style.display = 'block'; return; }
  btn.disabled = true; btn.textContent = 'Setting...';
  cognitoUserForPasswordChange.completeNewPasswordChallenge(pw, userAttributesForPasswordChange, {
    onSuccess: (r) => { currentUser = cognitoUserForPasswordChange; idToken = r.getIdToken().getJwtToken(); btn.disabled = false; btn.textContent = 'Set Password'; $('passwordChangeSection').style.display = 'none'; showApp(currentUser.getUsername()); },
    onFailure: (e) => { btn.disabled = false; btn.textContent = 'Set Password'; err.textContent = e.message; err.style.display = 'block'; },
  });
}

function backToLogin() { $('passwordChangeSection').style.display = 'none'; $('loginSection').style.display = 'block'; }

function showApp(email) {
  $('loginSection').style.display = 'none';
  $('appSection').style.display = 'flex';
  $('userEmail').textContent = email;
}

function logout() {
  if (currentUser) currentUser.signOut();
  currentUser = null; idToken = null;
  $('appSection').style.display = 'none'; $('loginSection').style.display = 'block';
}

// ---- Mode switching ----------------------------------------------------------
function setMode(mode) {
  currentMode = mode;
  document.querySelectorAll('.mode').forEach(b => b.classList.toggle('active', b.dataset.mode === mode));
  $('panel-evaluation').style.display = mode === 'evaluation' ? 'block' : 'none';
  $('panel-mhc').style.display = mode === 'mhc' ? 'block' : 'none';
}

function resetInputs() {
  ['interviewNotes','mhcNotes'].forEach(id => { if ($(id)) $(id).value = ''; });
}

// ---- Generate ----------------------------------------------------------------
function buildPayload() {
  if (currentMode === 'evaluation') {
    return {
      mode: 'evaluation',
      inputs: { interviewNotes: $('interviewNotes').value },
    };
  }
  return {
    mode: 'mhc', subtype: $('disorder').value, message: $('mhcNotes').value,
  };
}

async function generate() {
  if (isSending) return;
  if (!currentUser || !idToken) { alert('Session expired.'); logout(); return; }
  const payload = buildPayload();
  const notesEmpty = currentMode === 'evaluation' ? !payload.inputs.interviewNotes.trim() : !payload.message.trim();
  if (notesEmpty) { alert('Please paste the evaluation notes first.'); return; }

  isSending = true;
  $('generateBtn').disabled = true; $('generateBtn').textContent = 'Generating...';
  $('loading').style.display = 'block';
  const report = $('report'); report.classList.remove('placeholder'); report.innerHTML = '';
  $('copyBtn').disabled = true; $('docxBtn').disabled = true;
  lastReportText = '';

  try {
    // Public function URL (AuthType NONE) — a plain POST, no request signing needed.
    const response = await fetch(STREAM_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    $('loading').style.display = 'none';
    if (!response.ok) {
      const t = await response.text().catch(() => '');
      report.textContent = `Server error ${response.status}. ${t.slice(0, 400)}`;
      isSending = false; $('generateBtn').disabled = false; $('generateBtn').textContent = 'Generate Report';
      return;
    }
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '', gotError = false;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n\n'); buffer = lines.pop();
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        try {
          const data = JSON.parse(line.slice(6));
          if (data.type === 'delta') { lastReportText += data.text; report.innerHTML = marked.parse(lastReportText); report.scrollTop = report.scrollHeight; }
          else if (data.type === 'error') { gotError = true; report.textContent = 'Error: ' + data.error; }
        } catch (e) {}
      }
    }
    if (lastReportText) { $('copyBtn').disabled = false; $('docxBtn').disabled = false; }
    else if (!gotError) report.textContent = 'No response received.';
  } catch (e) {
    $('loading').style.display = 'none';
    report.textContent = 'Error connecting to server.';
  }
  isSending = false;
  $('generateBtn').disabled = false; $('generateBtn').textContent = 'Generate Report';
}

// ---- Output actions ----------------------------------------------------------
function copyReport() {
  navigator.clipboard.writeText(lastReportText).then(() => {
    const b = $('copyBtn'); const t = b.textContent; b.textContent = 'Copied'; setTimeout(() => b.textContent = t, 1200);
  });
}

// Word-openable .doc export (HTML wrapped with the MS Word MIME type).
function downloadDocx() {
  if (!lastReportText) return;
  const rendered = marked.parse(lastReportText);
  const html =
    `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">` +
    `<head><meta charset="utf-8"><style>body{font-family:'Times New Roman',serif;font-size:12pt;line-height:1.5}h1,h2,h3{font-weight:bold}</style></head>` +
    `<body>${rendered}</body></html>`;
  const blob = new Blob(['﻿', html], { type: 'application/msword' });
  const name = 'Forensic Report';
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = name + '.doc';
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(a.href);
}
