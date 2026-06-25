    const STREAM_ENDPOINT = 'https://4voqfpwhf7tiyzxpqcejedrtii0fyhrv.lambda-url.us-east-2.on.aws/';
    const COGNITO_USER_POOL_ID = 'us-east-2_gCTbH7Sek';
    const COGNITO_CLIENT_ID = 'k8bk5a0462fmoobi07k4gplat';
    const poolData = { UserPoolId: COGNITO_USER_POOL_ID, ClientId: COGNITO_CLIENT_ID };
    const userPool = new AmazonCognitoIdentity.CognitoUserPool(poolData);
    let currentUser = null;
    let idToken = null;
    let conversationHistory = [];
    let cognitoUserForPasswordChange = null;
    let userAttributesForPasswordChange = null;
    let basePromptSent = false;
    let examplesSent = false;
    let isSending = false;

    // Load base prompt from hidden script tag (it's above this script in the DOM so it exists)
    const BASE_PROMPT = document.getElementById('base-prompt-data') ? document.getElementById('base-prompt-data').textContent : '';

    // Load examples from hidden script tags
    const EXAMPLES_DATA = {
      schizophrenia: [
        document.getElementById('schiz-ex-1') ? document.getElementById('schiz-ex-1').textContent : '',
        document.getElementById('schiz-ex-2') ? document.getElementById('schiz-ex-2').textContent : ''
      ].filter(x => x),
      ptsd: [
        document.getElementById('ptsd-ex-1') ? document.getElementById('ptsd-ex-1').textContent : '',
        document.getElementById('ptsd-ex-2') ? document.getElementById('ptsd-ex-2').textContent : '',
        document.getElementById('ptsd-ex-3') ? document.getElementById('ptsd-ex-3').textContent : ''
      ].filter(x => x),
      bipolar: [
        document.getElementById('bipolar-ex-1') ? document.getElementById('bipolar-ex-1').textContent : '',
        document.getElementById('bipolar-ex-2') ? document.getElementById('bipolar-ex-2').textContent : ''
      ].filter(x => x)
    };

    window.onload = function() {
      const cognitoUser = userPool.getCurrentUser();
      if (cognitoUser) {
        cognitoUser.getSession((err, session) => {
          if (err || !session.isValid()) return;
          currentUser = cognitoUser;
          idToken = session.getIdToken().getJwtToken();
          showChat(cognitoUser.getUsername());
        });
      }
    };

    function login() {
      const email = document.getElementById('email').value;
      const password = document.getElementById('password').value;
      const errorDiv = document.getElementById('loginError');
      const loginBtn = document.getElementById('loginBtn');
      if (!email || !password) { errorDiv.textContent = 'Please enter both email and password'; errorDiv.style.display = 'block'; return; }
      errorDiv.style.display = 'none';
      loginBtn.disabled = true;
      loginBtn.textContent = 'Signing in...';
      const authDetails = new AmazonCognitoIdentity.AuthenticationDetails({ Username: email, Password: password });
      const cognitoUser = new AmazonCognitoIdentity.CognitoUser({ Username: email, Pool: userPool });
      cognitoUser.authenticateUser(authDetails, {
        onSuccess: function(result) {
          currentUser = cognitoUser;
          idToken = result.getIdToken().getJwtToken();
          loginBtn.disabled = false;
          loginBtn.textContent = 'Sign In';
          showChat(email);
        },
        onFailure: function(err) {
          loginBtn.disabled = false;
          loginBtn.textContent = 'Sign In';
          errorDiv.textContent = err.message || 'Authentication failed';
          errorDiv.style.display = 'block';
        },
        newPasswordRequired: function(userAttributes) {
          cognitoUserForPasswordChange = cognitoUser;
          delete userAttributes.email_verified;
          delete userAttributes.email;
          userAttributesForPasswordChange = userAttributes;
          loginBtn.disabled = false;
          loginBtn.textContent = 'Sign In';
          showPasswordChangeSection();
        }
      });
    }

    function showPasswordChangeSection() {
      document.getElementById('loginSection').style.display = 'none';
      document.getElementById('passwordChangeSection').style.display = 'block';
    }

    function backToLogin() {
      document.getElementById('passwordChangeSection').style.display = 'none';
      document.getElementById('loginSection').style.display = 'block';
    }

    function completeNewPassword() {
      const newPw = document.getElementById('newPassword').value;
      const confirmPw = document.getElementById('confirmPassword').value;
      const errorDiv = document.getElementById('passwordError');
      const btn = document.getElementById('changePasswordBtn');
      if (!newPw || !confirmPw) { errorDiv.textContent = 'Please fill in both fields'; errorDiv.style.display = 'block'; return; }
      if (newPw !== confirmPw) { errorDiv.textContent = 'Passwords do not match'; errorDiv.style.display = 'block'; return; }
      btn.disabled = true;
      btn.textContent = 'Setting password...';
      cognitoUserForPasswordChange.completeNewPasswordChallenge(newPw, userAttributesForPasswordChange, {
        onSuccess: function(result) {
          currentUser = cognitoUserForPasswordChange;
          idToken = result.getIdToken().getJwtToken();
          btn.disabled = false;
          btn.textContent = 'Set Password';
          document.getElementById('passwordChangeSection').style.display = 'none';
          showChat(cognitoUserForPasswordChange.getUsername());
        },
        onFailure: function(err) {
          btn.disabled = false;
          btn.textContent = 'Set Password';
          errorDiv.textContent = err.message;
          errorDiv.style.display = 'block';
        }
      });
    }

    function showChat(email) {
      document.getElementById('loginSection').style.display = 'none';
      document.getElementById('chatSection').style.display = 'flex';
      document.getElementById('userEmail').textContent = 'Logged in as: ' + email;
      conversationHistory = [];
      updateToolbarStatus();
    }

    function logout() {
      if (currentUser) currentUser.signOut();
      currentUser = null; idToken = null; conversationHistory = [];
      basePromptSent = false; examplesSent = false;
      updateToolbarStatus();
      document.getElementById('chatSection').style.display = 'none';
      document.getElementById('loginSection').style.display = 'block';
      document.getElementById('chatContainer').innerHTML = '<div class="message assistant">Welcome! Use the toolbar below to set up your session.</div>';
      document.getElementById('diagnosisSelect').value = '';
    }

    function resetConversation() {
      conversationHistory = [];
      basePromptSent = false; examplesSent = false;
      updateToolbarStatus();
      document.getElementById('chatContainer').innerHTML = '<div class="message assistant">Session reset. Use the toolbar to start again.</div>';
      document.getElementById('diagnosisSelect').value = '';
    }

    function updateToolbarStatus() {
      document.getElementById('basePromptStatus').textContent = basePromptSent ? 'Sent' : 'Not Sent';
      document.getElementById('basePromptStatus').className = 'status-badge ' + (basePromptSent ? 'active' : 'inactive');
      document.getElementById('insertBasePromptBtn').disabled = basePromptSent;
      document.getElementById('examplesStatus').textContent = examplesSent ? 'Sent' : 'Not Sent';
      document.getElementById('examplesStatus').className = 'status-badge ' + (examplesSent ? 'active' : 'inactive');
      document.getElementById('insertExamplesBtn').disabled = examplesSent;
    }

    async function insertBasePrompt() {
      if (basePromptSent || isSending) return;
      if (!BASE_PROMPT) { alert('Error: Base prompt data not found.'); return; }
      await sendProgrammaticMessage(BASE_PROMPT, 'Base prompt sent');
      basePromptSent = true;
      updateToolbarStatus();
    }

    async function insertExamples() {
      if (examplesSent || isSending) return;
      const diagnosis = document.getElementById('diagnosisSelect').value;
      if (!diagnosis) { alert('Please select a disorder category first.'); return; }
      if (!basePromptSent) { alert('Please insert the base prompt first (Step 1).'); return; }
      const examples = EXAMPLES_DATA[diagnosis];
      if (!examples || examples.length === 0) { alert('No examples found for this diagnosis.'); return; }
      // Send examples one at a time to avoid size limits
      for (let i = 0; i < examples.length; i++) {
        await sendProgrammaticMessage(examples[i], 'Example ' + (i + 1) + ' of ' + examples.length + ' sent');
      }
      examplesSent = true;
      updateToolbarStatus();
    }
    async function sendProgrammaticMessage(text, statusLabel) {
      if (!currentUser || !idToken) { alert('Session expired.'); logout(); return; }
      isSending = true;
      const chatContainer = document.getElementById('chatContainer');
      const loading = document.getElementById('loading');
      const sysDiv = document.createElement('div');
      sysDiv.className = 'message system';
      sysDiv.textContent = statusLabel || 'Auto-sending...';
      chatContainer.appendChild(sysDiv);
      const userDiv = document.createElement('div');
      userDiv.className = 'message user auto-sent';
      userDiv.textContent = text.length > 200 ? text.substring(0, 200) + '... [' + text.length + ' chars]' : text;
      chatContainer.appendChild(userDiv);
      chatContainer.scrollTop = chatContainer.scrollHeight;
      loading.style.display = 'block';
      const assistantDiv = document.createElement('div');
      assistantDiv.className = 'message assistant';
      assistantDiv.innerHTML = '';
      chatContainer.appendChild(assistantDiv);
      let fullText = '';
      try {
        const response = await fetch(STREAM_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': idToken },
          body: JSON.stringify({ message: text, conversationHistory: conversationHistory })
        });
        loading.style.display = 'none';
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n\n');
          buffer = lines.pop();
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.type === 'delta') { fullText += data.text; assistantDiv.innerHTML = marked.parse(fullText); chatContainer.scrollTop = chatContainer.scrollHeight; }
                else if (data.type === 'done') { conversationHistory = data.updatedHistory; }
                else if (data.type === 'error') { assistantDiv.textContent = 'Error: ' + data.error; }
              } catch (e) { }
            }
          }
        }
        if (!fullText) { assistantDiv.textContent = 'No response received.'; }
      } catch (error) { loading.style.display = 'none'; assistantDiv.textContent = 'Error connecting to server.'; }
      chatContainer.scrollTop = chatContainer.scrollHeight;
      isSending = false;
    }

    async function sendMessage() {
      if (!currentUser || !idToken) { alert('Session expired.'); logout(); return; }
      if (isSending) return;
      const input = document.getElementById('messageInput');
      const message = input.value.trim();
      if (!message) return;
      isSending = true;
      const chatContainer = document.getElementById('chatContainer');
      const loading = document.getElementById('loading');
      const userDiv = document.createElement('div');
      userDiv.className = 'message user';
      userDiv.textContent = message;
      chatContainer.appendChild(userDiv);
      input.value = '';
      chatContainer.scrollTop = chatContainer.scrollHeight;
      loading.style.display = 'block';
      const assistantDiv = document.createElement('div');
      assistantDiv.className = 'message assistant';
      assistantDiv.innerHTML = '';
      chatContainer.appendChild(assistantDiv);
      let fullText = '';
      try {
        const response = await fetch(STREAM_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': idToken },
          body: JSON.stringify({ message: message, conversationHistory: conversationHistory })
        });
        loading.style.display = 'none';
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n\n');
          buffer = lines.pop();
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.type === 'delta') { fullText += data.text; assistantDiv.innerHTML = marked.parse(fullText); chatContainer.scrollTop = chatContainer.scrollHeight; }
                else if (data.type === 'done') { conversationHistory = data.updatedHistory; }
                else if (data.type === 'error') { assistantDiv.textContent = 'Error: ' + data.error; }
              } catch (e) { }
            }
          }
        }
        if (!fullText) { assistantDiv.textContent = 'No response received.'; }
      } catch (error) { loading.style.display = 'none'; assistantDiv.textContent = 'Error connecting to server.'; }
      chatContainer.scrollTop = chatContainer.scrollHeight;
      isSending = false;
    }
