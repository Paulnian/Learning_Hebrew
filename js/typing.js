        let targetText = '';
        let currentIndex = 0;
        let errors = 0;
        let totalTyped = 0;
        let selectedWords = new Set();
        let sessions = loadSessions();
        
        // Timer variables
        let timerInterval = null;
        let startTime = 0;
        let elapsedTime = 0;
        let isTimerRunning = false;

        function loadSessions() {
            const saved = localStorage.getItem('hebrewFlashcardSessions');
            return saved ? JSON.parse(saved) : {};
        }

        function saveSessions() {
            localStorage.setItem('hebrewFlashcardSessions', JSON.stringify(sessions));
        }

        function startPractice() {
            const input = document.getElementById('textInput').value.trim();
            if (!input) {
                showMessage('אנא הכנס טקסט לתרגול', 'error');
                return;
            }

            targetText = input;
            currentIndex = 0;
            errors = 0;
            totalTyped = 0;

            displayText();
            document.getElementById('typingInput').disabled = false;
            document.getElementById('typingInput').focus();
            document.getElementById('typingInput').value = '';
            updateStats();
            hideMessage();
        }

        function resetPractice() {
            targetText = '';
            currentIndex = 0;
            errors = 0;
            totalTyped = 0;
            selectedWords.clear();
            
            document.getElementById('textInput').value = '';
            document.getElementById('textDisplay').innerHTML = '';
            document.getElementById('typingInput').value = '';
            document.getElementById('typingInput').disabled = true;
            updateStats();
            updateSelectedWordsDisplay();
            hideMessage();
        }

        function toggleTimer() {
            if (isTimerRunning) {
                stopTimer();
            } else {
                startTimer();
            }
        }

        function startTimer() {
            if (!isTimerRunning) {
                startTime = Date.now() - elapsedTime;
                timerInterval = setInterval(updateTimer, 100);
                isTimerRunning = true;
                
                const button = document.getElementById('timerButton');
                button.textContent = 'עצור שעון עצר';
                button.classList.add('stop');
            }
        }

        function stopTimer() {
            if (isTimerRunning) {
                clearInterval(timerInterval);
                isTimerRunning = false;
                
                const button = document.getElementById('timerButton');
                button.textContent = 'התחל שעון עצר';
                button.classList.remove('stop');
            }
        }

        function resetTimer() {
            stopTimer();
            elapsedTime = 0;
            updateTimerDisplay();
        }

        function updateTimer() {
            elapsedTime = Date.now() - startTime;
            updateTimerDisplay();
        }

        function updateTimerDisplay() {
            const minutes = Math.floor(elapsedTime / 60000);
            const seconds = Math.floor((elapsedTime % 60000) / 1000);
            const display = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            document.getElementById('timerDisplay').textContent = display;
        }

        function displayText() {
            const display = document.getElementById('textDisplay');
            const typedText = document.getElementById('typingInput').value;
            let html = '';
            
            // Split text into tokens (words and whitespace) while preserving exact spacing
            const tokens = targetText.split(/(\s+)/);
            let charPosition = 0;
            
            for (let tokenIndex = 0; tokenIndex < tokens.length; tokenIndex++) {
                const token = tokens[tokenIndex];
                const isWhitespace = /^\s+$/.test(token);
                
                if (isWhitespace) {
                    // Handle whitespace - preserve exact spacing
                    for (let i = 0; i < token.length; i++) {
                        const char = token[i];
                        let className = '';
                        
                        if (charPosition < typedText.length) {
                            if (typedText[charPosition] === targetText[charPosition]) {
                                className = 'correct';
                            } else {
                                className = 'incorrect';
                            }
                        } else if (charPosition === typedText.length) {
                            className = 'current';
                        }

                        if (char === '\n') {
                            html += `<span class="char ${className}">↵</span><br>`;
                        } else if (char === ' ') {
                            html += `<span class="char ${className}">&nbsp;</span>`;
                        } else if (char === '\t') {
                            html += `<span class="char ${className}">&nbsp;&nbsp;&nbsp;&nbsp;</span>`;
                        } else {
                            html += `<span class="char ${className}">&nbsp;</span>`;
                        }
                        charPosition++;
                    }
                } else if (token.trim()) {
                    // Handle actual words - make them selectable but preserve spacing
                    const cleanWord = token.trim();
                    const isSelected = selectedWords.has(cleanWord);
                    const wordClass = isSelected ? 'word-selectable word-selected' : 'word-selectable';
                    
                    html += `<span class="${wordClass}" onclick="toggleWordSelection('${cleanWord.replace(/'/g, "\\'")}')">`;
                    
                    for (let i = 0; i < token.length; i++) {
                        const char = token[i];
                        let className = '';
                        
                        if (charPosition < typedText.length) {
                            if (typedText[charPosition] === targetText[charPosition]) {
                                className = 'correct';
                            } else {
                                className = 'incorrect';
                            }
                        } else if (charPosition === typedText.length) {
                            className = 'current';
                        }

                        html += `<span class="char ${className}">${char}</span>`;
                        charPosition++;
                    }
                    
                    html += '</span>';
                }
            }

            display.innerHTML = html;

            // Auto-scroll to current position
            const currentChar = display.querySelector('.char.current');
            if (currentChar) {
                const displayRect = display.getBoundingClientRect();
                const charRect = currentChar.getBoundingClientRect();
                
                const threshold = 50;
                const needsScroll = charRect.top < displayRect.top + threshold || 
                                  charRect.bottom > displayRect.bottom - threshold;
                
                if (needsScroll) {
                    currentChar.scrollIntoView({ 
                        behavior: 'smooth', 
                        block: 'nearest',
                        inline: 'nearest' 
                    });
                }
            }
        }

        function toggleWordSelection(word) {
            console.log('Toggling word selection for:', word, 'Currently selected:', selectedWords.has(word));
            
            if (selectedWords.has(word)) {
                selectedWords.delete(word);
                showMessage(`הוסרה המילה "${word}" מהבחירה`, 'info');
            } else {
                selectedWords.add(word);
                showMessage(`נבחרה המילה "${word}" לכרטיסיות`, 'info');
            }
            
            console.log('After toggle - selected words:', Array.from(selectedWords));
            
            displayText(); // Refresh display to show selection
            updateSelectedWordsDisplay();
        }

        function updateSelectedWordsDisplay() {
            const countBadge = document.getElementById('selectedWordsCount');
            const count = selectedWords.size;
            
            if (count > 0) {
                countBadge.textContent = count;
                countBadge.classList.remove('hidden');
            } else {
                countBadge.classList.add('hidden');
            }
        }

        function openFlashcardPanel() {
            const panel = document.getElementById('flashcardPanel');
            panel.classList.add('show');
            
            // Populate selected words
            populateSelectedWordsList();
            
            // Load existing sessions
            loadSessionsList();
            
            // Focus on Hebrew input
            document.getElementById('hebrewWordInput').focus();
        }

        function closeFlashcardPanel() {
            const panel = document.getElementById('flashcardPanel');
            panel.classList.remove('show');
            
            // Clear inputs
            document.getElementById('hebrewWordInput').value = '';
            document.getElementById('englishWordInput').value = '';
            document.getElementById('sessionNameInput').value = '';
        }

        function populateSelectedWordsList() {
            const container = document.getElementById('selectedWordsList');
            const quickSelectSection = document.getElementById('quickSelectSection');
            
            if (selectedWords.size === 0) {
                quickSelectSection.style.display = 'none';
                return;
            }
            
            quickSelectSection.style.display = 'block';
            container.innerHTML = '';
            
            selectedWords.forEach(word => {
                const tag = document.createElement('span');
                tag.className = 'selected-word-tag';
                tag.textContent = word;
                tag.onclick = () => {
                    document.getElementById('hebrewWordInput').value = word;
                    document.getElementById('englishWordInput').focus();
                };
                
                // Add a small X button to remove individual words
                const removeBtn = document.createElement('span');
                removeBtn.innerHTML = ' ×';
                removeBtn.style.cursor = 'pointer';
                removeBtn.style.marginLeft = '5px';
                removeBtn.style.fontWeight = 'bold';
                removeBtn.onclick = (e) => {
                    e.stopPropagation(); // Prevent the main click event
                    removeWordFromSelection(word);
                    showMessage(`הוסרה המילה "${word}" מהבחירה`, 'info');
                };
                
                tag.appendChild(removeBtn);
                container.appendChild(tag);
            });
        }

        function clearSelectedWords() {
            selectedWords.clear();
            updateSelectedWordsDisplay();
            populateSelectedWordsList();
            displayText();
            showMessage('נוקתה כל הבחירה', 'info');
        }

        function removeWordFromSelection(word) {
            selectedWords.delete(word);
            updateSelectedWordsDisplay();
            populateSelectedWordsList();
            displayText();
        }

        function updateSelectedWordsDisplay() {
            const countBadge = document.getElementById('selectedWordsCount');
            const count = selectedWords.size;
            
            console.log('Updating counter - selected words count:', count, 'Selected words:', Array.from(selectedWords));
            
            if (count > 0) {
                countBadge.textContent = count;
                countBadge.classList.remove('hidden');
            } else {
                countBadge.classList.add('hidden');
                countBadge.textContent = '0'; // Reset text even when hidden
            }
        }

        function loadSessionsList() {
            const container = document.getElementById('sessionList');
            const sessionNames = Object.keys(sessions);
            
            container.innerHTML = '';
            
            if (sessionNames.length === 0) {
                container.innerHTML = '<div class="session-item">אין סשנים קיימים</div>';
                return;
            }
            
            sessionNames.forEach(name => {
                const session = sessions[name];
                const item = document.createElement('div');
                item.className = 'session-item';
                item.textContent = `${name} (${session.words.length} מילים)`;
                item.onclick = () => {
                    document.getElementById('sessionNameInput').value = name;
                    // Remove selection from other items
                    container.querySelectorAll('.session-item').forEach(i => i.classList.remove('selected'));
                    item.classList.add('selected');
                };
                container.appendChild(item);
            });
        }

        async function addToFlashcards() {
            const hebrewWord = document.getElementById('hebrewWordInput').value.trim();
            const englishWord = document.getElementById('englishWordInput').value.trim();
            const sessionName = document.getElementById('sessionNameInput').value.trim();
            
            if (!sessionName) {
                showMessage('אנא הכנס שם סשן', 'error');
                return;
            }
            
            // If no specific word entered, add all selected words
            if (!hebrewWord && selectedWords.size > 0) {
                await addSelectedWordsToSession(sessionName);
                return;
            }
            
            if (!hebrewWord) {
                showMessage('אנא הכנס מילה בעברית', 'error');
                return;
            }
            
            let translation = englishWord;
            
            // If no English translation provided, try to translate
            if (!translation) {
                try {
                    translation = await translateWord(hebrewWord);
                } catch (error) {
                    showMessage('לא הצלחתי לתרגם את המילה. אנא הכנס תרגום באנגלית', 'error');
                    return;
                }
            }
            
            // Create or update session
            if (!sessions[sessionName]) {
                sessions[sessionName] = {
                    name: sessionName,
                    words: [],
                    created: new Date().toISOString(),
                    lastModified: new Date().toISOString()
                };
            }
            
            const session = sessions[sessionName];
            
            // Check if word already exists
            const exists = session.words.some(word => word.hebrew === hebrewWord);
            if (exists) {
                showMessage('המילה כבר קיימת בסשן זה', 'error');
                return;
            }
            
            // Add the word
            session.words.push({
                hebrew: hebrewWord,
                english: translation
            });
            
            session.lastModified = new Date().toISOString();
            saveSessions();
            
            // Remove from selected words if it was selected
            selectedWords.delete(hebrewWord);
            updateSelectedWordsDisplay();
            displayText();
            populateSelectedWordsList(); // Update the selected words list
            
            showMessage(`המילה "${hebrewWord}" נוספה לסשן "${sessionName}"`, 'success');
            
            // Clear inputs
            document.getElementById('hebrewWordInput').value = '';
            document.getElementById('englishWordInput').value = '';
            
            // Update display
            populateSelectedWordsList();
            loadSessionsList();
        }

        async function addSelectedWordsToSession(sessionName) {
            if (selectedWords.size === 0) {
                showMessage('אין מילים נבחרות להוספה', 'error');
                return;
            }
            
            // Create or update session
            if (!sessions[sessionName]) {
                sessions[sessionName] = {
                    name: sessionName,
                    words: [],
                    created: new Date().toISOString(),
                    lastModified: new Date().toISOString()
                };
            }
            
            const session = sessions[sessionName];
            let addedCount = 0;
            let skippedCount = 0;
            
            showMessage('מתרגם מילים...', 'info');
            
            for (const word of selectedWords) {
                // Check if word already exists
                const exists = session.words.some(w => w.hebrew === word);
                if (exists) {
                    skippedCount++;
                    continue;
                }
                
                try {
                    const translation = await translateWord(word);
                    session.words.push({
                        hebrew: word,
                        english: translation
                    });
                    addedCount++;
                    
                    // Small delay to avoid overwhelming the translation service
                    await new Promise(resolve => setTimeout(resolve, 500));
                } catch (error) {
                    console.error(`Failed to translate "${word}":`, error);
                    // Add without translation as fallback
                    session.words.push({
                        hebrew: word,
                        english: word
                    });
                    addedCount++;
                }
            }
            
            session.lastModified = new Date().toISOString();
            saveSessions();
            
            // Clear selected words
            selectedWords.clear();
            updateSelectedWordsDisplay();
            displayText();
            populateSelectedWordsList();
            loadSessionsList();
            
            let message = `נוספו ${addedCount} מילים לסשן "${sessionName}"`;
            if (skippedCount > 0) {
                message += ` (${skippedCount} מילים כבר היו קיימות)`;
            }
            showMessage(message, 'success');
        }

        async function translateWord(word) {
            try {
                // Try Google Translate first
                const response = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=he&tl=en&dt=t&q=${encodeURIComponent(word)}`);
                const data = await response.json();
                return data[0][0][0];
            } catch (error) {
                // Fallback to MyMemory
                try {
                    const response = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(word)}&langpair=he|en`);
                    const data = await response.json();
                    return data.responseData.translatedText;
                } catch (fallbackError) {
                    throw new Error('Translation failed');
                }
            }
        }

        function updateStats() {
            const accuracy = totalTyped === 0 ? 100 : Math.round(((totalTyped - errors) / totalTyped) * 100);
            const progress = targetText ? Math.round((currentIndex / targetText.length) * 100) : 0;

            document.getElementById('accuracy').textContent = accuracy + '%';
            document.getElementById('progress').textContent = progress + '%';
            document.getElementById('errors').textContent = errors;
        }

        function showMessage(text, type) {
            const message = document.getElementById('message');
            message.textContent = text;
            message.className = `message ${type}`;
            message.classList.remove('hidden');
            
            // Auto-hide after 5 seconds for info messages
            if (type === 'info') {
                setTimeout(() => {
                    hideMessage();
                }, 5000);
            }
        }

        function hideMessage() {
            document.getElementById('message').classList.add('hidden');
        }

        // Event Listeners
        document.getElementById('typingInput').addEventListener('input', function(e) {
            const typedText = e.target.value;
            
            // Update current index to match typed text length
            currentIndex = 0;
            let hasError = false;
            
            // Check each character
            for (let i = 0; i < typedText.length; i++) {
                if (i < targetText.length && typedText[i] === targetText[i]) {
                    currentIndex = i + 1;
                } else {
                    hasError = true;
                    break;
                }
            }
            
            // Update total typed count
            totalTyped = Math.max(totalTyped, typedText.length);
            
            // Show error message if there's a wrong character
            if (hasError && typedText.length > 0) {
                showMessage('שגיאה! השתמש ב-Backspace כדי למחוק את האות השגויה', 'error');
                errors++;
            } else {
                hideMessage();
            }
            
            // Check if completed correctly
            if (!hasError && currentIndex === targetText.length && typedText.length === targetText.length) {
                showMessage('כל הכבוד! סיימת את הטקסט בהצלחה!', 'success');
                e.target.disabled = true;
                // Optionally stop timer when completed
                if (isTimerRunning) {
                    stopTimer();
                }
            }

            displayText();
            updateStats();
        });

        document.getElementById('typingInput').addEventListener('keydown', function(e) {
            // Handle backspace
            if (e.key === 'Backspace') {
                hideMessage(); // Hide error message when user starts correcting
            }
        });

        // Close panel when clicking outside
        document.getElementById('flashcardPanel').addEventListener('click', function(e) {
            if (e.target === this) {
                closeFlashcardPanel();
            }
        });

        // Update selected words display when panel is closed
        function closeFlashcardPanel() {
            const panel = document.getElementById('flashcardPanel');
            panel.classList.remove('show');
            
            // Clear inputs
            document.getElementById('hebrewWordInput').value = '';
            document.getElementById('englishWordInput').value = '';
            document.getElementById('sessionNameInput').value = '';
            
            // Update the counter in case words were removed during the session
            updateSelectedWordsDisplay();
        }

        // Handle Enter key in inputs
        document.getElementById('hebrewWordInput').addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                document.getElementById('englishWordInput').focus();
            }
        });

        document.getElementById('englishWordInput').addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                document.getElementById('sessionNameInput').focus();
            }
        });

        document.getElementById('sessionNameInput').addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                addToFlashcards();
            }
        });

        // Auto-translate when Hebrew word is entered
        document.getElementById('hebrewWordInput').addEventListener('blur', async function() {
            const hebrewWord = this.value.trim();
            const englishInput = document.getElementById('englishWordInput');
            
            if (hebrewWord && !englishInput.value.trim()) {
                try {
                    englishInput.value = 'מתרגם...';
                    const translation = await translateWord(hebrewWord);
                    englishInput.value = translation;
                } catch (error) {
                    englishInput.value = '';
                    englishInput.placeholder = 'Translation failed - enter manually';
                }
            }
        });

        // Initialize
        updateStats();
        updateTimerDisplay();
        updateSelectedWordsDisplay();