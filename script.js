let vault = [];
let attemptCount = 0;
const MAX_ATTEMPTS = 3;
const LOCKOUT_TIME = 300000; // 5 minutes in milliseconds
let lastAttemptTime = 0;

function validatePassword(password) {
  if (password.length < 12) return "Password must be at least 12 characters long";
  if (!/[A-Z]/.test(password)) return "Password must contain uppercase letters";
  if (!/[a-z]/.test(password)) return "Password must contain lowercase letters";
  if (!/[0-9]/.test(password)) return "Password must contain numbers";
  if (!/[^A-Za-z0-9]/.test(password)) return "Password must contain special characters";
  return null;
}

function deriveKey(password, salt) {
  return CryptoJS.PBKDF2(password, salt, {
    keySize: 256/32,
    iterations: 10000
  }).toString();
}

function authenticate() {
  const password = document.getElementById('masterPassword').value;
  const currentTime = Date.now();
  
  if (currentTime - lastAttemptTime < LOCKOUT_TIME && attemptCount >= MAX_ATTEMPTS) {
    alert(`Too many attempts. Please try again in ${Math.ceil((LOCKOUT_TIME - (currentTime - lastAttemptTime))/1000)} seconds`);
    return;
  }

  if (!localStorage.getItem('masterHash')) {
    // First time setup
    const validation = validatePassword(password);
    if (validation) {
      alert(validation);
      return;
    }
    const salt = CryptoJS.lib.WordArray.random(128/8).toString();
    localStorage.setItem('salt', salt);
    localStorage.setItem('masterHash', deriveKey(password, salt));
    showVault();
  } else {
    const salt = localStorage.getItem('salt');
    if (deriveKey(password, salt) === localStorage.getItem('masterHash')) {
      attemptCount = 0;
      showVault();
    } else {
      attemptCount++;
      lastAttemptTime = currentTime;
      alert('Invalid master password');
    }
  }
}

function showVault() {
  document.getElementById('loginSection').style.display = 'none';
  document.getElementById('vaultSection').style.display = 'block';
  loadPasswords();
}

function showAddForm() {
  document.getElementById('addForm').style.display = 'block';
}

function savePassword() {
  const site = document.getElementById('siteName').value;
  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;
  const masterPassword = document.getElementById('masterPassword').value;

  const encrypted = CryptoJS.AES.encrypt(password, masterPassword).toString();

  vault.push({
    site,
    username,
    password: encrypted
  });

  localStorage.setItem('vault', CryptoJS.AES.encrypt(JSON.stringify(vault), masterPassword).toString());
  loadPasswords();
  
  // Clear form
  document.getElementById('siteName').value = '';
  document.getElementById('username').value = '';
  document.getElementById('password').value = '';
  document.getElementById('addForm').style.display = 'none';
}

function loadPasswords() {
  const masterPassword = document.getElementById('masterPassword').value;
  const encryptedVault = localStorage.getItem('vault');
  
  if (encryptedVault) {
    try {
      const decrypted = CryptoJS.AES.decrypt(encryptedVault, masterPassword).toString(CryptoJS.enc.Utf8);
      vault = JSON.parse(decrypted);
    } catch (e) {
      vault = [];
    }
  }

  const list = document.getElementById('passwordList');
  list.innerHTML = '';
  
  vault.forEach((item, index) => {
    const div = document.createElement('div');
    div.className = 'password-item';
    div.innerHTML = `
      <div>
        <strong>${item.site}</strong><br>
        ${item.username}
      </div>
      <button onclick="showPassword(${index})">Show</button>
    `;
    list.appendChild(div);
  });
}

function showPassword(index) {
  const masterPassword = document.getElementById('masterPassword').value;
  const decrypted = CryptoJS.AES.decrypt(vault[index].password, masterPassword).toString(CryptoJS.enc.Utf8);
  alert(`Password: ${decrypted}`);
}

function showForgotPassword() {
  const hasQuestions = localStorage.getItem('securityQuestions');
  if (!hasQuestions) {
    document.getElementById('loginSection').style.display = 'none';
    document.getElementById('securityQuestions').style.display = 'block';
  } else {
    document.getElementById('loginSection').style.display = 'none';
    document.getElementById('forgotPassword').style.display = 'block';
    displaySecurityQuestions();
  }
}

function saveSecurityQuestions() {
  const questions = {
    q1: document.getElementById('question1').value,
    a1: document.getElementById('answer1').value,
    q2: document.getElementById('question2').value,
    a2: document.getElementById('answer2').value
  };
  
  if (!questions.a1 || !questions.a2) {
    alert('Please answer both security questions');
    return;
  }
  
  localStorage.setItem('securityQuestions', CryptoJS.AES.encrypt(JSON.stringify(questions), 'securityKey').toString());
  alert('Security questions saved successfully');
  backToLogin();
}

function displaySecurityQuestions() {
  const encrypted = localStorage.getItem('securityQuestions');
  const questions = JSON.parse(CryptoJS.AES.decrypt(encrypted, 'securityKey').toString(CryptoJS.enc.Utf8));
  
  const checkDiv = document.getElementById('securityQuestionsCheck');
  checkDiv.innerHTML = `
    <div class="security-question">
      <p>${questions.q1}</p>
      <input type="text" id="checkAnswer1" placeholder="Your answer">
    </div>
    <div class="security-question">
      <p>${questions.q2}</p>
      <input type="text" id="checkAnswer2" placeholder="Your answer">
    </div>
  `;
}

function verifyAnswers() {
  const encrypted = localStorage.getItem('securityQuestions');
  const questions = JSON.parse(CryptoJS.AES.decrypt(encrypted, 'securityKey').toString(CryptoJS.enc.Utf8));
  
  const answer1 = document.getElementById('checkAnswer1').value;
  const answer2 = document.getElementById('checkAnswer2').value;
  
  if (answer1 === questions.a1 && answer2 === questions.a2) {
    localStorage.removeItem('masterHash');
    localStorage.removeItem('salt');
    localStorage.removeItem('vault');
    alert('Verification successful. Please set up a new master password.');
    backToLogin();
  } else {
    alert('Incorrect answers. Please try again.');
  }
}

function backToLogin() {
  document.getElementById('securityQuestions').style.display = 'none';
  document.getElementById('forgotPassword').style.display = 'none';
  document.getElementById('loginSection').style.display = 'block';
}
