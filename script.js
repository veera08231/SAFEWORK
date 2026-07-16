/* Navigation Logic */
// Auto-detect: on Render the backend IS the same server, so use same origin. Locally, use :5000.
const API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? `http://${window.location.hostname}:5000`
  : window.location.origin;

const app = {
    init: function () {
        this.cacheDOM();
        this.bindEvents();

        // If page reload happens during/after SOS flow, restore last screen for logged-in users
        const isLoggedIn = !!localStorage.getItem('safework_user_id');
        if (isLoggedIn) {
            const lastScreen = sessionStorage.getItem('safework_last_screen');
            this.showScreen(lastScreen || 'home-screen');
        }

        console.log("SAFEWORK App Initialized");
    },

    speak: function (text, delay = 0) {
        if (!window.speechSynthesis) return;
        setTimeout(() => {
            const msg = new SpeechSynthesisUtterance(text);
            msg.rate = 1.0;
            msg.pitch = 1.0;
            window.speechSynthesis.speak(msg);
        }, delay);
    },

    cacheDOM: function () {
        this.screens = document.querySelectorAll('.screen');
        this.buttons = document.querySelectorAll('button[data-target]');
        this.loader = document.getElementById('global-loader');
        this.loaderText = document.getElementById('loader-text');
        this.toast = document.getElementById('toast');

        // Chatbot
        this.chatbotFab = document.getElementById('chatbot-fab');
        this.chatbotPanel = document.getElementById('chatbot-panel');
        this.chatbotClose = document.getElementById('chatbot-close');
        this.chatbotMessages = document.getElementById('chatbot-messages');
        this.chatbotForm = document.getElementById('chatbot-form');
        this.chatbotInput = document.getElementById('chatbot-input');
        this.chatbotSuggestionButtons = document.querySelectorAll('.chatbot-suggestion');

        // SOS
        this.sosBtnHome = document.getElementById('sos-btn-home');
        this.sosBtnActive = document.getElementById('sos-btn-active');
        this.sosStatus = document.getElementById('sos-status');
        this.sosText = document.querySelector('.sos-text');
        this.sosSubtext = document.querySelector('#sos-status .sos-subtext');
        this.backHomeSos = document.getElementById('back-home-sos');

        this.liveTrackingIntervalId = null;
        this.liveTrackingSosId = null;
        this.sosAudioRecorder = null;
        this.sosAudioStream = null;
        this.sosAudioChunks = [];
        this.sosAudioStopTimeoutId = null;
        this.pendingSOSAudioBlob = null;
        this.pendingSOSAudioMimeType = 'audio/webm';
        this.pendingSOSAudioDurationSeconds = 30;
        this.currentSOSIdForAudio = null;
        this.sosImageStream = null;
        this.pendingSOSImageBlob = null;
        this.pendingSOSImageMimeType = 'image/jpeg';
        this.currentSOSIdForImage = null;

        this.sosEvidenceAudioRecorder = null;
        this.sosEvidenceAudioStream = null;
        this.sosEvidenceAudioChunks = [];
        this.sosEvidenceAudioStopTimeoutId = null;
        this.sosEvidenceVideoRecorder = null;
        this.sosEvidenceVideoStream = null;
        this.sosEvidenceVideoChunks = [];
        this.sosEvidenceVideoStopTimeoutId = null;
        this.pendingSOSEvidenceAudioBlob = null;
        this.pendingSOSEvidenceAudioMimeType = 'audio/webm';
        this.pendingSOSEvidenceAudioDurationSeconds = 30;
        this.pendingSOSEvidenceVideoBlob = null;
        this.pendingSOSEvidenceVideoMimeType = 'video/webm;codecs=vp8';
        this.pendingSOSEvidenceVideoDurationSeconds = 15;
        this.sosEvidenceAudioReady = false;
        this.sosEvidenceVideoReady = false;
        this.sosEvidenceUploaded = false;
        this.currentSOSIdForEvidence = null;
        this.sosEvidenceReadyPromise = null;
        this.resolveSOSEvidenceReady = null;

        // Nav Buttons
        this.complaintBtnHome = document.getElementById('complaint-btn-home');
        this.statusBtnHome = document.getElementById('status-btn-home');
        this.sosHistoryBtnHome = document.getElementById('sos-history-btn-home');
        this.logoutBtn = document.getElementById('logout-btn');

        // Forms
        this.loginForm = document.getElementById('login-form');
        this.registerForm = document.getElementById('register-form');
        this.complaintForm = document.getElementById('complaint-form');
        this.complaintSuccess = document.getElementById('complaint-success');
        this.fileInput = document.getElementById('file-upload');
        this.fileName = document.getElementById('file-name');

        // Auth Links
        this.goToRegister = document.getElementById('go-to-register');
        this.goToLogin = document.getElementById('go-to-login');
    },

    showLoader: function (text = 'Please wait...') {
        if (this.loaderText) this.loaderText.textContent = text;
        if (this.loader) this.loader.classList.remove('hidden');
    },

    hideLoader: function () {
        if (this.loader) this.loader.classList.add('hidden');
    },

    showToast: function (message, type = 'success') {
        if (!this.toast) {
            return;
        }

        this.toast.textContent = message;
        this.toast.classList.remove('hidden', 'success', 'error');
        this.toast.classList.add(type === 'error' ? 'error' : 'success');

        clearTimeout(this.toastTimer);
        this.toastTimer = setTimeout(() => {
            this.toast.classList.add('hidden');
        }, 2600);
    },

    formatDate: function (dateValue) {
        const d = new Date(dateValue);
        if (Number.isNaN(d.getTime())) return '-';
        return d.toLocaleDateString('en-CA');
    },

    loadComplaintStatus: function () {
        const listEl = document.getElementById('complaint-list');
        const userId = localStorage.getItem('safework_user_id');

        if (!listEl) return;
        if (!userId) {
            listEl.innerHTML = '<li class="complaint-item"><div class="complaint-info"><span class="case-id">No session</span><span class="date">Please login</span></div><span class="status status-pending">Pending</span></li>';
            return;
        }

        fetch(`${API_BASE_URL}/complaints/${userId}`)
            .then(res => res.json())
            .then(items => {
                const complaints = Array.isArray(items) ? items : [];

                if (!complaints.length) {
                    listEl.innerHTML = '<li class="complaint-item"><div class="complaint-info"><span class="case-id">No complaints yet</span><span class="date">Submit a complaint to track status</span></div><span class="status status-pending">Pending</span></li>';
                    return;
                }

                listEl.innerHTML = complaints.map(c => {
                    const statusClass = c.status === 'Resolved' ? 'status-resolved' : 'status-pending';
                    return `
                        <li class="complaint-item" style="cursor:pointer;" onclick="app.openCaseDetails('${c.caseId || ''}')">
                            <div class="complaint-info">
                                <span class="case-id">Case ${c.caseId || '-'}</span>
                                <span class="date">${this.formatDate(c.createdAt)}</span>
                            </div>
                            <span class="status ${statusClass}">${c.status || 'Pending'}</span>
                        </li>
                    `;
                }).join('');
            })
            .catch(() => {
                listEl.innerHTML = '<li class="complaint-item"><div class="complaint-info"><span class="case-id">Unable to load</span><span class="date">Check backend connection</span></div><span class="status status-pending">Pending</span></li>';
            });
    },

    loadSOSHistory: function () {
        const listEl = document.getElementById('sos-history-list');
        const userId = localStorage.getItem('safework_user_id');

        if (!listEl) return;
        if (!userId) {
            listEl.innerHTML = '<li class="complaint-item"><div class="complaint-info"><span class="case-id">No session</span><span class="date">Please login</span></div><span class="status status-pending">-</span></li>';
            return;
        }

        const encodedUserId = encodeURIComponent(userId);
        const hostCandidates = [
            API_BASE_URL,
            `http://${window.location.hostname || '10.124.41.12'}:5000`,
            'http://10.124.41.12:5000'
        ].filter((value, index, arr) => value && arr.indexOf(value) === index);

        const endpointCandidates = [];
        hostCandidates.forEach((base) => {
            endpointCandidates.push(`${base}/sos/history?userId=${encodedUserId}`);
            endpointCandidates.push(`${base}/sos/history/${encodedUserId}`);
            endpointCandidates.push(`${base}/sos`);
        });

        const tryFetch = (index) => {
            if (index >= endpointCandidates.length) {
                throw new Error('All SOS history endpoints failed');
            }

            const url = endpointCandidates[index];
            console.log('Trying SOS history URL:', url);

            return fetch(url)
                .then((res) => {
                    console.log('SOS history response:', res);
                    if (!res.ok) {
                        throw new Error(`Failed at ${url} (${res.status})`);
                    }
                    return res.json();
                })
                .catch((error) => {
                    console.log('SOS history fetch attempt error:', error);
                    return tryFetch(index + 1);
                });
        };

        tryFetch(0)
            .then(items => {
                const rawAlerts = Array.isArray(items) ? items : [];
                const alerts = rawAlerts.filter(a => String(a?.userId || '') === String(userId));

                if (!alerts.length) {
                    listEl.innerHTML = '<li class="complaint-item"><div class="complaint-info"><span class="case-id">No SOS history found</span><span class="date">Trigger SOS to create entries</span></div><span class="status status-pending">-</span></li>';
                    return;
                }

                listEl.innerHTML = alerts.map((a, idx) => {
                    const dt = new Date(a.timestamp);
                    const dateText = Number.isNaN(dt.getTime()) ? '-' : dt.toLocaleDateString('en-CA');
                    const timeText = Number.isNaN(dt.getTime()) ? '-' : dt.toLocaleTimeString();
                    const status = (a.status || 'active').toLowerCase();
                    const statusClass = status === 'cancelled' ? 'status-cancelled' : 'status-active';
                    const statusLabel = status === 'cancelled' ? 'Cancelled' : 'Active';
                    const lat = a?.location?.latitude;
                    const lng = a?.location?.longitude;
                    const mapLink = (typeof lat === 'number' && typeof lng === 'number')
                        ? `https://www.google.com/maps?q=${lat},${lng}`
                        : '';

                    return `
                        <li class="complaint-item">
                            <div class="complaint-info">
                                <span class="case-id">SOS #${alerts.length - idx}</span>
                                <span class="date">Date: ${dateText}</span>
                                <span class="date">Time: ${timeText}</span>
                                <span class="date">Location: ${mapLink ? `<a href="${mapLink}" target="_blank" rel="noopener">Open Map</a>` : '-'}</span>
                                ${status === 'active' ? `<button class="cancel-sos-btn" onclick="app.cancelSOS('${a._id}')">Cancel SOS</button>` : ''}
                            </div>
                            <span class="status ${statusClass}">${statusLabel}</span>
                        </li>
                    `;
                }).join('');
            })
            .catch((error) => {
                console.log('SOS history error:', error);
                listEl.innerHTML = '<li class="complaint-item"><div class="complaint-info"><span class="case-id">Unable to load SOS history</span><span class="date">Please check backend/server network settings</span></div><span class="status status-pending">-</span></li>';
            });
    },

    cancelSOS: function (sosId) {
        if (!sosId) {
            return;
        }

        const confirmed = confirm('Are you sure you want to cancel this SOS?');
        if (!confirmed) {
            return;
        }

        fetch(`${API_BASE_URL}/sos/cancel/${encodeURIComponent(sosId)}`, {
            method: 'POST'
        })
            .then(res => res.json().then(data => ({ status: res.status, body: data })))
            .then(response => {
                if (response.status === 200) {
                    this.showToast('SOS marked as false alarm', 'success');
                    this.loadSOSHistory();
                } else {
                    this.showToast(response.body.msg || 'Unable to cancel SOS', 'error');
                }
            })
            .catch(() => {
                this.showToast('Unable to cancel SOS', 'error');
            });
    },

    openCaseDetails: function (caseId) {
        if (!caseId) return;

        this.showLoader('Loading case details...');
        fetch(`${API_BASE_URL}/complaint/${encodeURIComponent(caseId)}`)
            .then(res => res.json().then(data => ({ status: res.status, body: data })))
            .then(response => {
                this.hideLoader();

                if (response.status !== 200) {
                    this.showToast(response.body.message || 'Unable to load case details', 'error');
                    return;
                }

                const item = response.body;
                const statusClass = item.status === 'Resolved' ? 'status-resolved' : 'status-pending';

                document.getElementById('detail-case-id').textContent = `Case ${item.caseId || '-'}`;
                document.getElementById('detail-date').textContent = this.formatDate(item.createdAt);
                document.getElementById('detail-status').textContent = item.status || 'Pending';
                document.getElementById('detail-status').className = `status ${statusClass}`;
                document.getElementById('detail-incident').textContent = item.incident || '-';
                document.getElementById('detail-description').textContent = item.description || '-';

                const attachmentEl = document.getElementById('detail-attachment');
                const file = item.file || '';
                if (!file) {
                    attachmentEl.innerHTML = 'No attachment';
                } else if (/\.(png|jpg|jpeg|gif|webp)$/i.test(file)) {
                    attachmentEl.innerHTML = `<img src="${file}" alt="Attachment" style="width:100%;max-height:220px;object-fit:cover;border-radius:10px;margin-top:6px;" onerror="this.outerHTML='Image preview unavailable';">`;
                } else {
                    attachmentEl.innerHTML = `<a href="${file}" target="_blank" rel="noopener">View Attachment</a>`;
                }

                this.showScreen('case-details-screen');
            })
            .catch(() => {
                this.hideLoader();
                this.showToast('Unable to load case details', 'error');
            });
    },

    bindEvents: function () {
        // Navigation Buttons
        this.buttons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const targetId = btn.getAttribute('data-target');
                this.showScreen(targetId);
            });
        });

        // Loop through all elements that might link to Home (e.g. from Success screens)
        // Direct IDs for main buttons
        this.sosBtnHome.addEventListener('click', () => this.showScreen('sos-screen'));
        this.complaintBtnHome.addEventListener('click', () => this.showScreen('complaint-screen'));
        this.statusBtnHome.addEventListener('click', () => this.showScreen('status-screen'));
        if (this.sosHistoryBtnHome) {
            this.sosHistoryBtnHome.addEventListener('click', () => this.showScreen('sos-history-screen'));
        }

        // Logout
        if (this.logoutBtn) {
            this.logoutBtn.addEventListener('click', () => this.handleLogout());
        }

        // Toggle Auth Screens
        if (this.goToRegister) {
            this.goToRegister.addEventListener('click', () => {
                this.showScreen('register-screen');
            });
        }
        if (this.goToLogin) {
            this.goToLogin.addEventListener('click', () => {
                this.showScreen('login-screen');
            });
        }

        // Login Logic
        if (this.loginForm) {
            this.loginForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleLogin();
            });
        }

        // Register Logic
        if (this.registerForm) {
            this.registerForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleRegister();
            });
        }

        // SOS Logic
        this.sosBtnActive.addEventListener('click', () => this.activateSOS());
        this.backHomeSos.addEventListener('click', () => {
            this.resetSOS();
            this.showScreen('home-screen');
        });

        // Form Logic
        this.complaintForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.submitComplaint();
        });

        this.fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                this.fileName.textContent = e.target.files[0].name;
            }
        });

        // Chatbot
        if (this.chatbotFab && this.chatbotPanel) {
            this.chatbotFab.addEventListener('click', () => this.toggleChatbot(true));
        }
        if (this.chatbotClose && this.chatbotPanel) {
            this.chatbotClose.addEventListener('click', () => this.toggleChatbot(false));
        }
        if (this.chatbotForm && this.chatbotInput) {
            this.chatbotForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const text = (this.chatbotInput.value || '').trim();
                if (!text) return;
                this.appendChatMessage(text, 'user');
                this.chatbotInput.value = '';
                this.respondToChat(text);
            });
        }
        if (this.chatbotSuggestionButtons && this.chatbotSuggestionButtons.length) {
            this.chatbotSuggestionButtons.forEach((btn) => {
                btn.addEventListener('click', () => {
                    const action = btn.getAttribute('data-chat-action');
                    this.handleChatAction(action);
                });
            });
        }

        // Volume Button Trigger (3 presses within ~1.5 seconds)
        let pressCount = 0;
        let lastPressTime = 0;

        document.addEventListener('keydown', (e) => {
            // Avoid conflicts while typing in form fields
            const tag = (e.target && e.target.tagName) ? e.target.tagName.toLowerCase() : '';
            if (tag === 'input' || tag === 'textarea') {
                return;
            }

            // Detect hardware volume keys
            if (e.key === 'VolumeUp' || e.key === 'VolumeDown') {
                const currentTime = new Date().getTime();

                // Reset if gap is too long (1.5 seconds)
                if (currentTime - lastPressTime > 1500) {
                    pressCount = 0;
                }

                pressCount++;
                lastPressTime = currentTime;

                console.log(`SOS Trigger: ${pressCount}/3`);

                if (pressCount >= 3) {
                    this.showScreen('sos-screen');
                    this.activateSOS();
                    pressCount = 0; // Reset
                }
            }
        });
    },

    toggleChatbot: function (open) {
        if (!this.chatbotPanel) return;

        if (open) {
            this.chatbotPanel.classList.remove('hidden');
            if (this.chatbotMessages && !this.chatbotMessages.children.length) {
                this.appendChatMessage('Hi, I am SAFEWORK assistant. Ask about SOS, Complaint, Help, or POSH.', 'bot');
                this.appendChatMessage('Emergency tips: Stay in safe place. Share location.', 'bot');
            }
            return;
        }

        this.chatbotPanel.classList.add('hidden');
    },

    appendChatMessage: function (text, sender) {
        if (!this.chatbotMessages) return;
        const msg = document.createElement('div');
        msg.className = `chat-msg ${sender === 'user' ? 'user' : 'bot'}`;
        msg.textContent = text;
        this.chatbotMessages.appendChild(msg);
        this.chatbotMessages.scrollTop = this.chatbotMessages.scrollHeight;
    },

    respondToChat: function (inputText) {
        const text = (inputText || '').toLowerCase();

        if (text.includes('sos')) {
            this.appendChatMessage('Press SOS button or volume button 3 times for emergency', 'bot');
            return;
        }

        if (text.includes('complaint')) {
            this.appendChatMessage('Go to complaint section and submit incident', 'bot');
            return;
        }

        if (text.includes('help')) {
            this.appendChatMessage('You can trigger SOS or contact admin', 'bot');
            return;
        }

        if (text.includes('posh')) {
            this.appendChatMessage('POSH handles workplace harassment complaints', 'bot');
            return;
        }

        this.appendChatMessage('I can help with SOS, Complaint, Help, and POSH.', 'bot');
    },

    handleChatAction: function (action) {
        if (!action) return;

        if (action === 'sos') {
            this.appendChatMessage('Triggering SOS now.', 'bot');
            this.showScreen('sos-screen');
            this.activateSOS();
            return;
        }

        if (action === 'complaint') {
            this.appendChatMessage('Opening complaint section.', 'bot');
            this.showScreen('complaint-screen');
            return;
        }

        if (action === 'status') {
            this.appendChatMessage('Opening complaint status.', 'bot');
            this.showScreen('status-screen');
        }
    },

    handleLogin: function () {
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const submitBtn = this.loginForm.querySelector('button[type="submit"]');

        if (email && password) {
            const originalText = submitBtn.innerText;
            submitBtn.innerText = "Logging in...";
            submitBtn.disabled = true;
            this.showLoader('Logging in...');

            fetch(`${API_BASE_URL}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            })
                .then(res => res.json().then(data => ({ status: res.status, body: data })))
                .then(response => {
                    this.hideLoader();
                    submitBtn.innerText = originalText;
                    submitBtn.disabled = false;

                    if (response.status === 200) {
                        localStorage.setItem('safework_user_id', response.body.userId);
                        localStorage.setItem('safework_user_name', response.body.name);
                        localStorage.setItem('safework_user_email', response.body.email);
                        this.showToast('Login successful', 'success');
                        this.showScreen('home-screen');
                    } else {
                        this.showToast(response.body.msg || "Login failed", 'error');
                    }
                })
                .catch(err => {
                    console.error(err);
                    this.hideLoader();
                    submitBtn.innerText = originalText;
                    submitBtn.disabled = false;
                    this.showToast("Server error. Is backend running?", 'error');
                });
        }
    },

    handleRegister: function () {
        const name = document.getElementById('reg-name').value;
        const email = document.getElementById('reg-email').value;
        const password = document.getElementById('reg-password').value;
        const submitBtn = this.registerForm.querySelector('button[type="submit"]');

        if (name && email && password) {
            const originalText = submitBtn.innerText;
            submitBtn.innerText = "Registering...";
            submitBtn.disabled = true;
            this.showLoader('Creating account...');

            fetch(`${API_BASE_URL}/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email, password })
            })
                .then(res => res.json().then(data => ({ status: res.status, body: data })))
                .then(response => {
                    this.hideLoader();
                    submitBtn.innerText = originalText;
                    submitBtn.disabled = false;

                    if (response.status === 201) {
                        this.showToast("Registration successful. Please login.", 'success');
                        this.showScreen('login-screen');
                    } else {
                        this.showToast(response.body.msg || "Registration failed", 'error');
                    }
                })
                .catch(err => {
                    console.error(err);
                    this.hideLoader();
                    submitBtn.innerText = originalText;
                    submitBtn.disabled = false;
                    this.showToast("Server error. Is backend running?", 'error');
                });
        }
    },

    showScreen: function (screenId) {
        // Protect app screens when not logged in
        const protectedScreens = ['home-screen', 'sos-screen', 'complaint-screen', 'status-screen', 'case-details-screen', 'sos-history-screen'];
        const isLoggedIn = !!localStorage.getItem('safework_user_id');
        if (protectedScreens.includes(screenId) && !isLoggedIn) {
            this.showToast('Please login to continue', 'error');
            screenId = 'login-screen';
        }

        // Hide all screens
        this.screens.forEach(screen => {
            screen.classList.remove('active');
        });

        // Show target screen
        const target = document.getElementById(screenId);
        if (target) {
            target.classList.add('active');
            window.scrollTo(0, 0);

            // Persist current screen so accidental reload stays on same page
            sessionStorage.setItem('safework_last_screen', screenId);

            // Update User Greeting on Home Screen
            if (screenId === 'home-screen') {
                const name = localStorage.getItem('safework_user_name');
                const greetEl = document.getElementById('user-greeting');
                if (greetEl) {
                    greetEl.textContent = name ? `Welcome, ${name}` : 'Welcome';
                }
            }

            // Reset Complaint Form if showing that screen
            if (screenId === 'complaint-screen') {
                this.complaintForm.style.display = 'block';
                this.complaintSuccess.classList.add('hidden');
                this.complaintForm.reset();
                this.fileName.textContent = '';

                // Pre-fill email
                const storedEmail = localStorage.getItem('safework_user_email');
                if (storedEmail) {
                    document.getElementById('complaint-email').value = storedEmail;
                }
            }

            // Load user complaint history dynamically
            if (screenId === 'status-screen') {
                this.loadComplaintStatus();
            }

            if (screenId === 'sos-history-screen') {
                this.loadSOSHistory();
            }
        }
    },

    handleLogout: function () {
        const confirmed = confirm('Are you sure you want to logout?');
        if (!confirmed) return;

        // Clear user session storage
        localStorage.removeItem('safework_user_id');
        localStorage.removeItem('safework_user_name');
        localStorage.removeItem('safework_user_email');
        localStorage.removeItem('token');
        sessionStorage.clear();

        // Reset sensitive UI state
        this.resetSOS();
        this.showToast('Logged out successfully', 'success');
        this.showScreen('login-screen');
    },

    activateSOS: function () {
        this.sosBtnActive.disabled = true;

        // Voice + Alert for activation
        this.showToast('SOS Activated', 'error');
        this.speak("SOS activated");

        // Start step-by-step recording alerts
        this.startSOSEvidenceRecording();

        // Instant user feedback for both manual and volume-triggered SOS
        if (navigator.vibrate) {
            navigator.vibrate(400);
        }

        this.sosBtnActive.classList.add('pulse-animation');
        this.sosText.textContent = "Getting Location...";

        this.speak("Fetching Location", 1000);
        this.showLoader('Detecting location...');

        if (!navigator.geolocation) {
            this.hideLoader();
            this.showToast('Geolocation is not supported by your browser', 'error');
            this.resetSOS();
            return;
        }

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                this.sosText.textContent = "Sending Alert...";
                this.speak("Location is being shared");

                await this.waitForSOSEvidence(20000);

                const userId = localStorage.getItem('safework_user_id') || 'guest_user';
                const latitude = position.coords.latitude;
                const longitude = position.coords.longitude;
                const timestamp = new Date().toISOString();

                const formData = new FormData();
                formData.append('userId', userId);
                formData.append('latitude', String(latitude));
                formData.append('longitude', String(longitude));
                formData.append('timestamp', timestamp);

                if (this.pendingSOSEvidenceAudioBlob && this.pendingSOSEvidenceAudioBlob.size > 0) {
                    const audioMimeType = this.pendingSOSEvidenceAudioMimeType || this.pendingSOSEvidenceAudioBlob.type || 'audio/webm';
                    const audioExtension = audioMimeType.includes('mp3') ? 'mp3' : (audioMimeType.includes('ogg') ? 'ogg' : 'webm');
                    formData.append('audio', this.pendingSOSEvidenceAudioBlob, `sos-audio-${Date.now()}.${audioExtension}`);
                    formData.append('audioMimeType', audioMimeType);
                    formData.append('audioDurationSeconds', String(this.pendingSOSEvidenceAudioDurationSeconds || 15));
                }

                if (this.pendingSOSEvidenceVideoBlob && this.pendingSOSEvidenceVideoBlob.size > 0) {
                    const videoMimeType = this.pendingSOSEvidenceVideoMimeType || this.pendingSOSEvidenceVideoBlob.type || 'video/webm;codecs=vp8';
                    const videoExtension = videoMimeType.includes('mp4') ? 'mp4' : 'webm';
                    formData.append('video', this.pendingSOSEvidenceVideoBlob, `sos-video-${Date.now()}.${videoExtension}`);
                    formData.append('videoMimeType', videoMimeType);
                    formData.append('videoDurationSeconds', String(this.pendingSOSEvidenceVideoDurationSeconds || 10));
                }

                // Send to Backend
                fetch(`${API_BASE_URL}/sos`, {
                    method: 'POST',
                    body: formData
                })
                    .then(res => res.json())
                    .then(data => {
                        this.hideLoader();
                        console.log('SOS Success:', data);
                        // Update UI
                        this.sosBtnActive.classList.remove('pulse-animation');
                        this.sosBtnActive.style.display = 'none';
                        this.sosText.style.display = 'none';
                        this.sosStatus.classList.remove('hidden');

                        if (this.sosSubtext) {
                            this.sosSubtext.textContent = 'Help is on the way. You will get help soon.';
                        }

                        // Show Notification
                        this.showToast("SOS Sent Successfully. Help is on the way.", 'success');
                        this.speak("SOS sent successfully. Help is on the way");

                        // Optionally redirect to Home screen after 3 seconds
                        setTimeout(() => {
                            this.showScreen('home-screen');
                            this.resetSOS();
                        }, 3000);

                        // Extend existing SOS flow with temporary live tracking updates
                        if (data && data.sosId) {
                            this.startLiveTracking(data.sosId);
                        }
                    })
                    .catch(err => {
                        console.error('SOS Error:', err);
                        this.hideLoader();
                        this.showToast("Failed to send SOS. Please try again.", 'error');
                        this.resetSOS();
                    });
            },
            () => {
                this.hideLoader();
                this.showToast("Unable to retrieve your location", 'error');
                this.resetSOS();
            }
        );
    },

    startSOSEvidenceRecording: function () {
        this.sosEvidenceAudioReady = false;
        this.sosEvidenceVideoReady = false;
        this.sosEvidenceUploaded = false;
        this.pendingSOSEvidenceAudioBlob = null;
        this.pendingSOSEvidenceVideoBlob = null;
        this.sosEvidenceReadyPromise = new Promise((resolve) => {
            this.resolveSOSEvidenceReady = resolve;
        });

        this.startSOSEvidenceAudioRecording();
        this.startSOSEvidenceVideoRecording();
    },

    markSOSEvidenceReadyIfDone: function () {
        if (this.sosEvidenceAudioReady && this.sosEvidenceVideoReady && this.resolveSOSEvidenceReady) {
            this.resolveSOSEvidenceReady();
            this.resolveSOSEvidenceReady = null;
        }
    },

    waitForSOSEvidence: function (timeoutMs = 20000) {
        if (!this.sosEvidenceReadyPromise) {
            return Promise.resolve();
        }

        return Promise.race([
            this.sosEvidenceReadyPromise,
            new Promise((resolve) => setTimeout(resolve, timeoutMs))
        ]);
    },

    startSOSEvidenceAudioRecording: function () {
        const RECORDING_DURATION_MS = 15000;

        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || typeof MediaRecorder === 'undefined') {
            this.sosEvidenceAudioReady = true;
            return;
        }

        if (this.sosEvidenceAudioRecorder && this.sosEvidenceAudioRecorder.state === 'recording') {
            return;
        }

        navigator.mediaDevices.getUserMedia({ audio: true })
            .then((stream) => {
                this.speak("Accessing Microphone", 500);
                setTimeout(() => this.speak("Audio is recording"), 1500);

                this.sosEvidenceAudioStream = stream;
                this.sosEvidenceAudioChunks = [];
                const startedAt = Date.now();

                const preferredMimeType = 'audio/webm';
                const canSetMimeType = typeof MediaRecorder.isTypeSupported === 'function'
                    ? MediaRecorder.isTypeSupported(preferredMimeType)
                    : true;

                const recorder = canSetMimeType
                    ? new MediaRecorder(stream, { mimeType: preferredMimeType, audioBitsPerSecond: 64000 })
                    : new MediaRecorder(stream);

                this.sosEvidenceAudioRecorder = recorder;

                recorder.ondataavailable = (event) => {
                    if (event.data && event.data.size > 0) {
                        this.sosEvidenceAudioChunks.push(event.data);
                    }
                };

                recorder.onstop = () => {
                    const elapsed = Math.max(0, Date.now() - startedAt);
                    const durationSeconds = Math.max(30, Math.min(60, Math.round(elapsed / 1000)));
                    const chunkCount = this.sosEvidenceAudioChunks.length;
                    console.log('Audio chunks:', chunkCount);

                    if (chunkCount > 0) {
                        const mimeType = recorder.mimeType || 'audio/webm';
                        const audioBlob = new Blob(this.sosEvidenceAudioChunks, { type: mimeType });
                        console.log('Audio blob size:', audioBlob.size);
                        if (audioBlob.size > 0) {
                            this.pendingSOSEvidenceAudioBlob = audioBlob;
                            this.pendingSOSEvidenceAudioMimeType = mimeType;
                            this.pendingSOSEvidenceAudioDurationSeconds = durationSeconds;
                        }
                    }

                    this.sosEvidenceAudioReady = true;
                    this.stopSOSEvidenceAudioRecording();
                    this.sosEvidenceAudioRecorder = null;
                    this.sosEvidenceAudioChunks = [];
                    this.markSOSEvidenceReadyIfDone();
                };

                recorder.start(1000);
                this.sosEvidenceAudioStopTimeoutId = setTimeout(() => {
                    if (this.sosEvidenceAudioRecorder && this.sosEvidenceAudioRecorder.state === 'recording') {
                        this.sosEvidenceAudioRecorder.stop();
                    }
                }, RECORDING_DURATION_MS);
            })
            .catch(() => {
                this.sosEvidenceAudioReady = true;
                this.markSOSEvidenceReadyIfDone();
            });
    },

    startSOSEvidenceVideoRecording: function () {
        const RECORDING_DURATION_MS = 10000;

        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || typeof MediaRecorder === 'undefined') {
            this.sosEvidenceVideoReady = true;
            return;
        }

        if (this.sosEvidenceVideoRecorder && this.sosEvidenceVideoRecorder.state === 'recording') {
            return;
        }

        navigator.mediaDevices.getUserMedia({ video: true })
            .then((stream) => {
                this.speak("Accessing Camera", 500);
                setTimeout(() => this.speak("Camera is recording"), 1500);

                this.sosEvidenceVideoStream = stream;
                this.sosEvidenceVideoChunks = [];
                const startedAt = Date.now();

                const preferredMimeType = 'video/webm;codecs=vp8';
                const canSetMimeType = typeof MediaRecorder.isTypeSupported === 'function'
                    ? MediaRecorder.isTypeSupported(preferredMimeType)
                    : true;

                const recorder = canSetMimeType
                    ? new MediaRecorder(stream, { mimeType: preferredMimeType, videoBitsPerSecond: 350000 })
                    : new MediaRecorder(stream);

                this.sosEvidenceVideoRecorder = recorder;

                recorder.ondataavailable = (event) => {
                    if (event.data && event.data.size > 0) {
                        this.sosEvidenceVideoChunks.push(event.data);
                    }
                };

                recorder.onstop = () => {
                    const elapsed = Math.max(0, Date.now() - startedAt);
                    const durationSeconds = Math.max(10, Math.min(20, Math.round(elapsed / 1000)));
                    const chunkCount = this.sosEvidenceVideoChunks.length;
                    console.log('Video chunks:', chunkCount);

                    if (chunkCount > 0) {
                        const mimeType = recorder.mimeType || 'video/webm;codecs=vp8';
                        const videoBlob = new Blob(this.sosEvidenceVideoChunks, { type: mimeType });
                        console.log('Video blob size:', videoBlob.size);
                        if (videoBlob.size > 0) {
                            this.pendingSOSEvidenceVideoBlob = videoBlob;
                            this.pendingSOSEvidenceVideoMimeType = mimeType;
                            this.pendingSOSEvidenceVideoDurationSeconds = durationSeconds;
                        }
                    }

                    this.sosEvidenceVideoReady = true;
                    this.stopSOSEvidenceVideoRecording();
                    this.sosEvidenceVideoRecorder = null;
                    this.sosEvidenceVideoChunks = [];
                    this.markSOSEvidenceReadyIfDone();
                };

                recorder.start(1000);
                this.sosEvidenceVideoStopTimeoutId = setTimeout(() => {
                    if (this.sosEvidenceVideoRecorder && this.sosEvidenceVideoRecorder.state === 'recording') {
                        this.sosEvidenceVideoRecorder.stop();
                    }
                }, RECORDING_DURATION_MS);
            })
            .catch((err) => {
                this.sosEvidenceVideoReady = true;
                console.warn('Video recording unavailable. Falling back to audio-only evidence.');
                this.markSOSEvidenceReadyIfDone();
            });
    },

    stopSOSEvidenceRecording: function () {
        this.stopSOSEvidenceAudioRecording();
        this.stopSOSEvidenceVideoRecording();
    },

    stopSOSEvidenceAudioRecording: function () {
        if (this.sosEvidenceAudioStopTimeoutId) {
            clearTimeout(this.sosEvidenceAudioStopTimeoutId);
            this.sosEvidenceAudioStopTimeoutId = null;
        }
        if (this.sosEvidenceAudioStream) {
            this.sosEvidenceAudioStream.getTracks().forEach(track => track.stop());
            this.sosEvidenceAudioStream = null;
        }
    },

    stopSOSEvidenceVideoRecording: function () {
        if (this.sosEvidenceVideoStopTimeoutId) {
            clearTimeout(this.sosEvidenceVideoStopTimeoutId);
            this.sosEvidenceVideoStopTimeoutId = null;
        }
        if (this.sosEvidenceVideoStream) {
            this.sosEvidenceVideoStream.getTracks().forEach(track => track.stop());
            this.sosEvidenceVideoStream = null;
        }
    },

    uploadPendingSOSEvidence: function () {
        if (this.sosEvidenceUploaded) {
            return;
        }

        if (!this.currentSOSIdForEvidence || !this.sosEvidenceAudioReady || !this.sosEvidenceVideoReady) {
            return;
        }

        if (!this.pendingSOSEvidenceAudioBlob || this.pendingSOSEvidenceAudioBlob.size <= 0) {
            console.warn('Audio evidence missing or empty. Skipping SOS evidence upload.');
            return;
        }

        const formData = new FormData();
        const audioMimeType = this.pendingSOSEvidenceAudioMimeType || this.pendingSOSEvidenceAudioBlob.type || 'audio/webm';
        const audioExtension = audioMimeType.includes('mp3') ? 'mp3' : (audioMimeType.includes('ogg') ? 'ogg' : 'webm');
        const audioFileName = `sos-audio-${Date.now()}.${audioExtension}`;
        console.log('Audio blob size:', this.pendingSOSEvidenceAudioBlob.size);
        formData.append('audio', this.pendingSOSEvidenceAudioBlob, audioFileName);

        if (this.pendingSOSEvidenceVideoBlob && this.pendingSOSEvidenceVideoBlob.size > 0) {
            const videoMimeType = this.pendingSOSEvidenceVideoMimeType || this.pendingSOSEvidenceVideoBlob.type || 'video/webm;codecs=vp8';
            const videoExtension = videoMimeType.includes('mp4') ? 'mp4' : 'webm';
            const videoFileName = `sos-video-${Date.now()}.${videoExtension}`;
            console.log('Video blob size:', this.pendingSOSEvidenceVideoBlob.size);
            if (this.pendingSOSEvidenceVideoBlob.size > 0) {
                formData.append('video', this.pendingSOSEvidenceVideoBlob, videoFileName);
                formData.append('videoMimeType', videoMimeType);
                formData.append('videoDurationSeconds', String(this.pendingSOSEvidenceVideoDurationSeconds || 15));
            }
        }

        formData.append('audioMimeType', audioMimeType);
        formData.append('audioDurationSeconds', String(this.pendingSOSEvidenceAudioDurationSeconds || 30));
        formData.append('timestamp', new Date().toISOString());

        fetch(`${API_BASE_URL}/sos/${this.currentSOSIdForEvidence}/evidence`, {
            method: 'POST',
            body: formData
        })
            .then(res => {
                if (!res.ok) {
                    throw new Error(`Evidence upload failed with status ${res.status}`);
                }
                return res.json();
            })
            .then(() => {
                this.sosEvidenceUploaded = true;
                this.pendingSOSEvidenceAudioBlob = null;
                this.pendingSOSEvidenceVideoBlob = null;
                this.pendingSOSEvidenceAudioMimeType = 'audio/webm';
                this.pendingSOSEvidenceVideoMimeType = 'video/webm;codecs=vp8';
            })
            .catch((err) => {
                console.warn('SOS evidence upload error:', err.message || err);
            });
    },

    startSOSAudioRecording: function () {
        const RECORDING_DURATION_MS = 30000;

        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || typeof MediaRecorder === 'undefined') {
            return;
        }

        // Avoid multiple overlapping recordings
        if (this.sosAudioRecorder && this.sosAudioRecorder.state === 'recording') {
            return;
        }

        navigator.mediaDevices.getUserMedia({ audio: true })
            .then((stream) => {
                this.sosAudioStream = stream;
                this.sosAudioChunks = [];
                const startedAt = Date.now();

                const recorder = new MediaRecorder(stream);
                this.sosAudioRecorder = recorder;

                recorder.ondataavailable = (event) => {
                    if (event.data && event.data.size > 0) {
                        this.sosAudioChunks.push(event.data);
                    }
                };

                recorder.onstop = () => {
                    const durationMs = Math.max(0, Date.now() - startedAt);
                    const durationSeconds = Math.max(30, Math.min(60, Math.round(durationMs / 1000)));
                    const mimeType = recorder.mimeType || 'audio/webm';

                    if (this.sosAudioChunks.length) {
                        this.pendingSOSAudioBlob = new Blob(this.sosAudioChunks, { type: mimeType });
                        this.pendingSOSAudioMimeType = mimeType;
                        this.pendingSOSAudioDurationSeconds = durationSeconds;
                        this.uploadPendingSOSAudio();
                    }

                    if (this.sosAudioStream) {
                        this.sosAudioStream.getTracks().forEach(track => track.stop());
                        this.sosAudioStream = null;
                    }

                    this.sosAudioRecorder = null;
                    this.sosAudioChunks = [];
                };

                recorder.start();

                this.sosAudioStopTimeoutId = setTimeout(() => {
                    this.stopSOSAudioRecording();
                }, RECORDING_DURATION_MS);
            })
            .catch((err) => {
                console.warn('Audio recording unavailable:', err.message || err);
            });
    },

    stopSOSAudioRecording: function () {
        if (this.sosAudioStopTimeoutId) {
            clearTimeout(this.sosAudioStopTimeoutId);
            this.sosAudioStopTimeoutId = null;
        }

        if (this.sosAudioRecorder && this.sosAudioRecorder.state === 'recording') {
            this.sosAudioRecorder.stop();
            return;
        }

        if (this.sosAudioStream) {
            this.sosAudioStream.getTracks().forEach(track => track.stop());
            this.sosAudioStream = null;
        }
    },

    uploadPendingSOSAudio: function () {
        if (!this.currentSOSIdForAudio || !this.pendingSOSAudioBlob) {
            return;
        }

        const formData = new FormData();
        const fileMimeType = this.pendingSOSAudioMimeType || this.pendingSOSAudioBlob.type || 'audio/webm';
        const extension = fileMimeType.includes('ogg') ? 'ogg' : 'webm';
        const fileName = `sos-audio-${Date.now()}.${extension}`;
        const audioFile = new File([this.pendingSOSAudioBlob], fileName, { type: fileMimeType });

        formData.append('audio', audioFile);
        formData.append('mimeType', fileMimeType);
        formData.append('durationSeconds', String(this.pendingSOSAudioDurationSeconds || 30));
        formData.append('timestamp', new Date().toISOString());

        fetch(`${API_BASE_URL}/sos/${this.currentSOSIdForAudio}/audio`, {
            method: 'POST',
            body: formData
        })
            .then(res => {
                if (!res.ok) {
                    throw new Error(`Audio upload failed with status ${res.status}`);
                }
                return res.json();
            })
            .then(() => {
                this.pendingSOSAudioBlob = null;
                this.pendingSOSAudioMimeType = 'audio/webm';
                this.pendingSOSAudioDurationSeconds = 30;
                this.showToast('Audio recorded and uploaded', 'success');
            })
            .catch((err) => {
                console.warn('SOS audio upload error:', err.message || err);
            });
    },

    captureSOSImage: function () {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            return;
        }

        this.showToast('Capturing image evidence...', 'success');

        navigator.mediaDevices.getUserMedia({
            video: { facingMode: { ideal: 'environment' } },
            audio: false
        })
            .then((stream) => {
                this.sosImageStream = stream;

                const video = document.createElement('video');
                video.srcObject = stream;
                video.muted = true;
                video.playsInline = true;

                video.onloadedmetadata = () => {
                    video.play()
                        .then(() => {
                            const canvas = document.createElement('canvas');
                            canvas.width = video.videoWidth || 640;
                            canvas.height = video.videoHeight || 480;
                            const ctx = canvas.getContext('2d');
                            if (ctx) {
                                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                                canvas.toBlob((blob) => {
                                    if (blob) {
                                        this.pendingSOSImageBlob = blob;
                                        this.pendingSOSImageMimeType = blob.type || 'image/jpeg';
                                        this.uploadPendingSOSImage();
                                    }
                                    this.stopSOSImageCapture();
                                }, 'image/jpeg', 0.9);
                            } else {
                                this.stopSOSImageCapture();
                            }
                        })
                        .catch(() => {
                            this.stopSOSImageCapture();
                        });
                };
            })
            .catch((err) => {
                console.warn('Image capture unavailable:', err.message || err);
            });
    },

    stopSOSImageCapture: function () {
        if (this.sosImageStream) {
            this.sosImageStream.getTracks().forEach(track => track.stop());
            this.sosImageStream = null;
        }
    },

    uploadPendingSOSImage: function () {
        if (!this.currentSOSIdForImage || !this.pendingSOSImageBlob) {
            return;
        }

        const formData = new FormData();
        const fileMimeType = this.pendingSOSImageMimeType || this.pendingSOSImageBlob.type || 'image/jpeg';
        const extension = fileMimeType.includes('png') ? 'png' : 'jpg';
        const fileName = `sos-image-${Date.now()}.${extension}`;
        const imageFile = new File([this.pendingSOSImageBlob], fileName, { type: fileMimeType });

        formData.append('image', imageFile);
        formData.append('mimeType', fileMimeType);
        formData.append('timestamp', new Date().toISOString());

        fetch(`${API_BASE_URL}/sos/${this.currentSOSIdForImage}/image`, {
            method: 'POST',
            body: formData
        })
            .then(res => {
                if (!res.ok) {
                    throw new Error(`Image upload failed with status ${res.status}`);
                }
                return res.json();
            })
            .then(() => {
                this.pendingSOSImageBlob = null;
                this.pendingSOSImageMimeType = 'image/jpeg';
            })
            .catch((err) => {
                console.warn('SOS image upload error:', err.message || err);
            });
    },

    startLiveTracking: function (sosId) {
        const TRACKING_INTERVAL_MS = 120000;

        this.stopLiveTracking(false);
        this.liveTrackingSosId = sosId;

        if (this.sosSubtext) {
            this.sosSubtext.textContent = 'Live location sharing every 2 minutes';
        }
        this.showToast('Live location sharing every 2 minutes', 'success');

        this.liveTrackingIntervalId = setInterval(() => {
            this.sendLiveTrackingUpdate();
        }, TRACKING_INTERVAL_MS);

        // Keep sharing while SOS session is active (until reset/cancel/logout)
        this.sendLiveTrackingUpdate();
    },

    sendLiveTrackingUpdate: function () {
        if (!this.liveTrackingSosId || !navigator.geolocation) {
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const payload = {
                    location: {
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude
                    },
                    timestamp: new Date()
                };

                fetch(`${API_BASE_URL}/sos/${this.liveTrackingSosId}/tracking`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(payload)
                })
                    .then(res => {
                        if (!res.ok) {
                            throw new Error(`Tracking update failed with status ${res.status}`);
                        }
                        return res.json();
                    })
                    .catch((err) => {
                        console.warn('Live tracking update error:', err.message);
                    });
            },
            (error) => {
                console.warn('Unable to fetch tracking location:', error.message || error);
            },
            {
                enableHighAccuracy: false,
                timeout: 8000,
                maximumAge: 5000
            }
        );
    },

    stopLiveTracking: function (showEndedMessage = false) {
        if (this.liveTrackingIntervalId) {
            clearInterval(this.liveTrackingIntervalId);
            this.liveTrackingIntervalId = null;
        }

        this.liveTrackingSosId = null;

        if (showEndedMessage) {
            if (this.sosSubtext) {
                this.sosSubtext.textContent = 'Live location sharing stopped';
            }
            this.showToast('Live location sharing stopped', 'success');
        }
    },

    resetSOS: function () {
        this.stopLiveTracking(false);
        this.stopSOSEvidenceRecording();
        this.stopSOSAudioRecording();
        this.stopSOSImageCapture();
        this.currentSOSIdForEvidence = null;
        this.currentSOSIdForAudio = null;
        this.currentSOSIdForImage = null;
        this.sosStatus.classList.add('hidden');
        this.sosBtnActive.style.display = 'block';
        this.sosBtnActive.disabled = false;
        this.sosText.style.display = 'block';
        this.sosText.textContent = "Tap for Emergency";
        if (this.sosSubtext) {
            this.sosSubtext.textContent = 'Help is on the way';
        }
        this.sosBtnActive.classList.remove('pulse-animation');
    },

    submitComplaint: function () {
        const submitBtn = this.complaintForm.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerText;
        const incident = document.getElementById('complaint-desc').value;
        const description = document.getElementById('complaint-description').value;
        const email = document.getElementById('complaint-email').value;
        const file = this.fileName.textContent || '';
        const userId = localStorage.getItem('safework_user_id') || 'guest_user';

        if (!incident || !email) {
            this.showToast('Please provide incident and your email.', 'error');
            return;
        }

        submitBtn.innerText = "Submitting...";
        submitBtn.disabled = true;
        this.showLoader('Submitting complaint...');

        fetch(`${API_BASE_URL}/complaint`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, incident, description, file, email })
        })
            .then(res => res.json().then(data => ({ status: res.status, body: data })))
            .then(response => {
                this.hideLoader();
                submitBtn.innerText = originalText;
                submitBtn.disabled = false;

                if (response.status === 200 || response.status === 201) {
                    this.complaintForm.style.display = 'none';
                    this.complaintSuccess.classList.remove('hidden');
                    this.showToast('Complaint submitted successfully', 'success');
                    this.loadComplaintStatus();
                } else {
                    this.showToast(response.body.msg || "Submission failed", 'error');
                }
            })
            .catch(err => {
                console.error(err);
                this.hideLoader();
                submitBtn.innerText = originalText;
                submitBtn.disabled = false;
                this.showToast("Server error. Is backend running?", 'error');
            });
    }
};


document.addEventListener('DOMContentLoaded', () => {
    app.init();
});
