// 퀴즈 앱 메인 로직
class QuizApp {
    constructor() {
        this.quizData = {};
        this.questions = [];
        this.currentIndex = 0;
        this.score = 0;
        this.answers = [];
        this.wrongAnswers = [];
        this.selectedRanges = [];
        this.isWrongNoteMode = false;

        // localStorage에서 데이터 로드
        this.savedWrongAnswers = this.loadWrongAnswers();
        this.loadDarkMode();

        this.confirmCallback = null;

        this.init();
    }

    init() {
        this.bindEvents();
        this.updateTotalQuestions();
        this.updateWrongNoteBadge();
    }

    bindEvents() {
        // 네비게이션
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.handleNavClick(e));
        });

        // 범위 선택 체크박스
        document.querySelectorAll('.range-item input').forEach(checkbox => {
            checkbox.addEventListener('change', () => this.updateTotalQuestions());
        });

        // 객관식만 옵션
        document.getElementById('mcq-only-option').addEventListener('change', () => this.updateTotalQuestions());

        // 시작 버튼
        document.getElementById('start-btn').addEventListener('click', () => this.startQuiz());

        // 주관식 제출
        document.getElementById('submit-short-btn').addEventListener('click', () => this.submitShortAnswer());
        document.getElementById('short-answer-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.submitShortAnswer();
        });

        // 서술형 해설 보기
        document.getElementById('show-essay-btn').addEventListener('click', () => this.showEssayAnswer());

        // 다음 문제
        document.getElementById('next-btn').addEventListener('click', () => this.nextQuestion());
        // 중요 표시 버튼
        document.getElementById('mark-important-btn').addEventListener('click', () => this.toggleImportant());

        // 결과 화면 버튼
        document.getElementById('retry-btn').addEventListener('click', () => this.retryQuiz());
        document.getElementById('retry-wrong-btn').addEventListener('click', () => this.retryWrongOnly());
        document.getElementById('home-btn').addEventListener('click', () => this.goHome());

        // 오답노트 필터/정렬
        document.getElementById('wrong-filter-range').addEventListener('change', () => this.renderWrongNoteList());
        document.getElementById('wrong-sort').addEventListener('change', () => this.renderWrongNoteList());

        // 오답노트 버튼
        document.getElementById('download-wrong-btn').addEventListener('click', () => this.downloadWrongAnswers());
        document.getElementById('study-wrong-btn').addEventListener('click', () => this.startWrongNoteQuiz());
        document.getElementById('clear-wrong-btn').addEventListener('click', () => {
            this.showConfirm('오답 초기화', '모든 오답 기록을 삭제하시겠습니까?', () => {
                this.clearWrongAnswers();
            });
        });

        // 다크 모드
        document.getElementById('dark-mode-btn').addEventListener('click', () => this.toggleDarkMode());

        // 설정 모달
        document.getElementById('settings-btn').addEventListener('click', () => this.openModal('settings-modal'));
        document.getElementById('settings-close').addEventListener('click', () => this.closeModal('settings-modal'));

        // 데이터 관리
        document.getElementById('export-data-btn').addEventListener('click', () => this.exportData());
        document.getElementById('import-data-input').addEventListener('change', (e) => this.importData(e));
        document.getElementById('reset-all-btn').addEventListener('click', () => {
            this.showConfirm('모든 데이터 초기화', '오답 기록과 모든 설정이 삭제됩니다. 계속하시겠습니까?', () => {
                this.resetAllData();
            });
        });

        // 퀴즈 그만두기
        document.getElementById('quit-btn').addEventListener('click', () => {
            this.showConfirm('퀴즈 그만두기', '진행 중인 퀴즈를 종료하시겠습니까?', () => {
                this.goHome();
            });
        });

        // 확인 모달
        document.getElementById('confirm-cancel').addEventListener('click', () => this.closeModal('confirm-modal'));
        document.getElementById('confirm-ok').addEventListener('click', () => {
            if (this.confirmCallback) {
                this.confirmCallback();
            }
            this.closeModal('confirm-modal');
        });

        // 리뷰 토글
        document.getElementById('toggle-review-btn').addEventListener('click', () => this.toggleReview());

        // 모달 외부 클릭
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.closeModal(modal.id);
                }
            });
        });
    }

    // 다크 모드
    loadDarkMode() {
        const isDark = localStorage.getItem('darkMode') === 'true';
        if (isDark) {
            document.documentElement.setAttribute('data-theme', 'dark');
        }
    }

    toggleDarkMode() {
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        if (isDark) {
            document.documentElement.removeAttribute('data-theme');
            localStorage.setItem('darkMode', 'false');
        } else {
            document.documentElement.setAttribute('data-theme', 'dark');
            localStorage.setItem('darkMode', 'true');
        }
    }

    // 모달
    openModal(modalId) {
        document.getElementById(modalId).classList.add('show');
    }

    closeModal(modalId) {
        document.getElementById(modalId).classList.remove('show');
    }

    showConfirm(title, message, callback) {
        document.getElementById('confirm-title').textContent = title;
        document.getElementById('confirm-message').textContent = message;
        this.confirmCallback = callback;
        this.openModal('confirm-modal');
    }

    // 데이터 관리
    exportData() {
        const data = {
            version: '1.0',
            exportDate: new Date().toISOString(),
            wrongAnswers: this.savedWrongAnswers,
            settings: {
                darkMode: localStorage.getItem('darkMode') === 'true'
            }
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `quiz-data-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);

        this.closeModal('settings-modal');
    }

    importData(e) {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const data = JSON.parse(event.target.result);

                if (data.wrongAnswers) {
                    this.savedWrongAnswers = data.wrongAnswers;
                    this.saveWrongAnswersToStorage();
                }

                if (data.settings?.darkMode) {
                    document.documentElement.setAttribute('data-theme', 'dark');
                    localStorage.setItem('darkMode', 'true');
                }

                alert('데이터를 성공적으로 가져왔습니다.');
                this.closeModal('settings-modal');
                this.updateWrongNoteBadge();
            } catch (error) {
                alert('데이터 파일을 읽을 수 없습니다.');
            }
        };
        reader.readAsText(file);
        e.target.value = '';
    }

    resetAllData() {
        localStorage.removeItem('quizWrongAnswers');
        localStorage.removeItem('darkMode');
        this.savedWrongAnswers = {};
        document.documentElement.removeAttribute('data-theme');
        this.updateWrongNoteBadge();
        this.closeModal('settings-modal');
        alert('모든 데이터가 초기화되었습니다.');
    }

    handleNavClick(e) {
        const targetScreen = e.currentTarget.dataset.screen;

        document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
        e.currentTarget.classList.add('active');

        this.showScreen(targetScreen);

        if (targetScreen === 'wrong-note') {
            this.renderWrongNoteList();
        }

        document.getElementById('main-nav').style.display = 'flex';
    }

    updateTotalQuestions() {
        const checkboxes = document.querySelectorAll('.range-item input:checked');
        const mcqOnly = document.getElementById('mcq-only-option').checked;
        let total = 0;
        checkboxes.forEach(cb => {
            if (mcqOnly) {
                total += parseInt(cb.dataset.mcqCount);
            } else {
                total += parseInt(cb.dataset.count);
            }
        });
        document.getElementById('total-questions').textContent = total;
        document.getElementById('start-btn').disabled = total === 0;
    }

    // localStorage 관련
    loadWrongAnswers() {
        const data = localStorage.getItem('quizWrongAnswers');
        return data ? JSON.parse(data) : {};
    }

    saveWrongAnswersToStorage() {
        localStorage.setItem('quizWrongAnswers', JSON.stringify(this.savedWrongAnswers));
        this.updateWrongNoteBadge();
    }

    saveWrongAnswer(question, userAnswer) {
        const key = question.qid;
        const correctAnswer = Array.isArray(question.correct)
            ? question.correct.join(' 또는 ')
            : question.correct;

        if (this.savedWrongAnswers[key]) {
            this.savedWrongAnswers[key].wrongCount++;
            this.savedWrongAnswers[key].lastWrongDate = new Date().toISOString();
            this.savedWrongAnswers[key].lastUserAnswer = userAnswer;
        } else {
            this.savedWrongAnswers[key] = {
                qid: question.qid,
                range: question.range,
                type: question.type,
                prompt: question.prompt,
                choices: question.choices || null,
                correct: question.correct,
                correctDisplay: correctAnswer,
                explanation: question.explanation,
                lastUserAnswer: userAnswer,
                wrongCount: 1,
                lastWrongDate: new Date().toISOString()
            };
        }
        this.saveWrongAnswersToStorage();
    }

    removeWrongAnswer(qid) {
        if (this.savedWrongAnswers[qid]) {
            delete this.savedWrongAnswers[qid];
            this.saveWrongAnswersToStorage();
        }
    }


    // 중요 표시 토글
    toggleImportant() {
        const question = this.questions[this.currentIndex];
        const btn = document.getElementById('mark-important-btn');
        const isMarked = btn.classList.contains('marked');

        if (isMarked) {
            btn.classList.remove('marked');
            btn.querySelector('span').textContent = '중요 표시';
            const answer = this.answers.find(a => a.qid === question.qid);
            if (answer && answer.correct && this.savedWrongAnswers[question.qid]) {
                delete this.savedWrongAnswers[question.qid];
                this.saveWrongAnswersToStorage();
            } else if (this.savedWrongAnswers[question.qid]) {
                this.savedWrongAnswers[question.qid].important = false;
                this.saveWrongAnswersToStorage();
            }
        } else {
            btn.classList.add('marked');
            btn.querySelector('span').textContent = '중요 표시됨';
            this.markAsImportant(question);
        }
    }

    // 중요 문제로 표시
    markAsImportant(question) {
        const key = question.qid;
        const correctAnswer = Array.isArray(question.correct)
            ? question.correct.join(' 또는 ')
            : question.correct;

        if (this.savedWrongAnswers[key]) {
            this.savedWrongAnswers[key].important = true;
        } else {
            this.savedWrongAnswers[key] = {
                qid: question.qid,
                range: question.range,
                type: question.type,
                prompt: question.prompt,
                choices: question.choices || null,
                correct: question.correct,
                correctDisplay: correctAnswer,
                explanation: question.explanation,
                lastUserAnswer: null,
                wrongCount: 0,
                lastWrongDate: new Date().toISOString(),
                important: true
            };
        }
        this.saveWrongAnswersToStorage();
    }

    updateWrongNoteBadge() {
        const count = Object.keys(this.savedWrongAnswers).length;
        const badge = document.getElementById('nav-wrong-count');

        if (count > 0) {
            badge.textContent = count;
            badge.style.display = 'inline-block';
        } else {
            badge.style.display = 'none';
        }
    }

    clearWrongAnswers() {
        this.savedWrongAnswers = {};
        this.saveWrongAnswersToStorage();
        this.renderWrongNoteList();
    }

    // 한국 시간으로 포맷
    formatKoreanDate(isoString) {
        const date = new Date(isoString);
        return date.toLocaleString('ko-KR', {
            timeZone: 'Asia/Seoul',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        });
    }

    // 오답 내역 다운로드
    downloadWrongAnswers() {
        const wrongList = Object.values(this.savedWrongAnswers);
        if (wrongList.length === 0) {
            alert('다운로드할 오답이 없습니다.');
            return;
        }

        // 범위별로 정렬
        wrongList.sort((a, b) => {
            if (a.range !== b.range) return a.range.localeCompare(b.range);
            return a.qid.localeCompare(b.qid);
        });

        const now = new Date().toLocaleString('ko-KR', {
            timeZone: 'Asia/Seoul',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        });

        let content = `═══════════════════════════════════════════════════════════════
                    경영데이터과학론심화 오답노트
═══════════════════════════════════════════════════════════════
생성일시: ${now} (서울 시간)
총 오답 수: ${wrongList.length}문제
═══════════════════════════════════════════════════════════════

`;

        // 범위별로 그룹화
        const grouped = {};
        wrongList.forEach(wrong => {
            if (!grouped[wrong.range]) {
                grouped[wrong.range] = [];
            }
            grouped[wrong.range].push(wrong);
        });

        Object.keys(grouped).sort().forEach(range => {
            content += `\n【 ${range} 범위 】 (${grouped[range].length}문제)\n`;
            content += `───────────────────────────────────────────────────────────────\n`;

            grouped[range].forEach((wrong, idx) => {
                content += `\n[문제 ${idx + 1}] ${wrong.qid}\n`;
                content += `Q. ${wrong.prompt}\n\n`;

                if (wrong.choices) {
                    wrong.choices.forEach(choice => {
                        const marker = choice.cid === wrong.correct ? '✓' :
                                      choice.cid === wrong.lastUserAnswer ? '✗' : ' ';
                        content += `   ${marker} ${choice.cid}. ${choice.text}\n`;
                    });
                    content += '\n';
                }

                content += `   ❌ 내 답: ${wrong.lastUserAnswer}\n`;
                content += `   ✅ 정답: ${wrong.correctDisplay}\n`;
                content += `   📝 해설: ${wrong.explanation}\n`;
                content += `   📊 틀린 횟수: ${wrong.wrongCount}회\n`;
                content += `   🕐 마지막: ${this.formatKoreanDate(wrong.lastWrongDate)}\n`;
                content += `\n───────────────────────────────────────────────────────────────\n`;
            });
        });

        content += `\n═══════════════════════════════════════════════════════════════
                         화이팅! 💪
═══════════════════════════════════════════════════════════════\n`;

        // 파일 다운로드
        const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const dateStr = new Date().toLocaleDateString('ko-KR', {
            timeZone: 'Asia/Seoul',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        }).replace(/\. /g, '-').replace('.', '');
        a.download = `오답노트_${dateStr}.txt`;
        a.click();
        URL.revokeObjectURL(url);
    }

    // 오답노트 렌더링
    renderWrongNoteList() {
        const container = document.getElementById('wrong-note-list');
        const emptyState = document.getElementById('wrong-note-empty');
        const actions = document.getElementById('wrong-note-actions');
        const filterRange = document.getElementById('wrong-filter-range').value;
        const sortBy = document.getElementById('wrong-sort').value;

        let wrongList = Object.values(this.savedWrongAnswers);

        if (filterRange !== 'all') {
            wrongList = wrongList.filter(w => w.range === filterRange);
        }

        if (sortBy === 'recent') {
            wrongList.sort((a, b) => new Date(b.lastWrongDate) - new Date(a.lastWrongDate));
        } else if (sortBy === 'count') {
            wrongList.sort((a, b) => b.wrongCount - a.wrongCount);
        }

        document.getElementById('wrong-note-total').textContent = Object.keys(this.savedWrongAnswers).length;

        if (wrongList.length === 0) {
            container.innerHTML = '';
            container.appendChild(emptyState);
            emptyState.style.display = 'block';
            actions.style.display = 'none';
            return;
        }

        emptyState.style.display = 'none';
        actions.style.display = 'flex';

        container.innerHTML = wrongList.map(wrong => this.createWrongNoteCard(wrong)).join('');

        container.querySelectorAll('.toggle-explanation-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const card = e.target.closest('.wrong-note-card');
                const explanation = card.querySelector('.wrong-note-explanation');
                explanation.classList.toggle('show');
                e.target.textContent = explanation.classList.contains('show') ? '해설 접기' : '해설 보기';
            });
        });
    }

    createWrongNoteCard(wrong) {
        const dateStr = new Date(wrong.lastWrongDate).toLocaleString('ko-KR', {
            timeZone: 'Asia/Seoul',
            month: 'numeric',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        });

        return `
            <div class="wrong-note-card${wrong.important ? ' important' : ''}" data-qid="${wrong.qid}">
                <div class="wrong-note-card-header">
                    <div class="wrong-note-card-meta">
                        <span class="range-tag">${wrong.range}</span>
                        <span class="qid">${wrong.qid}</span>
                        ${wrong.important ? '<span class="important-badge">중요</span>' : ''}
                    </div>
                    <div class="wrong-stats">
                        <span class="wrong-count">틀린 횟수: ${wrong.wrongCount}회</span>
                        <span class="last-date">마지막: ${dateStr}</span>
                    </div>
                </div>
                <div class="wrong-note-card-body">
                    <p class="wrong-note-prompt">${wrong.prompt}</p>
                    <div class="wrong-note-answers">
                        <div class="my-answer">내 답: <span>${wrong.lastUserAnswer}</span></div>
                        <div class="correct-answer">정답: <span>${wrong.correctDisplay}</span></div>
                    </div>
                    <button class="toggle-explanation-btn">해설 보기</button>
                    <div class="wrong-note-explanation">${wrong.explanation}</div>
                </div>
            </div>
        `;
    }

    // 문제 네비게이션 생성
    createQuestionNav() {
        const nav = document.getElementById('question-nav');
        nav.innerHTML = '';

        this.questions.forEach((_, index) => {
            const dot = document.createElement('div');
            dot.className = 'nav-dot';
            if (index === this.currentIndex) {
                dot.classList.add('current');
            }
            dot.addEventListener('click', () => this.goToQuestion(index));
            nav.appendChild(dot);
        });
    }

    updateQuestionNav() {
        const dots = document.querySelectorAll('.nav-dot');
        dots.forEach((dot, index) => {
            dot.classList.remove('current');
            if (index === this.currentIndex) {
                dot.classList.add('current');
            }

            const answer = this.answers.find(a => a.qid === this.questions[index]?.qid);
            if (answer) {
                dot.classList.add(answer.correct ? 'answered' : 'wrong');
            }
        });
    }

    goToQuestion(index) {
        if (index >= 0 && index < this.questions.length) {
            // 현재 문제 답변 여부 확인
            const currentAnswer = this.answers.find(a => a.qid === this.questions[this.currentIndex]?.qid);
            if (!currentAnswer && index !== this.currentIndex) {
                // 아직 답하지 않은 문제는 스킵 허용하지 않음 (선택)
                // return;
            }

            this.currentIndex = index;
            this.showQuestion();
            this.updateQuestionNav();
        }
    }

    // 퀴즈 시작
    async startQuiz() {
        const checkboxes = document.querySelectorAll('.range-item input:checked');
        this.selectedRanges = Array.from(checkboxes).map(cb => cb.value);

        if (this.selectedRanges.length === 0) return;

        const startBtn = document.getElementById('start-btn');
        startBtn.textContent = '로딩 중...';
        startBtn.disabled = true;

        try {
            await this.loadQuizData();

            this.prepareQuestions();

            this.currentIndex = 0;
            this.score = 0;
            this.answers = [];
            this.wrongAnswers = [];
            this.isWrongNoteMode = false;

            document.getElementById('main-nav').style.display = 'none';
            document.getElementById('quiz-mode-badge').style.display = 'none';

            this.createQuestionNav();
            this.showScreen('quiz-screen');
            this.showQuestion();
        } catch (error) {
            console.error('퀴즈 데이터 로드 실패:', error);
            alert('퀴즈 데이터를 불러올 수 없습니다.\n\n로컬에서 테스트하려면 Live Server를 사용하거나,\nGitHub Pages에 배포 후 테스트해주세요.');
        } finally {
            startBtn.textContent = '퀴즈 시작';
            startBtn.disabled = false;
        }
    }

    async startWrongNoteQuiz() {
        const wrongList = Object.values(this.savedWrongAnswers);
        if (wrongList.length === 0) {
            alert('오답노트에 문제가 없습니다.');
            return;
        }

        this.selectedRanges = [...new Set(wrongList.map(w => w.range))];

        try {
            await this.loadQuizData();

            this.questions = wrongList.map(wrong => ({
                ...wrong,
                correct: wrong.correct
            }));

            if (document.getElementById('shuffle-option').checked) {
                this.shuffleArray(this.questions);
            }

            this.currentIndex = 0;
            this.score = 0;
            this.answers = [];
            this.wrongAnswers = [];
            this.isWrongNoteMode = true;

            document.getElementById('main-nav').style.display = 'none';
            document.getElementById('quiz-mode-badge').style.display = 'inline-block';

            this.createQuestionNav();
            this.showScreen('quiz-screen');
            this.showQuestion();
        } catch (error) {
            console.error('오답노트 퀴즈 시작 실패:', error);
            alert('퀴즈를 시작할 수 없습니다.');
        }
    }

    async loadQuizData() {
        const promises = this.selectedRanges.map(async (range) => {
            if (!this.quizData[range]) {
                const response = await fetch(`data/${range}.json`);
                if (!response.ok) {
                    throw new Error(`${range}.json 로드 실패: ${response.status}`);
                }
                this.quizData[range] = await response.json();
            }
        });
        await Promise.all(promises);
    }

    prepareQuestions() {
        this.questions = [];
        const mcqOnly = document.getElementById('mcq-only-option').checked;

        this.selectedRanges.forEach(range => {
            const data = this.quizData[range];
            data.questions.forEach(q => {
                // 객관식만 옵션이 체크되어 있으면 mcq 타입만 추가
                if (mcqOnly && q.type !== 'mcq') {
                    return;
                }

                const answer = data.answers.find(a => a.qid === q.qid);
                const explanation = data.explanations.find(e => e.qid === q.qid);

                this.questions.push({
                    ...q,
                    range: range,
                    correct: answer ? answer.correct : null,
                    explanation: explanation ? explanation.explanation : ''
                });
            });
        });

        if (document.getElementById('shuffle-option').checked) {
            this.shuffleArray(this.questions);
        }
    }

    shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }

    showQuestion() {
        const question = this.questions[this.currentIndex];

        const progress = ((this.currentIndex) / this.questions.length) * 100;
        document.getElementById('progress-fill').style.width = `${progress}%`;

        document.getElementById('question-counter').textContent =
            `${this.currentIndex + 1} / ${this.questions.length}`;
        document.getElementById('score-display').textContent = `정답: ${this.score}`;

        document.getElementById('question-range-tag').textContent = question.range;

        const badge = document.getElementById('question-type-badge');
        badge.className = 'question-type-badge';
        if (question.type === 'mcq') {
            badge.textContent = '객관식';
        } else if (question.type === 'short') {
            badge.textContent = '단답형';
            badge.classList.add('short');
        } else {
            badge.textContent = '서술형';
            badge.classList.add('essay');
        }

        document.getElementById('question-prompt').textContent = question.prompt;

        document.getElementById('choices-container').style.display = 'none';
        document.getElementById('short-answer-container').style.display = 'none';
        document.getElementById('essay-container').style.display = 'none';
        document.getElementById('feedback-container').style.display = 'none';

        if (question.type === 'mcq') {
            this.showMCQ(question);
        } else if (question.type === 'short') {
            this.showShortAnswer();
        } else {
            this.showEssay();
        }

        this.updateQuestionNav();
    }

    showMCQ(question) {
        const container = document.getElementById('choices-container');
        container.style.display = 'flex';
        container.innerHTML = '';

        question.choices.forEach(choice => {
            const btn = document.createElement('button');
            btn.className = 'choice-btn';
            btn.innerHTML = `
                <span class="choice-label">${choice.cid}</span>
                <span class="choice-text">${choice.text}</span>
            `;
            btn.addEventListener('click', () => this.selectChoice(choice.cid, btn));
            container.appendChild(btn);
        });
    }

    selectChoice(cid, btn) {
        const question = this.questions[this.currentIndex];
        const isCorrect = cid === question.correct;

        document.querySelectorAll('.choice-btn').forEach(b => {
            b.disabled = true;
            if (b.querySelector('.choice-label').textContent === question.correct) {
                b.classList.add('correct');
            }
        });

        if (isCorrect) {
            btn.classList.add('correct');
            this.score++;

            if (this.isWrongNoteMode) {
                this.removeWrongAnswer(question.qid);
            }
        } else {
            btn.classList.add('wrong');

            this.saveWrongAnswer(question, cid);

            this.wrongAnswers.push({
                question: question,
                userAnswer: cid,
                correctAnswer: question.correct
            });
        }

        this.answers.push({ qid: question.qid, answer: cid, correct: isCorrect });
        this.updateQuestionNav();
        this.showFeedback(isCorrect, question);
    }

    showShortAnswer() {
        document.getElementById('short-answer-container').style.display = 'flex';
        const input = document.getElementById('short-answer-input');
        input.value = '';
        input.focus();
    }

    submitShortAnswer() {
        const input = document.getElementById('short-answer-input');
        const userAnswer = input.value.trim();

        if (!userAnswer) return;

        const question = this.questions[this.currentIndex];
        const correctAnswers = Array.isArray(question.correct) ? question.correct : [question.correct];

        const normalizedUser = userAnswer.toLowerCase().replace(/\s/g, '');
        const isCorrect = correctAnswers.some(ans =>
            ans.toLowerCase().replace(/\s/g, '') === normalizedUser
        );

        if (isCorrect) {
            this.score++;

            if (this.isWrongNoteMode) {
                this.removeWrongAnswer(question.qid);
            }
        } else {
            this.saveWrongAnswer(question, userAnswer);

            this.wrongAnswers.push({
                question: question,
                userAnswer: userAnswer,
                correctAnswer: correctAnswers.join(' 또는 ')
            });
        }

        this.answers.push({ qid: question.qid, answer: userAnswer, correct: isCorrect });

        input.disabled = true;
        document.getElementById('submit-short-btn').disabled = true;

        this.updateQuestionNav();
        this.showFeedback(isCorrect, question, correctAnswers.join(' 또는 '));
    }

    showEssay() {
        document.getElementById('essay-container').style.display = 'block';
    }

    showEssayAnswer() {
        const question = this.questions[this.currentIndex];
        document.getElementById('essay-container').style.display = 'none';

        this.answers.push({ qid: question.qid, answer: 'essay', correct: null });
        this.updateQuestionNav();
        this.showFeedback(null, question);
    }

    showFeedback(isCorrect, question, correctAnswer = null) {
        const container = document.getElementById('feedback-container');
        const result = document.getElementById('feedback-result');
        const explanation = document.getElementById('explanation');

        container.style.display = 'block';

        if (isCorrect === null) {
            result.className = 'feedback-result info';
            result.textContent = '서술형 문제입니다';
        } else if (isCorrect) {
            result.className = 'feedback-result correct';
            result.textContent = this.isWrongNoteMode ? '정답입니다! (오답노트에서 제거됨)' : '정답입니다!';
        } else {
            result.className = 'feedback-result wrong';
            if (correctAnswer) {
                result.textContent = `오답입니다. 정답: ${correctAnswer}`;
            } else {
                result.textContent = `오답입니다. 정답: ${question.correct}`;
            }
        }

        explanation.textContent = question.explanation;

        // 중요 표시 버튼 상태 업데이트
        const importantBtn = document.getElementById('mark-important-btn');
        const isImportant = this.savedWrongAnswers[question.qid]?.important;
        if (isImportant) {
            importantBtn.classList.add('marked');
            importantBtn.querySelector('span').textContent = '중요 표시됨';
        } else {
            importantBtn.classList.remove('marked');
            importantBtn.querySelector('span').textContent = '중요 표시';
        }

        container.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    nextQuestion() {
        const shortInput = document.getElementById('short-answer-input');
        shortInput.disabled = false;
        document.getElementById('submit-short-btn').disabled = false;

        this.currentIndex++;

        if (this.currentIndex >= this.questions.length) {
            this.showResults();
        } else {
            this.showQuestion();
        }
    }

    showResults() {
        document.getElementById('progress-fill').style.width = '100%';

        const gradedQuestions = this.questions.filter(q => q.type !== 'essay');
        const totalGraded = gradedQuestions.length;

        document.getElementById('final-score').textContent = this.score;
        document.getElementById('final-total').textContent = totalGraded;

        const percentage = totalGraded > 0 ? Math.round((this.score / totalGraded) * 100) : 0;
        document.getElementById('result-percentage').textContent = `${percentage}%`;

        this.showRangeResults();
        this.showWrongAnswersList();
        this.showReviewList();

        const retryWrongBtn = document.getElementById('retry-wrong-btn');
        if (this.wrongAnswers.length > 0) {
            retryWrongBtn.style.display = 'block';
            retryWrongBtn.textContent = `오답만 다시 풀기 (${this.wrongAnswers.length}문제)`;
        } else {
            retryWrongBtn.style.display = 'none';
        }

        // 리뷰 목록 초기화
        document.getElementById('review-list').style.display = 'none';
        document.getElementById('toggle-review-btn').textContent = '펼치기';

        this.showScreen('result-screen');
    }

    showRangeResults() {
        const container = document.getElementById('range-results');
        container.innerHTML = '';

        const ranges = [...new Set(this.questions.map(q => q.range))];

        ranges.forEach(range => {
            const rangeQuestions = this.questions.filter(q => q.range === range && q.type !== 'essay');
            const rangeAnswers = this.answers.filter(a => {
                const q = this.questions.find(q => q.qid === a.qid);
                return q && q.range === range && q.type !== 'essay';
            });
            const rangeScore = rangeAnswers.filter(a => a.correct).length;

            const item = document.createElement('div');
            item.className = 'range-result-item';
            item.innerHTML = `
                <span>${range}</span>
                <span class="range-result-score">${rangeScore} / ${rangeQuestions.length}</span>
            `;
            container.appendChild(item);
        });
    }

    showReviewList() {
        const container = document.getElementById('review-list');
        container.innerHTML = '';

        this.questions.forEach((question, index) => {
            const answer = this.answers.find(a => a.qid === question.qid);
            let statusClass = 'skip';
            let statusIcon = '-';

            if (answer) {
                if (answer.correct === null) {
                    statusClass = 'skip';
                    statusIcon = '-';
                } else if (answer.correct) {
                    statusClass = 'correct';
                    statusIcon = '✓';
                } else {
                    statusClass = 'wrong';
                    statusIcon = '✗';
                }
            }

            const item = document.createElement('div');
            item.className = 'review-item';
            item.innerHTML = `
                <div class="review-status ${statusClass}">${statusIcon}</div>
                <div class="review-content">
                    <div class="review-qid">${question.qid}</div>
                    <div class="review-prompt">${question.prompt}</div>
                </div>
            `;
            container.appendChild(item);
        });
    }

    toggleReview() {
        const list = document.getElementById('review-list');
        const btn = document.getElementById('toggle-review-btn');

        if (list.style.display === 'none') {
            list.style.display = 'block';
            btn.textContent = '접기';
        } else {
            list.style.display = 'none';
            btn.textContent = '펼치기';
        }
    }

    showWrongAnswersList() {
        const section = document.getElementById('wrong-answers-section');
        const list = document.getElementById('wrong-answers-list');

        if (this.wrongAnswers.length === 0) {
            section.style.display = 'none';
            return;
        }

        section.style.display = 'block';
        list.innerHTML = '';

        this.wrongAnswers.forEach(wrong => {
            const item = document.createElement('div');
            item.className = 'wrong-answer-item';
            item.innerHTML = `
                <div class="wrong-question-id">${wrong.question.qid}</div>
                <div class="wrong-question-prompt">${wrong.question.prompt}</div>
                <div class="wrong-your-answer">내 답: ${wrong.userAnswer}</div>
                <div class="wrong-correct-answer">정답: ${wrong.correctAnswer}</div>
                <div class="wrong-explanation">${wrong.question.explanation}</div>
            `;
            list.appendChild(item);
        });
    }

    retryQuiz() {
        this.prepareQuestions();
        this.currentIndex = 0;
        this.score = 0;
        this.answers = [];
        this.wrongAnswers = [];
        this.isWrongNoteMode = false;

        document.getElementById('main-nav').style.display = 'none';
        document.getElementById('quiz-mode-badge').style.display = 'none';

        this.createQuestionNav();
        this.showScreen('quiz-screen');
        this.showQuestion();
    }

    retryWrongOnly() {
        if (this.wrongAnswers.length === 0) {
            alert('다시 풀 오답이 없습니다.');
            return;
        }

        this.questions = this.wrongAnswers.map(w => w.question);

        if (document.getElementById('shuffle-option').checked) {
            this.shuffleArray(this.questions);
        }

        this.currentIndex = 0;
        this.score = 0;
        this.answers = [];
        this.wrongAnswers = [];
        this.isWrongNoteMode = true;

        document.getElementById('main-nav').style.display = 'none';
        document.getElementById('quiz-mode-badge').style.display = 'inline-block';

        this.createQuestionNav();
        this.showScreen('quiz-screen');
        this.showQuestion();
    }

    goHome() {
        document.getElementById('main-nav').style.display = 'flex';

        document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelector('.nav-btn[data-screen="range-selection"]').classList.add('active');

        this.showScreen('range-selection');
        this.updateWrongNoteBadge();
    }

    showScreen(screenId) {
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        document.getElementById(screenId).classList.add('active');
        window.scrollTo(0, 0);
    }
}

// 앱 시작
document.addEventListener('DOMContentLoaded', () => {
    new QuizApp();
});
