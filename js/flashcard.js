        class FlashcardApp {
            constructor() {
                this.flashcards = [];
                this.currentIndex = 0;
                this.isFlipped = false;
                this.isLoading = false;
                this.currentSession = null;
                this.sessions = this.loadSessions();
                this.practiceStats = { correct: 0, incorrect: 0, total: 0 };
                this.missedWords = this.loadMissedWords();
                this.isReviewMode = false;
                this.currentEditingSession = null;
                
                this.initializeElements();
                this.bindEvents();
                this.renderSessions();
            }
            
            initializeElements() {
                this.hebrewInput = document.getElementById('hebrewInput');
                this.generateBtn = document.getElementById('generateBtn');
                this.flashcardContainer = document.getElementById('flashcardContainer');
                this.errorMessage = document.getElementById('errorMessage');
                this.sessionNameInput = document.getElementById('sessionNameInput');
                this.createSessionBtn = document.getElementById('createSessionBtn');
                this.sessionsList = document.getElementById('sessionsList');
                this.saveSessionBtn = document.getElementById('saveSessionBtn');
                this.addToSessionBtn = document.getElementById('addToSessionBtn');
                this.clearBtn = document.getElementById('clearBtn');
                this.currentSessionInfo = document.getElementById('currentSessionInfo');
                this.exportBtn = document.getElementById('exportBtn');
                this.importBtn = document.getElementById('importBtn');
                this.importInput = document.getElementById('importInput');
                this.reviewMissedBtn = document.getElementById('reviewMissedBtn');
                this.showMissedBtn = document.getElementById('showMissedBtn');
                this.generateSentenceBtn = document.getElementById('generateSentenceBtn');
                this.sentenceContainer = document.getElementById('sentenceContainer');
            }
            
            bindEvents() {
                this.generateBtn.addEventListener('click', () => this.generateFlashcards());
                this.createSessionBtn.addEventListener('click', () => this.createSession());
                this.saveSessionBtn.addEventListener('click', () => this.saveCurrentSession());
                this.addToSessionBtn.addEventListener('click', () => this.addToCurrentSession());
                this.clearBtn.addEventListener('click', () => this.clearInput());
                this.exportBtn.addEventListener('click', () => this.showExportModal());
                this.importBtn.addEventListener('click', () => this.importInput.click());
                this.importInput.addEventListener('change', (e) => this.importSessions(e));
                this.reviewMissedBtn.addEventListener('click', () => this.startReviewMode());
                this.showMissedBtn.addEventListener('click', () => this.showMissedWords());
                this.generateSentenceBtn.addEventListener('click', () => this.generateSentence());
                
                this.hebrewInput.addEventListener('keydown', (e) => {
                    if (e.ctrlKey && e.key === 'Enter') {
                        this.generateFlashcards();
                    }
                });
                
                this.sessionNameInput.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') {
                        this.createSession();
                    }
                });
                
                // Add event listener for practice input
                document.addEventListener('keydown', (e) => {
                    const practiceInput = document.getElementById('practiceInput');
                    if (practiceInput && e.key === 'Enter') {
                        this.checkAnswer();
                    }
                });

                document.addEventListener('keydown', (e) => {
                    if (e.ctrlKey && e.code === 'Space') {
                        e.preventDefault(); // Prevent default browser behavior
                        this.speakHebrew();
                    }
                });

                // Initialize speech synthesis voices
                if ('speechSynthesis' in window) {
                    // Load voices immediately if available
                    speechSynthesis.getVoices();
                    
                    // Also listen for when voices are loaded (some browsers load them asynchronously)
                    speechSynthesis.addEventListener('voiceschanged', () => {
                        speechSynthesis.getVoices();
                    });
                }
            }
            
            // Session Management
            loadSessions() {
                const saved = localStorage.getItem('hebrewFlashcardSessions');
                return saved ? JSON.parse(saved) : {};
            }
            
            saveSessions() {
                localStorage.setItem('hebrewFlashcardSessions', JSON.stringify(this.sessions));
            }
            
            // Missed Words Management
            loadMissedWords() {
                const saved = localStorage.getItem('hebrewMissedWords');
                return saved ? JSON.parse(saved) : {};
            }
            
            saveMissedWords() {
                localStorage.setItem('hebrewMissedWords', JSON.stringify(this.missedWords));
            }
            
            addToMissedWords(word) {
                const key = `${word.hebrew}-${word.english}`;
                if (!this.missedWords[key]) {
                    this.missedWords[key] = {
                        hebrew: word.hebrew,
                        english: word.english,
                        mistakes: 0,
                        firstMissed: new Date().toISOString(),
                        lastMissed: new Date().toISOString()
                    };
                }
                this.missedWords[key].mistakes++;
                this.missedWords[key].lastMissed = new Date().toISOString();
                this.saveMissedWords();
            }

            async generateSentence() {
                // Check if we have current flashcards
                if (!this.flashcards || this.flashcards.length === 0) {
                    this.showError('Please generate flashcards first!');
                    return;
                }
                
                // Get current word
                const currentWord = this.flashcards[this.currentIndex];
                if (!currentWord) {
                    this.showError('No word selected!');
                    return;
                }
                
                // Show loading state
                this.showSentenceLoading();
                
                try {
                    const response = await fetch('http://localhost:5000/generate-sentence', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            hebrew_word: currentWord.hebrew,
                            english_translation: currentWord.english
                        })
                    });
                    
                    const data = await response.json();
                    
                    if (data.success) {
                        this.displaySentence(data.sentence, currentWord);
                    } else {
                        this.showSentenceError(data.error || 'Failed to generate sentence');
                    }
                    
                } catch (error) {
                    console.error('Sentence generation error:', error);
                    this.showSentenceError('Failed to connect to sentence generator. Make sure the Flask server is running.');
                }
            }
            
            removeFromMissedWords(word) {
                const key = `${word.hebrew}-${word.english}`;
                if (this.missedWords[key]) {
                    delete this.missedWords[key];
                    this.saveMissedWords();
                }
            }
            
            startReviewMode() {
                const missedWordsList = Object.values(this.missedWords);
                
                if (missedWordsList.length === 0) {
                    this.showError('No missed words to review! Keep practicing to build your review list.');
                    return;
                }
                
                // Sort by number of mistakes (most mistakes first)
                missedWordsList.sort((a, b) => b.mistakes - a.mistakes);
                
                this.flashcards = missedWordsList;
                this.currentIndex = 0;
                this.isFlipped = false;
                this.isReviewMode = true;
                this.currentSession = null; // Clear current session
                
                this.renderFlashcard();
                this.updateSessionInfo();
                this.updateButtons();
                this.showSuccess(`Review Mode: ${missedWordsList.length} missed words loaded!`);
            }
            
            exitReviewMode() {
                this.isReviewMode = false;
                this.flashcards = [];
                this.renderFlashcard();
                this.updateSessionInfo();
                this.updateButtons();
            }
            
            createSession() {
                const name = this.sessionNameInput.value.trim();
                if (!name) {
                    this.showError('Please enter a session name!');
                    return;
                }
                
                if (this.sessions[name]) {
                    this.showError('Session name already exists!');
                    return;
                }
                
                this.sessions[name] = {
                    name: name,
                    words: [],
                    created: new Date().toISOString(),
                    lastModified: new Date().toISOString()
                };
                
                this.currentSession = name;
                this.sessionNameInput.value = '';
                this.saveSessions();
                this.renderSessions();
                this.updateSessionInfo();
                this.updateButtons();
                this.showSuccess(`Session "${name}" created!`);
            }
            
            loadSession(sessionName) {
                if (!this.sessions[sessionName]) return;
                
                this.currentSession = sessionName;
                const session = this.sessions[sessionName];
                
                // Load session words into flashcards
                this.flashcards = session.words;
                this.currentIndex = 0;
                this.isFlipped = false;
                
                // Update UI
                this.renderSessions();
                this.updateSessionInfo();
                this.updateButtons();
                this.renderFlashcard();
                
                this.showSuccess(`Loaded session "${sessionName}" with ${session.words.length} words`);
            }
            
            saveCurrentSession() {
                if (!this.currentSession || this.flashcards.length === 0) return;
                
                this.sessions[this.currentSession].words = [...this.flashcards];
                this.sessions[this.currentSession].lastModified = new Date().toISOString();
                this.saveSessions();
                this.renderSessions();
                this.showSuccess(`Session "${this.currentSession}" saved!`);
            }
            
            addToCurrentSession() {
                if (!this.currentSession) return;
                
                const existingWords = this.sessions[this.currentSession].words;
                const newWords = this.flashcards.filter(card => 
                    !existingWords.some(existing => existing.hebrew === card.hebrew)
                );
                
                if (newWords.length === 0) {
                    this.showError('No new words to add!');
                    return;
                }
                
                this.sessions[this.currentSession].words = [...existingWords, ...newWords];
                this.sessions[this.currentSession].lastModified = new Date().toISOString();
                this.flashcards = this.sessions[this.currentSession].words;
                this.currentIndex = 0;
                this.isFlipped = false;
                
                this.saveSessions();
                this.renderSessions();
                this.updateSessionInfo();
                this.renderFlashcard();
                this.showSuccess(`Added ${newWords.length} new words to session!`);
            }
            
            deleteSession(sessionName) {
                if (!confirm(`Are you sure you want to delete session "${sessionName}"?`)) return;
                
                delete this.sessions[sessionName];
                if (this.currentSession === sessionName) {
                    this.currentSession = null;
                    this.flashcards = [];
                    this.updateSessionInfo();
                    this.renderFlashcard();
                }
                
                this.saveSessions();
                this.renderSessions();
                this.updateButtons();
                this.showSuccess(`Session "${sessionName}" deleted!`);
            }
            
            renderSessions() {
                const sessionNames = Object.keys(this.sessions);
                
                if (sessionNames.length === 0) {
                    this.sessionsList.innerHTML = '<div style="text-align: center; color: #999; padding: 20px; font-size: 0.9rem;">No sessions yet. Create your first session!</div>';
                    return;
                }
                
                this.sessionsList.innerHTML = sessionNames.map(name => {
                    const session = this.sessions[name];
                    const isActive = this.currentSession === name;
                    const wordCount = session.words.length;
                    const lastModified = new Date(session.lastModified).toLocaleDateString();
                    
                    return `
                        <div class="session-item ${isActive ? 'active' : ''}" onclick="app.loadSession('${name}')">
                            <div class="session-name">${name}</div>
                            <div class="session-info">${wordCount} words • ${lastModified}</div>
                            <div class="session-actions">
                                <button class="session-action-btn load" onclick="event.stopPropagation(); app.loadSession('${name}')">Load</button>
                                <button class="session-action-btn" onclick="event.stopPropagation(); app.showSessionWords('${name}')" style="background: #17a2b8; color: white;">Show</button>
                                <button class="session-action-btn delete" onclick="event.stopPropagation(); app.deleteSession('${name}')">Delete</button>
                            </div>
                        </div>
                    `;
                }).join('');
            }
            
            updateSessionInfo() {
                if (this.isReviewMode) {
                    const totalMissed = Object.keys(this.missedWords).length;
                    this.currentSessionInfo.innerHTML = `
                        <div class="current-session-info" style="background: #ffeaa7; border-left-color: #e17055;">
                            <div class="current-session-name">📝 Review Mode: Missed Words</div>
                            <div class="current-session-stats">${this.flashcards.length} words to review • ${totalMissed} total missed words</div>
                            <button onclick="app.exitReviewMode()" style="margin-top: 10px; padding: 5px 10px; background: #636e72; color: white; border: none; border-radius: 5px; cursor: pointer;">Exit Review Mode</button>
                        </div>
                    `;
                    return;
                }
                
                if (!this.currentSession) {
                    this.currentSessionInfo.innerHTML = '';
                    return;
                }
                
                const session = this.sessions[this.currentSession];
                const wordCount = session.words.length;
                const lastModified = new Date(session.lastModified).toLocaleDateString();
                
                this.currentSessionInfo.innerHTML = `
                    <div class="current-session-info">
                        <div class="current-session-name">Current Session: ${this.currentSession}</div>
                        <div class="current-session-stats">${wordCount} words • Last modified: ${lastModified}</div>
                    </div>
                `;
            }
            
            updateButtons() {
                const hasSession = !!this.currentSession;
                const hasFlashcards = this.flashcards.length > 0;
                
                this.saveSessionBtn.disabled = !hasSession || !hasFlashcards || this.isReviewMode;
                this.addToSessionBtn.disabled = !hasSession || !hasFlashcards || this.isReviewMode;
                
                // Update review button text with count
                const missedCount = Object.keys(this.missedWords).length;
                this.reviewMissedBtn.textContent = `📝 Review Missed Words (${missedCount})`;
                this.reviewMissedBtn.disabled = missedCount === 0;
                
                // Update show missed button
                this.showMissedBtn.textContent = `👁️ Show Missed Words (${missedCount})`;
                this.showMissedBtn.disabled = missedCount === 0;
            }
            
            clearInput() {
                this.hebrewInput.value = '';
                this.flashcards = [];
                this.renderFlashcard();
                this.updateButtons();
                this.sentenceContainer.innerHTML = '';
            }

            showSentenceLoading() {
                this.sentenceContainer.innerHTML = `
                    <div class="sentence-container">
                        <div class="sentence-loading">Generating Hebrew sentence...</div>
                    </div>
                `;
            }

           displaySentence(sentence, word) {
                this.sentenceContainer.innerHTML = `
                    <div class="sentence-container">
                        <div class="sentence-hebrew">${sentence}
                            <button class="tts-btn" onclick="app.speakSentence('${sentence.replace(/'/g, "\\'")}', '${word.hebrew.replace(/'/g, "\\'")}')" title="Listen to sentence pronunciation">
                                🔊
                            </button>
                        </div>
                        <div class="sentence-info">
                            Example sentence using: <strong>${word.hebrew}</strong> (${word.english})
                        </div>
                    </div>
                `;
            }

            showSentenceError(message) {
                this.sentenceContainer.innerHTML = `
                    <div class="sentence-container">
                        <div class="sentence-error">${message}</div>
                    </div>
                `;
            }

            showExportModal() {
                const sessionNames = Object.keys(this.sessions);
                
                if (sessionNames.length === 0) {
                    this.showError('No sessions to export!');
                    return;
                }
                
                const modalHTML = `
                    <div class="modal-overlay" id="exportModal" onclick="app.closeExportModal(event)">
                        <div class="modal-content" onclick="event.stopPropagation()">
                            <div class="modal-header">
                                <h2>Export Sessions</h2>
                            </div>
                            <div class="modal-body">
                                <div class="export-options">
                                    <div class="export-option selected" onclick="app.selectExportOption('all')">
                                        <input type="radio" id="exportAll" name="exportType" value="all" checked>
                                        <label for="exportAll">Export All Sessions</label>
                                    </div>
                                    <div class="export-option" onclick="app.selectExportOption('individual')">
                                        <input type="radio" id="exportIndividual" name="exportType" value="individual">
                                        <label for="exportIndividual">Export Selected Sessions</label>
                                    </div>
                                </div>
                                
                                <div id="sessionSelection" style="display: none;">
                                    <div class="select-all-controls">
                                        <button class="select-control-btn" onclick="app.selectAllSessions(true)">Select All</button>
                                        <button class="select-control-btn" onclick="app.selectAllSessions(false)">Deselect All</button>
                                    </div>
                                    <div class="session-checkboxes" id="sessionCheckboxes">
                                        ${this.renderSessionCheckboxes()}
                                    </div>
                                </div>
                            </div>
                            <div class="modal-footer">
                                <button class="modal-btn primary" onclick="app.performExport()">Export</button>
                                <button class="modal-btn secondary" onclick="app.closeExportModal()">Cancel</button>
                            </div>
                        </div>
                    </div>
                `;
                
                document.body.insertAdjacentHTML('beforeend', modalHTML);
            }

            selectExportOption(type) {
                // Update radio buttons
                document.getElementById('exportAll').checked = (type === 'all');
                document.getElementById('exportIndividual').checked = (type === 'individual');
                
                // Update visual selection
                document.querySelectorAll('.export-option').forEach(option => {
                    option.classList.remove('selected');
                });
                
                if (type === 'all') {
                    document.querySelector('.export-option:first-child').classList.add('selected');
                    document.getElementById('sessionSelection').style.display = 'none';
                } else {
                    document.querySelector('.export-option:last-child').classList.add('selected');
                    document.getElementById('sessionSelection').style.display = 'block';
                }
            }

            renderSessionCheckboxes() {
                const sessionNames = Object.keys(this.sessions);
                
                return sessionNames.map(name => {
                    const session = this.sessions[name];
                    const wordCount = session.words.length;
                    const lastModified = new Date(session.lastModified).toLocaleDateString();
                    
                    return `
                        <div class="session-checkbox-item">
                            <input type="checkbox" id="session_${name}" value="${name}" checked>
                            <label for="session_${name}">${name}</label>
                            <div class="session-checkbox-info">${wordCount} words • ${lastModified}</div>
                        </div>
                    `;
                }).join('');
            }

            selectAllSessions(select) {
                const checkboxes = document.querySelectorAll('#sessionCheckboxes input[type="checkbox"]');
                checkboxes.forEach(checkbox => {
                    checkbox.checked = select;
                });
            }

            performExport() {
                const exportType = document.querySelector('input[name="exportType"]:checked').value;
                
                if (exportType === 'all') {
                    this.exportAllSessions();
                } else {
                    this.exportSelectedSessions();
                }
                
                this.closeExportModal();
            }

            exportAllSessions() {
                const dataStr = JSON.stringify(this.sessions, null, 2);
                const dataBlob = new Blob([dataStr], {type: 'application/json'});
                const url = URL.createObjectURL(dataBlob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `hebrew-flashcard-sessions-all-${new Date().toISOString().split('T')[0]}.json`;
                link.click();
                URL.revokeObjectURL(url);
                
                this.showSuccess('All sessions exported successfully!');
            }

            exportSelectedSessions() {
                const checkboxes = document.querySelectorAll('#sessionCheckboxes input[type="checkbox"]:checked');
                const selectedSessions = {};
                
                if (checkboxes.length === 0) {
                    this.showError('Please select at least one session to export!');
                    return;
                }
                
                checkboxes.forEach(checkbox => {
                    const sessionName = checkbox.value;
                    selectedSessions[sessionName] = this.sessions[sessionName];
                });
                
                const dataStr = JSON.stringify(selectedSessions, null, 2);
                const dataBlob = new Blob([dataStr], {type: 'application/json'});
                const url = URL.createObjectURL(dataBlob);
                const link = document.createElement('a');
                link.href = url;
                
                const sessionCount = checkboxes.length;
                const fileName = sessionCount === 1 ? 
                    `hebrew-flashcard-session-${checkboxes[0].value}-${new Date().toISOString().split('T')[0]}.json` :
                    `hebrew-flashcard-sessions-${sessionCount}-selected-${new Date().toISOString().split('T')[0]}.json`;
                
                link.download = fileName;
                link.click();
                URL.revokeObjectURL(url);
                
                this.showSuccess(`${sessionCount} session(s) exported successfully!`);
            }

            closeExportModal(event) {
                // Only close if clicking on overlay, not modal content
                if (event && event.target !== event.currentTarget) return;
                
                const modal = document.getElementById('exportModal');
                if (modal) {
                    modal.remove();
                }
            }
            
            // Import/Export functionality            
            importSessions(event) {
                const file = event.target.files[0];
                if (!file) return;
                
                const reader = new FileReader();
                reader.onload = (e) => {
                    try {
                        const importedSessions = JSON.parse(e.target.result);
                        
                        // Merge with existing sessions
                        Object.keys(importedSessions).forEach(name => {
                            if (this.sessions[name]) {
                                // Ask user if they want to overwrite
                                if (confirm(`Session "${name}" already exists. Overwrite?`)) {
                                    this.sessions[name] = importedSessions[name];
                                }
                            } else {
                                this.sessions[name] = importedSessions[name];
                            }
                        });
                        
                        this.saveSessions();
                        this.renderSessions();
                        this.showSuccess('Sessions imported successfully!');
                    } catch (error) {
                        this.showError('Invalid file format!');
                    }
                };
                reader.readAsText(file);
                event.target.value = ''; // Reset input
            }
            
            // Flashcard functionality (existing code remains the same)
            async generateFlashcards() {
                const text = this.hebrewInput.value.trim();
                if (!text) {
                    this.showError('Please enter some Hebrew words!');
                    return;
                }
                
                const words = text.split('\n').filter(word => word.trim() !== '');
                if (words.length === 0) {
                    this.showError('No valid words found!');
                    return;
                }
                
                this.showLoading();
                this.clearError();
                
                try {
                    const translations = await this.translateWords(words);
                    const newFlashcards = words.map((word, index) => ({
                        hebrew: word.trim(),
                        english: translations[index] || 'Translation not available'
                    }));
                    
                    this.flashcards = newFlashcards;
                    this.currentIndex = 0;
                    this.isFlipped = false;
                    this.renderFlashcard();
                    this.updateButtons();
                } catch (error) {
                    this.showError('Failed to translate words. Please try again.');
                    console.error('Translation error:', error);
                } finally {
                    this.hideLoading();
                }
            }
            
            async translateWords(words) {
                const translations = [];
                
                for (const word of words) {
                    try {
                        let translation = await this.translateWithGoogle(word);
                        
                        if (!translation) {
                            translation = await this.translateWithMyMemory(word);
                        }
                        
                        translations.push(translation || word);
                        await new Promise(resolve => setTimeout(resolve, 200));
                    } catch (error) {
                        console.error(`Failed to translate "${word}":`, error);
                        translations.push(word);
                    }
                }
                
                return translations;
            }
            
            async translateWithGoogle(text) {
                try {
                    const response = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=he&tl=en&dt=t&q=${encodeURIComponent(text)}`);
                    const data = await response.json();
                    return data[0][0][0];
                } catch (error) {
                    console.error('Google Translate error:', error);
                    return null;
                }
            }
            
            async translateWithMyMemory(text) {
                try {
                    const response = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=he|en`);
                    const data = await response.json();
                    return data.responseData.translatedText;
                } catch (error) {
                    console.error('MyMemory Translate error:', error);
                    return null;
                }
            }
            
            renderFlashcard() {
                if (this.flashcards.length === 0) {
                    this.flashcardContainer.innerHTML = '<div style="text-align: center; color: #999; padding: 50px;">No flashcards generated yet.</div>';
                    return;
                }
                
                const card = this.flashcards[this.currentIndex];
                const flippedClass = this.isFlipped ? 'flipped' : '';
                
                // Show additional info for review mode
                const reviewInfo = this.isReviewMode ? 
                    `<div style="background: #fff3cd; color: #856404; padding: 10px; border-radius: 8px; margin-bottom: 15px; border: 1px solid #ffeaa7;">
                        <strong>⚠️ Missed ${card.mistakes || 0} time(s)</strong> • Last missed: ${new Date(card.lastMissed || '').toLocaleDateString()}
                    </div>` : '';
                
                this.flashcardContainer.innerHTML = `
                    <div class="progress">
                        Card ${this.currentIndex + 1} of ${this.flashcards.length}
                    </div>
                    
                    ${reviewInfo}
                    
                    <div class="controls">
                        <button class="control-btn prev-btn" onclick="app.previousCard()" ${this.currentIndex === 0 ? 'disabled' : ''}>
                            ← Previous
                        </button>
                        <button class="control-btn shuffle-btn" onclick="app.shuffleCards()">
                            🔀 Shuffle
                        </button>
                        <button class="control-btn flip-btn" onclick="app.flipCard()">
                            ${this.isFlipped ? 'Show English' : 'Show Hebrew'}
                        </button>
                        <button class="control-btn next-btn" onclick="app.nextCard()" ${this.currentIndex === this.flashcards.length - 1 ? 'disabled' : ''}>
                            Next →
                        </button>
                    </div>
                    
                    <div class="flashcard ${flippedClass}" onclick="app.flipCard()">
                        <div class="flashcard-inner">
                            <div class="flashcard-front">
                                ${card.english}
                            </div>
                            <div class="flashcard-back">
                                ${card.hebrew}
                            </div>
                        </div>
                    </div>
                    
                    <div class="typing-practice">
                        <h3 class="practice-title">Type the Hebrew Word
                             <button class="tts-btn" onclick="app.speakHebrew()" title="Listen to pronunciation (Ctrl+Space)">
                             🔊
                            </button></h3>
                        <div class="practice-prompt">
                            English: <strong>${card.english}</strong>
                        </div>
                        <div class="practice-input-container">
                            <input type="text" class="practice-input" id="practiceInput" placeholder="הקלד כאן בעברית..." dir="rtl" autofocus>
                            <button class="practice-check-btn" onclick="app.checkAnswer()">Check</button>
                        </div>
                        <div class="practice-feedback" id="practiceFeedback"></div>
                        <div class="practice-hint" id="practiceHint"></div>
                    </div>
                `;
                
                // Auto-focus the practice input after rendering
                setTimeout(() => {
                    const practiceInput = document.getElementById('practiceInput');
                    if (practiceInput) {
                        practiceInput.focus();
                    }
                }, 100);
            }
            
            flipCard() {
                this.isFlipped = !this.isFlipped;
                this.renderFlashcard();
            }
            
            nextCard() {
                if (this.currentIndex < this.flashcards.length - 1) {
                    this.currentIndex++;
                    this.isFlipped = false;
                    this.renderFlashcard();
                    this.clearPracticeInput();
                    this.sentenceContainer.innerHTML = '';
                }
            }
            
            previousCard() {
                if (this.currentIndex > 0) {
                    this.currentIndex--;
                    this.isFlipped = false;
                    this.renderFlashcard();
                    this.clearPracticeInput();
                    this.sentenceContainer.innerHTML = '';
                }
            }

            speakHebrew() {
                if (this.flashcards.length === 0) return;
    
                const hebrewWord = this.flashcards[this.currentIndex].hebrew;
    
                if ('speechSynthesis' in window) {
                    window.speechSynthesis.cancel();
        
                const utterance = new SpeechSynthesisUtterance(hebrewWord);
        
                // Try to find a Hebrew voice
                const voices = window.speechSynthesis.getVoices();
                const hebrewVoice = voices.find(voice => 
                    voice.lang.startsWith('he') || 
                    voice.name.toLowerCase().includes('hebrew')
            );
        
                if (hebrewVoice) {
                    utterance.voice = hebrewVoice;
            }
        
                utterance.lang = 'he-IL';
                utterance.rate = 0.8;
                utterance.pitch = 1;
                utterance.volume = 1;
        
                window.speechSynthesis.speak(utterance);
        
                // Visual feedback
                const ttsBtn = document.querySelector('.tts-btn');
                if (ttsBtn) {
                    ttsBtn.textContent = '🔉';
                    setTimeout(() => {
                        ttsBtn.textContent = '🔊';
                    }, 1000);
                }
            } else {
                 this.showError('Text-to-speech is not supported in your browser.');
                }
            }

            speakSentence(sentence, highlightWord) {
                if ('speechSynthesis' in window) {
                    window.speechSynthesis.cancel();
                    
                    const utterance = new SpeechSynthesisUtterance(sentence);
                    
                    // Try to find a Hebrew voice
                    const voices = window.speechSynthesis.getVoices();
                    const hebrewVoice = voices.find(voice => 
                        voice.lang.startsWith('he') || 
                        voice.name.toLowerCase().includes('hebrew')
                    );
                    
                    if (hebrewVoice) {
                        utterance.voice = hebrewVoice;
                    }
                    
                    utterance.lang = 'he-IL';
                    utterance.rate = 0.7; // Slightly slower for sentences
                    utterance.pitch = 1;
                    utterance.volume = 1;
                    
                    window.speechSynthesis.speak(utterance);
                    
                    // Visual feedback for sentence TTS button
                    const sentenceTtsBtn = document.querySelector('.sentence-container .tts-btn');
                    if (sentenceTtsBtn) {
                        sentenceTtsBtn.textContent = '🔉';
                        setTimeout(() => {
                            sentenceTtsBtn.textContent = '🔊';
                        }, 2000); // Longer timeout for sentences
                    }
                } else {
                    this.showError('Text-to-speech is not supported in your browser.');
                }
            }
            
            // New typing practice functions
            checkAnswer() {
                const practiceInput = document.getElementById('practiceInput');
                const feedbackDiv = document.getElementById('practiceFeedback');
                const hintDiv = document.getElementById('practiceHint');
                
                if (!practiceInput || !feedbackDiv) return;
                
                const userInput = practiceInput.value.trim();
                const correctAnswer = this.flashcards[this.currentIndex].hebrew;
                
                if (!userInput) {
                    feedbackDiv.innerHTML = '';
                    feedbackDiv.className = 'practice-feedback';
                    return;
                }
                
                // Normalize both strings for comparison (remove extra spaces, normalize)
                const normalizedInput = this.normalizeHebrew(userInput);
                const normalizedCorrect = this.normalizeHebrew(correctAnswer);
                
                const isCorrect = normalizedInput === normalizedCorrect;
                
                // Update stats
                this.practiceStats.total++;
                if (isCorrect) {
                    this.practiceStats.correct++;
                } else {
                    this.practiceStats.incorrect++;
                }
                
                // Update UI
                if (isCorrect) {
                    practiceInput.className = 'practice-input correct';
                    feedbackDiv.className = 'practice-feedback correct';
                    feedbackDiv.innerHTML = '✅ Correct! Well done!';
                    hintDiv.innerHTML = '';
                    
                    // If in review mode and answered correctly, remove from missed words
                    if (this.isReviewMode) {
                        this.removeFromMissedWords(this.flashcards[this.currentIndex]);
                        // Update the flashcards array to remove this word
                        this.flashcards.splice(this.currentIndex, 1);
                        
                        // Adjust current index if needed
                        if (this.currentIndex >= this.flashcards.length) {
                            this.currentIndex = Math.max(0, this.flashcards.length - 1);
                        }
                        
                        // Check if we finished reviewing all words
                        if (this.flashcards.length === 0) {
                            this.showSuccess('🎉 Congratulations! You\'ve mastered all your missed words!');
                            this.exitReviewMode();
                            return;
                        }
                        
                        // Immediately show next card in review mode
                        this.renderFlashcard();
                        return;
                    }
                    
                    // Auto-advance after a short delay (normal mode)
                    setTimeout(() => {
                        if (this.currentIndex < this.flashcards.length - 1) {
                            this.nextCard();
                        }
                    }, 1500);
                } else {
                    practiceInput.className = 'practice-input incorrect';
                    feedbackDiv.className = 'practice-feedback incorrect';
                    feedbackDiv.innerHTML = '❌ Incorrect. Try again!';
                    
                    // Add to missed words
                    this.addToMissedWords(this.flashcards[this.currentIndex]);
                    
                    // Show hint
                    const similarity = this.calculateSimilarity(normalizedInput, normalizedCorrect);
                    if (similarity > 0.5) {
                        hintDiv.innerHTML = '💡 You\'re close! Check your spelling.';
                    } else {
                        hintDiv.innerHTML = `💡 Hint: The word starts with "${correctAnswer.charAt(0)}"`;
                    }
                }
                
                // Update stats display and buttons
                this.updateStatsDisplay();
                this.updateButtons();
            }
            
            normalizeHebrew(text) {
                // Remove extra spaces and normalize Hebrew text
                return text.trim()
                    .replace(/\s+/g, ' ')
                    .replace(/[\u0591-\u05C7]/g, '') // Remove Hebrew diacritics
                    .toLowerCase();
            }
            
            calculateSimilarity(str1, str2) {
                const longer = str1.length > str2.length ? str1 : str2;
                const shorter = str1.length > str2.length ? str2 : str1;
                
                if (longer.length === 0) return 1.0;
                
                const distance = this.levenshteinDistance(longer, shorter);
                return (longer.length - distance) / longer.length;
            }
            
            levenshteinDistance(str1, str2) {
                const matrix = [];
                
                for (let i = 0; i <= str2.length; i++) {
                    matrix[i] = [i];
                }
                
                for (let j = 0; j <= str1.length; j++) {
                    matrix[0][j] = j;
                }
                
                for (let i = 1; i <= str2.length; i++) {
                    for (let j = 1; j <= str1.length; j++) {
                        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                            matrix[i][j] = matrix[i - 1][j - 1];
                        } else {
                            matrix[i][j] = Math.min(
                                matrix[i - 1][j - 1] + 1,
                                matrix[i][j - 1] + 1,
                                matrix[i - 1][j] + 1
                            );
                        }
                    }
                }
                
                return matrix[str2.length][str1.length];
            }
            
            clearPracticeInput() {
                const practiceInput = document.getElementById('practiceInput');
                const feedbackDiv = document.getElementById('practiceFeedback');
                const hintDiv = document.getElementById('practiceHint');
                
                if (practiceInput) {
                    practiceInput.value = '';
                    practiceInput.className = 'practice-input';
                    // Auto-focus the input field
                    setTimeout(() => practiceInput.focus(), 100);
                }
                if (feedbackDiv) {
                    feedbackDiv.innerHTML = '';
                    feedbackDiv.className = 'practice-feedback';
                }
                if (hintDiv) {
                    hintDiv.innerHTML = '';
                }
            }
            
            updateStatsDisplay() {
                // This will be called to update stats if we add a stats display
                const accuracy = this.practiceStats.total > 0 ? 
                    Math.round((this.practiceStats.correct / this.practiceStats.total) * 100) : 0;
                    
                console.log(`Practice Stats: ${this.practiceStats.correct}/${this.practiceStats.total} (${accuracy}%)`);
            }
            
            // Shuffle functionality
            shuffleCards() {
                if (this.flashcards.length <= 1) {
                    this.showError('Need at least 2 cards to shuffle!');
                    return;
                }
                
                // Fisher-Yates shuffle algorithm
                const shuffled = [...this.flashcards];
                for (let i = shuffled.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
                }
                
                this.flashcards = shuffled;
                this.currentIndex = 0;
                this.isFlipped = false;
                this.clearPracticeInput();
                this.renderFlashcard();
                
                this.showSuccess('Cards shuffled! 🔀');
            }
            
            // Session Editor Modal Functions
            showSessionWords(sessionName) {
                if (!this.sessions[sessionName]) return;
                
                const session = this.sessions[sessionName];
                this.currentEditingSession = sessionName;
                
                const modalHTML = `
                    <div class="modal-overlay" id="sessionModal" onclick="app.closeSessionModal(event)">
                        <div class="modal-content" onclick="event.stopPropagation()">
                            <div class="modal-header">
                                <h2>Edit Session: ${sessionName}</h2>
                            </div>
                            <div class="modal-body">
                                <div class="word-count">
                                    Total words: <strong>${session.words.length}</strong>
                                </div>
                                <div class="word-list" id="wordList">
                                    ${this.renderWordList(session.words)}
                                </div>
                                <div class="add-word-section">
                                    <div class="add-word-title">Add New Word</div>
                                    <div class="add-word-form">
                                        <input type="text" class="add-word-input hebrew" id="newHebrew" placeholder="Hebrew word..." dir="rtl">
                                        <input type="text" class="add-word-input" id="newEnglish" placeholder="English translation...">
                                        <button class="add-word-btn" onclick="app.addNewWord()">Add</button>
                                    </div>
                                </div>
                            </div>
                            <div class="modal-footer">
                                <button class="modal-btn primary" onclick="app.saveSessionChanges()">Save Changes</button>
                                <button class="modal-btn secondary" onclick="app.closeSessionModal()">Close</button>
                            </div>
                        </div>
                    </div>
                `;
                
                document.body.insertAdjacentHTML('beforeend', modalHTML);
            }
            
            renderWordList(words) {
                if (words.length === 0) {
                    return '<div style="text-align: center; color: #999; padding: 20px;">No words in this session yet.</div>';
                }
                
                return words.map((word, index) => `
                    <div class="word-item" data-index="${index}">
                        <div class="word-hebrew">${word.hebrew}</div>
                        <div class="word-separator">→</div>
                        <div class="word-english">${word.english}</div>
                        <div class="word-actions">
                            <button class="word-action-btn edit" onclick="app.editWord(${index})">Edit</button>
                            <button class="word-action-btn delete" onclick="app.deleteWord(${index})">Delete</button>
                        </div>
                    </div>
                `).join('');
            }
            
            addNewWord() {
                const hebrewInput = document.getElementById('newHebrew');
                const englishInput = document.getElementById('newEnglish');
                
                const hebrew = hebrewInput.value.trim();
                const english = englishInput.value.trim();
                
                if (!hebrew || !english) {
                    alert('Please enter both Hebrew and English words!');
                    return;
                }
                
                const session = this.sessions[this.currentEditingSession];
                
                // Check for duplicates
                const exists = session.words.some(word => 
                    word.hebrew === hebrew || word.english === english
                );
                
                if (exists) {
                    alert('This word already exists in the session!');
                    return;
                }
                
                // Add the new word
                session.words.push({ hebrew, english });
                
                // Clear inputs
                hebrewInput.value = '';
                englishInput.value = '';
                
                // Refresh the word list
                const wordList = document.getElementById('wordList');
                wordList.innerHTML = this.renderWordList(session.words);
                
                // Update word count
                document.querySelector('.word-count strong').textContent = session.words.length;
                
                // Focus back to hebrew input
                hebrewInput.focus();
            }
            
            editWord(index) {
                const session = this.sessions[this.currentEditingSession];
                const word = session.words[index];
                
                const newHebrew = prompt('Edit Hebrew word:', word.hebrew);
                if (newHebrew === null) return; // User cancelled
                
                const newEnglish = prompt('Edit English translation:', word.english);
                if (newEnglish === null) return; // User cancelled
                
                if (!newHebrew.trim() || !newEnglish.trim()) {
                    alert('Both Hebrew and English words are required!');
                    return;
                }
                
                // Update the word
                session.words[index] = {
                    hebrew: newHebrew.trim(),
                    english: newEnglish.trim()
                };
                
                // Refresh the word list
                const wordList = document.getElementById('wordList');
                wordList.innerHTML = this.renderWordList(session.words);
            }
            
            deleteWord(index) {
                const session = this.sessions[this.currentEditingSession];
                const word = session.words[index];
                
                if (!confirm(`Are you sure you want to delete "${word.hebrew}" → "${word.english}"?`)) {
                    return;
                }
                
                // Remove the word
                session.words.splice(index, 1);
                
                // Refresh the word list
                const wordList = document.getElementById('wordList');
                wordList.innerHTML = this.renderWordList(session.words);
                
                // Update word count
                document.querySelector('.word-count strong').textContent = session.words.length;
            }
            
            saveSessionChanges() {
                // Update last modified date
                this.sessions[this.currentEditingSession].lastModified = new Date().toISOString();
                
                // Save to localStorage
                this.saveSessions();
                
                // Update UI if this is the current session
                if (this.currentSession === this.currentEditingSession) {
                    this.flashcards = this.sessions[this.currentEditingSession].words;
                    this.renderFlashcard();
                    this.updateSessionInfo();
                }
                
                // Refresh sessions list
                this.renderSessions();
                
                // Close modal
                this.closeSessionModal();
                
                this.showSuccess(`Session "${this.currentEditingSession}" updated successfully!`);
            }
            
            closeSessionModal(event) {
                // Only close if clicking on overlay, not modal content
                if (event && event.target !== event.currentTarget) return;
                
                const modal = document.getElementById('sessionModal');
                if (modal) {
                    modal.remove();
                }
                this.currentEditingSession = null;
            }
            
            // Missed Words Editor Modal Functions
            showMissedWords() {
                const missedWordsList = Object.values(this.missedWords);
                
                if (missedWordsList.length === 0) {
                    this.showError('No missed words to show! Keep practicing to build your missed words list.');
                    return;
                }
                
                // Sort by number of mistakes (most mistakes first)
                missedWordsList.sort((a, b) => b.mistakes - a.mistakes);
                
                const modalHTML = `
                    <div class="modal-overlay" id="missedWordsModal" onclick="app.closeMissedWordsModal(event)">
                        <div class="modal-content" onclick="event.stopPropagation()">
                            <div class="modal-header" style="background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%);">
                                <h2>📝 Manage Missed Words</h2>
                            </div>
                            <div class="modal-body">
                                <div class="word-count">
                                    Total missed words: <strong>${missedWordsList.length}</strong>
                                </div>
                                <button class="clear-all-missed" onclick="app.clearAllMissedWords()">
                                    🗑️ Clear All Missed Words
                                </button>
                                <div class="word-list" id="missedWordList">
                                    ${this.renderMissedWordList(missedWordsList)}
                                </div>
                            </div>
                            <div class="modal-footer">
                                <button class="modal-btn primary">Changes Saved Automatically</button>
                                <button class="modal-btn secondary" onclick="app.closeMissedWordsModal()">Close</button>
                            </div>
                        </div>
                    </div>
                `;
                
                document.body.insertAdjacentHTML('beforeend', modalHTML);
            }
            
            renderMissedWordList(missedWords) {
                if (missedWords.length === 0) {
                    return '<div style="text-align: center; color: #999; padding: 20px;">No missed words yet. Great job!</div>';
                }
                
                return missedWords.map((word, index) => {
                    const lastMissed = new Date(word.lastMissed).toLocaleDateString();
                    const firstMissed = new Date(word.firstMissed).toLocaleDateString();
                    const key = `${word.hebrew}-${word.english}`;
                    
                    return `
                        <div class="missed-word-item" data-key="${key}">
                            <div class="missed-stats">
                                <div><strong>${word.mistakes}</strong> mistakes</div>
                                <div style="font-size: 0.7rem; margin-top: 2px;">Last: ${lastMissed}</div>
                            </div>
                            <div class="word-hebrew">${word.hebrew}</div>
                            <div class="word-separator">→</div>
                            <div class="word-english">${word.english}</div>
                            <div class="word-actions">
                                <button class="word-action-btn edit" onclick="app.editMissedWord('${key}')">Edit</button>
                                <button class="word-action-btn delete" onclick="app.deleteMissedWord('${key}')">Remove</button>
                            </div>
                        </div>
                    `;
                }).join('');
            }
            
            editMissedWord(key) {
                const word = this.missedWords[key];
                if (!word) return;
                
                const newHebrew = prompt('Edit Hebrew word:', word.hebrew);
                if (newHebrew === null) return; // User cancelled
                
                const newEnglish = prompt('Edit English translation:', word.english);
                if (newEnglish === null) return; // User cancelled
                
                if (!newHebrew.trim() || !newEnglish.trim()) {
                    alert('Both Hebrew and English words are required!');
                    return;
                }
                
                // Remove old entry
                delete this.missedWords[key];
                
                // Add updated entry with new key
                const newKey = `${newHebrew.trim()}-${newEnglish.trim()}`;
                this.missedWords[newKey] = {
                    hebrew: newHebrew.trim(),
                    english: newEnglish.trim(),
                    mistakes: word.mistakes,
                    firstMissed: word.firstMissed,
                    lastMissed: word.lastMissed
                };
                
                // Save changes
                this.saveMissedWords();
                
                // Refresh the word list
                const missedWordsList = Object.values(this.missedWords);
                missedWordsList.sort((a, b) => b.mistakes - a.mistakes);
                
                const wordList = document.getElementById('missedWordList');
                wordList.innerHTML = this.renderMissedWordList(missedWordsList);
                
                // Update word count
                document.querySelector('.word-count strong').textContent = missedWordsList.length;
                
                // Update buttons
                this.updateButtons();
            }
            
            deleteMissedWord(key) {
                const word = this.missedWords[key];
                if (!word) return;
                
                if (!confirm(`Are you sure you want to remove "${word.hebrew}" → "${word.english}" from missed words?\n\nThis word had ${word.mistakes} mistake(s).`)) {
                    return;
                }
                
                // Remove the word
                delete this.missedWords[key];
                this.saveMissedWords();
                
                // Refresh the word list
                const missedWordsList = Object.values(this.missedWords);
                missedWordsList.sort((a, b) => b.mistakes - a.mistakes);
                
                const wordList = document.getElementById('missedWordList');
                wordList.innerHTML = this.renderMissedWordList(missedWordsList);
                
                // Update word count
                document.querySelector('.word-count strong').textContent = missedWordsList.length;
                
                // Update buttons
                this.updateButtons();
                
                // If we're in review mode and this word was being reviewed, refresh the review
                if (this.isReviewMode) {
                    this.flashcards = this.flashcards.filter(card => 
                        `${card.hebrew}-${card.english}` !== key
                    );
                    
                    if (this.flashcards.length === 0) {
                        this.showSuccess('🎉 All missed words have been cleared!');
                        this.exitReviewMode();
                        this.closeMissedWordsModal();
                        return;
                    }
                    
                    // Adjust current index if needed
                    if (this.currentIndex >= this.flashcards.length) {
                        this.currentIndex = Math.max(0, this.flashcards.length - 1);
                    }
                    
                    this.renderFlashcard();
                }
            }
            
            clearAllMissedWords() {
                const count = Object.keys(this.missedWords).length;
                
                if (!confirm(`Are you sure you want to clear ALL ${count} missed words?\n\nThis action cannot be undone!`)) {
                    return;
                }
                
                // Clear all missed words
                this.missedWords = {};
                this.saveMissedWords();
                
                // Update buttons
                this.updateButtons();
                
                // If in review mode, exit it
                if (this.isReviewMode) {
                    this.exitReviewMode();
                }
                
                // Close modal and show success
                this.closeMissedWordsModal();
                this.showSuccess('🗑️ All missed words have been cleared!');
            }
            
            closeMissedWordsModal(event) {
                // Only close if clicking on overlay, not modal content
                if (event && event.target !== event.currentTarget) return;
                
                const modal = document.getElementById('missedWordsModal');
                if (modal) {
                    modal.remove();
                }
            }
            
            showLoading() {
                this.isLoading = true;
                this.generateBtn.disabled = true;
                this.generateBtn.textContent = 'Translating...';
                this.flashcardContainer.innerHTML = '<div class="loading">Translating your Hebrew words...</div>';
            }
            
            hideLoading() {
                this.isLoading = false;
                this.generateBtn.disabled = false;
                this.generateBtn.textContent = 'Generate Flashcards';
            }
            
            showError(message) {
                this.errorMessage.innerHTML = `<div class="error">${message}</div>`;
                setTimeout(() => this.clearError(), 5000);
            }
            
            showSuccess(message) {
                this.errorMessage.innerHTML = `<div class="success">${message}</div>`;
                setTimeout(() => this.clearError(), 3000);
            }
            
            clearError() {
                this.errorMessage.innerHTML = '';
            }
        }
        
        // Initialize the app
        const app = new FlashcardApp();