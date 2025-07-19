        let segments = [];
        let currentSegmentIndex = 0;
        let correctAnswers = 0;
        let speechSynthesis = window.speechSynthesis;
        let currentUtterance = null;
        let currentSegmentComplete = false;
        let currentSegmentAttempts = 0;

        function getCurrentCorrectionMode() {
            const radioButton = document.querySelector('input[name="correctionMode"]:checked');
            return radioButton ? radioButton.value : 'realtime';
        }

        function getSegmentType() {
            const radioButton = document.querySelector('input[name="segmentType"]:checked');
            return radioButton ? radioButton.value : 'words';
        }

        function getWordCount() {
            return parseInt(document.getElementById('wordCount').value) || 3;
        }

        function splitTextIntoSegments(text) {
            const segmentType = getSegmentType();
            const wordCount = getWordCount();
            
            let segments = [];
            
            switch (segmentType) {
                case 'words':
                    const words = text.split(/\s+/).filter(word => word.trim().length > 0);
                    for (let i = 0; i < words.length; i += wordCount) {
                        const segment = words.slice(i, i + wordCount).join(' ');
                        segments.push(segment);
                    }
                    break;
                    
                case 'comma':
                    segments = text.split(/[,،]/).filter(segment => segment.trim().length > 0);
                    break;
                    
                case 'period':
                    segments = text.split(/[.!?]/).filter(segment => segment.trim().length > 0);
                    break;
                    
                case 'sentence':
                    segments = text.split(/[.!?،,]+/).filter(segment => segment.trim().length > 0);
                    break;
            }
            
            return segments.map(segment => segment.trim());
        }

        function getSegmentTypeDescription() {
            const segmentType = getSegmentType();
            const wordCount = getWordCount();
            
            switch (segmentType) {
                case 'words':
                    return `${wordCount} מילים`;
                case 'comma':
                    return 'עד פסיק';
                case 'period':
                    return 'עד נקודה';
                case 'sentence':
                    return 'משפט שלם';
                default:
                    return '';
            }
        }

        function getCorrectionModeDescription() {
            const correctionMode = getCurrentCorrectionMode();
            switch (correctionMode) {
                case 'realtime':
                    return 'בזמן אמת';
                case 'complete':
                    return 'לאחר השלמה';
                default:
                    return '';
            }
        }

        function startPractice() {
            const text = document.getElementById('textInput').value.trim();
            if (!text) {
                alert('אנא הדביקו טקסט לתרגול');
                return;
            }

            segments = splitTextIntoSegments(text);
            
            if (segments.length === 0) {
                alert('לא נמצא טקסט מתאים לחלוקה');
                return;
            }

            currentSegmentIndex = 0;
            correctAnswers = 0;
            currentSegmentAttempts = 0;

            document.getElementById('practiceArea').style.display = 'block';
            document.getElementById('totalSegments').textContent = segments.length;
            document.getElementById('totalSegmentCount').textContent = segments.length;
            document.getElementById('segmentInfo').textContent = `מצב: ${getSegmentTypeDescription()} | תיקון: ${getCorrectionModeDescription()}`;
            
            updateStats();
            displayCurrentSegment();
            
            setTimeout(() => {
                playCurrentSegment();
            }, 500);
        }

        function displayCurrentSegment() {
            if (currentSegmentIndex >= segments.length) {
                showCompletionMessage();
                return;
            }

            const segment = segments[currentSegmentIndex];
            const segmentElement = document.getElementById('currentSegment');
            
            segmentElement.textContent = segment;
            
            document.getElementById('segmentCounter').textContent = currentSegmentIndex + 1;
            document.getElementById('userInput').value = '';
            document.getElementById('feedback').style.display = 'none';
            document.getElementById('nextBtn').style.display = 'none';
            document.getElementById('checkBtn').style.display = 'none';
            document.getElementById('retryBtn').style.display = 'none';
            document.getElementById('typingFeedback').innerHTML = '';
            
            currentSegmentComplete = false;
            currentSegmentAttempts = 0; // Reset attempts for new segment
            
            // Update UI based on correction mode
            const userInput = document.getElementById('userInput');
            const correctionMode = getCurrentCorrectionMode();
            if (correctionMode === 'complete') {
                userInput.placeholder = 'כתבו כאן מה ששמעתם ולחצו Enter לבדיקה...';
            } else {
                userInput.placeholder = 'כתבו כאן מה ששמעתם...';
            }
            
            updateProgressBar();
            updateStats();
        }

        function checkTypingRealtime() {
            const userInput = document.getElementById('userInput').value;
            const correctSegment = segments[currentSegmentIndex];
            const feedbackElement = document.getElementById('typingFeedback');
            const nextBtn = document.getElementById('nextBtn');
            
            // Normalize both texts for comparison (remove punctuation)
            const userInputNormalized = normalizeHebrewText(userInput);
            const correctSegmentNormalized = normalizeHebrewText(correctSegment);
            
            let html = '';
            let allCorrect = true;
            
            for (let i = 0; i < userInputNormalized.length; i++) {
                const userChar = userInputNormalized[i];
                const correctChar = correctSegmentNormalized[i] || '';
                
                if (userChar === correctChar) {
                    html += `<span class="correct-char">${userChar}</span>`;
                } else {
                    html += `<span class="incorrect-char">${userChar}</span>`;
                    allCorrect = false;
                }
            }
            
            const remainingLength = Math.max(0, correctSegmentNormalized.length - userInputNormalized.length);
            if (remainingLength > 0) {
                html += `<span style="color: #999; font-size: 14px;"> [${remainingLength} תווים נוספים נדרשים]</span>`;
                allCorrect = false;
            }
            
            feedbackElement.innerHTML = html;
            
            if (userInputNormalized.length === correctSegmentNormalized.length && allCorrect && !currentSegmentComplete) {
                currentSegmentComplete = true;
                correctAnswers++;
                nextBtn.style.display = 'inline-block';
                
                const feedbackMsg = document.getElementById('feedback');
                feedbackMsg.textContent = 'מצוין! תשובה נכונה';
                feedbackMsg.className = 'feedback correct';
                feedbackMsg.style.display = 'block';
                
                updateStats();
                
                setTimeout(() => {
                    if (currentSegmentComplete) {
                        nextSegment();
                    }
                }, 2000);
            }
        }

        function normalizeHebrewText(text) {
            return text
                .trim()
                .replace(/\u200F/g, '') // Remove Right-to-Left Mark
                .replace(/\u200E/g, '') // Remove Left-to-Right Mark
                .replace(/\u202A/g, '') // Remove Left-to-Right Embedding
                .replace(/\u202B/g, '') // Remove Right-to-Left Embedding
                .replace(/\u202C/g, '') // Remove Pop Directional Formatting
                .replace(/\u202D/g, '') // Remove Left-to-Right Override
                .replace(/\u202E/g, '') // Remove Right-to-Left Override
                .replace(/\s+/g, ' ')   // Normalize multiple spaces to single space
                .replace(/[\u0591-\u05C7]/g, '') // Remove Hebrew diacritics/vowel marks
                .replace(/[.!?،,;:]/g, '') // Remove punctuation marks
                .trim();
        }

        function manualCheckAnswer() {
            if (currentSegmentComplete) return;

            currentSegmentAttempts++; // Increment attempts
            
            const userInputRaw = document.getElementById('userInput').value;
            const correctSegmentRaw = segments[currentSegmentIndex];
            
            // Normalize both texts for comparison (removing punctuation)
            const userInput = normalizeHebrewText(userInputRaw);
            const correctSegment = normalizeHebrewText(correctSegmentRaw);
            
            const feedbackElement = document.getElementById('typingFeedback');
            const nextBtn = document.getElementById('nextBtn');
            const checkBtn = document.getElementById('checkBtn');
            const retryBtn = document.getElementById('retryBtn');
            const feedbackMsg = document.getElementById('feedback');
            
            // Create visual debug info with bigger font and larger Hebrew text
            const debugInfo = `
                <div style="font-size: 16px; color: #555; margin: 15px 0; padding: 15px; background: #f8f9fa; border-radius: 8px; border: 1px solid #dee2e6;">
                    <strong>Debug Info:</strong><br><br>
                    <div style="margin: 12px 0;"><strong>Your text (normalized):</strong> <span style="font-size: 24px; color: #2c3e50; font-weight: bold; background: #e8f4fd; padding: 4px 8px; border-radius: 4px;">"${userInput}"</span></div>
                    <div style="margin: 12px 0;"><strong>Correct text (normalized):</strong> <span style="font-size: 24px; color: #2c3e50; font-weight: bold; background: #e8f5e8; padding: 4px 8px; border-radius: 4px;">"${correctSegment}"</span></div>
                    <div style="margin: 12px 0; font-size: 14px; color: #666;"><strong>Note:</strong> Punctuation marks like periods (.) and commas (,) are ignored in the comparison.</div>
                </div>
            `;
            
            if (userInput === correctSegment) {
                // Correct answer - always show visual feedback for correct answers
                let html = '';
                for (let i = 0; i < userInput.length; i++) {
                    html += `<span class="correct-char">${userInput[i]}</span>`;
                }
                feedbackElement.innerHTML = html;
                
                correctAnswers++;
                feedbackMsg.textContent = 'מצוין! תשובה נכונה';
                feedbackMsg.className = 'feedback correct';
                currentSegmentComplete = true;
                nextBtn.style.display = 'inline-block';
                
                updateStats();
                
                // Auto-advance after 2 seconds
                setTimeout(() => {
                    if (currentSegmentComplete) {
                        nextSegment();
                    }
                }, 2000);
            } else {
                // Wrong answer
                if (currentSegmentAttempts === 1) {
                    // First attempt failed - don't show visual comparison, just try again message
                    feedbackElement.innerHTML = ''; // Clear any previous feedback
                    feedbackMsg.textContent = 'לא נכון. נסו שוב! (סימני פיסוק מתעלמים)';
                    feedbackMsg.className = 'feedback incorrect';
                    retryBtn.style.display = 'inline-block';
                } else {
                    // Second attempt failed - show debug info and visual comparison
                    let html = debugInfo + '<div style="margin-top: 15px;">';
                    const maxLength = Math.max(userInput.length, correctSegment.length);
                    
                    for (let i = 0; i < maxLength; i++) {
                        const userChar = userInput[i] || '';
                        const correctChar = correctSegment[i] || '';
                        
                        if (userChar === correctChar && userChar !== '') {
                            html += `<span class="correct-char">${userChar}</span>`;
                        } else {
                            if (userChar !== '' && correctChar !== '') {
                                // Both exist but different
                                html += `<span class="incorrect-char">${userChar}</span>`;
                            } else if (userChar !== '' && correctChar === '') {
                                // Extra character from user
                                html += `<span class="incorrect-char">${userChar}</span>`;
                            } else if (userChar === '' && correctChar !== '') {
                                // Missing character - show what should be there
                                html += `<span style="background-color: #fff3cd; color: #856404; text-decoration: underline;">${correctChar}</span>`;
                            }
                        }
                    }
                    
                    html += '</div>';
                    feedbackElement.innerHTML = html;
                    feedbackMsg.textContent = `התשובה הנכונה היא: "${correctSegment}" (ללא סימני פיסוק)`;
                    feedbackMsg.className = 'feedback incorrect';
                    nextBtn.style.display = 'inline-block';
                }
            }
            
            feedbackMsg.style.display = 'block';
            checkBtn.style.display = 'none';
        }

        function playCurrentSegment() {
            if (currentSegmentIndex >= segments.length) return;

            speechSynthesis.cancel();
            
            const segment = segments[currentSegmentIndex];
            currentUtterance = new SpeechSynthesisUtterance(segment);
            
            const voices = speechSynthesis.getVoices();
            const hebrewVoice = voices.find(voice => voice.lang === 'he-IL' || voice.lang === 'he');
            
            if (hebrewVoice) {
                currentUtterance.voice = hebrewVoice;
            }
            
            currentUtterance.lang = 'he-IL';
            currentUtterance.rate = 0.8;
            currentUtterance.pitch = 1;
            currentUtterance.volume = 1;
            
            speechSynthesis.speak(currentUtterance);
        }

        function retrySegment() {
            console.log('Retry button clicked');
            // Clear the input and feedback for a fresh try
            document.getElementById('userInput').value = '';
            document.getElementById('feedback').style.display = 'none';
            document.getElementById('retryBtn').style.display = 'none';
            document.getElementById('typingFeedback').innerHTML = '';
            
            // Re-enable the check button for complete mode
            const correctionMode = getCurrentCorrectionMode();
            if (correctionMode === 'complete') {
                // Focus back on input for user convenience
                document.getElementById('userInput').focus();
            }
            
            // Optionally replay the audio
            playCurrentSegment();
        }

        function nextSegment() {
            currentSegmentIndex++;
            displayCurrentSegment();
            
            if (currentSegmentIndex < segments.length) {
                setTimeout(() => {
                    playCurrentSegment();
                }, 500);
            }
        }

        function updateStats() {
            document.getElementById('currentSegmentNum').textContent = currentSegmentIndex + 1;
            document.getElementById('correctCount').textContent = correctAnswers;
            
            const accuracy = currentSegmentIndex > 0 ? Math.round((correctAnswers / Math.max(currentSegmentIndex, 1)) * 100) : 0;
            document.getElementById('accuracy').textContent = accuracy + '%';
        }

        function updateProgressBar() {
            const progress = segments.length > 0 ? (currentSegmentIndex / segments.length) * 100 : 0;
            document.getElementById('progressBar').style.width = progress + '%';
        }

        function showCompletionMessage() {
            const accuracy = Math.round((correctAnswers / segments.length) * 100);
            document.getElementById('feedback').textContent = `כל הכבוד! סיימתם את התרגול. דיוק: ${accuracy}%`;
            document.getElementById('feedback').className = 'feedback correct';
            document.getElementById('feedback').style.display = 'block';
        }

        function clearText() {
            document.getElementById('textInput').value = '';
            document.getElementById('practiceArea').style.display = 'none';
            segments = [];
            currentSegmentIndex = 0;
            correctAnswers = 0;
        }

        function handleUserInput() {
            const correctionMode = getCurrentCorrectionMode();
            console.log('Input detected, correction mode:', correctionMode);
            
            if (correctionMode === 'realtime') {
                checkTypingRealtime();
            } else {
                // Complete mode - show check button
                const checkBtn = document.getElementById('checkBtn');
                const userInput = document.getElementById('userInput').value.trim();
                
                if (userInput.length > 0 && !currentSegmentComplete) {
                    checkBtn.style.display = 'inline-block';
                    console.log('Check button shown');
                } else {
                    checkBtn.style.display = 'none';
                }
            }
        }

        function handleEnterKey(event) {
            if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                const correctionMode = getCurrentCorrectionMode();
                console.log('Enter pressed, correction mode:', correctionMode);
                
                if (correctionMode === 'complete' && !currentSegmentComplete) {
                    console.log('Calling manual check');
                    manualCheckAnswer();
                } else if (currentSegmentComplete) {
                    console.log('Going to next segment');
                    nextSegment();
                }
            }
        }

        // Setup event listeners when the page loads
        document.addEventListener('DOMContentLoaded', function() {
            // User input event listener
            const userInputElement = document.getElementById('userInput');
            userInputElement.addEventListener('input', handleUserInput);
            userInputElement.addEventListener('keydown', handleEnterKey);

            // Segment type radio buttons
            document.querySelectorAll('input[name="segmentType"]').forEach(radio => {
                radio.addEventListener('change', function() {
                    const wordCountSection = document.getElementById('wordCountSection');
                    wordCountSection.style.display = this.value === 'words' ? 'flex' : 'none';
                });
            });

            // Correction mode radio buttons
            document.querySelectorAll('input[name="correctionMode"]').forEach(radio => {
                radio.addEventListener('change', function() {
                    console.log('Correction mode changed to:', this.value);
                });
            });

            // Global keyboard shortcuts
            document.addEventListener('keydown', function(e) {
                if (e.ctrlKey && e.code === 'Space') {
                    e.preventDefault();
                    playCurrentSegment();
                }
            });

            // Load voices when available
            speechSynthesis.addEventListener('voiceschanged', function() {
                const voices = speechSynthesis.getVoices();
                console.log('Available Hebrew voices:', voices.filter(v => v.lang.includes('he')));
            });
        });