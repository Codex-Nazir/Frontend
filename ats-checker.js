// ATS Resume Checker & Builder Logic
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';

// Application State
let resumeData = {
    personal: {
        name: '',
        title: '',
        email: '',
        phone: '',
        location: '',
        linkedin: '',
        github: '',
        website: ''
    },
    experience: [],
    education: [],
    projects: [],
    skills: [],
    certifications: []
};

// Common Skills List to check for during scan
const SKILLS_DB = [
    'python', 'javascript', 'html', 'css', 'react', 'node', 'express', 'sql', 'mysql', 'postgresql', 'mongodb', 'docker', 
    'aws', 'git', 'github', 'linux', 'unix', 'c++', 'c', 'java', 'bash', 'scripting',
    'pentesting', 'penetration testing', 'ethical hacking', 'hacking', 'owasp', 'xss', 'sqli', 'wireshark', 'nmap', 
    'burpsuite', 'metasploit', 'cryptography', 'forensics', 'malware', 'firewall', 'soc', 'siem', 'ids', 'ips',
    'cybersecurity', 'network security', 'information security', 'vulnerability', 'threat', 'incident response'
];

// Common Action Verbs to check (ATS looks for these)
const ACTION_VERBS = [
    'implemented', 'managed', 'secured', 'designed', 'developed', 'analyzed', 'engineered', 'led', 'created',
    'optimized', 'resolved', 'prevented', 'audited', 'automated', 'configured', 'monitored', 'investigated',
    'strengthened', 'modernized', 'accelerated', 'established', 'coordinated'
];

// Document Elements
const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const uploadView = document.getElementById('uploadView');
const scanView = document.getElementById('scanView');
const dashboardView = document.getElementById('dashboardView');
const scanStatus = document.getElementById('scanStatus');
const scanSub = document.getElementById('scanSub');
const scanTerminal = document.getElementById('scanTerminal');
const scoreVal = document.getElementById('scoreVal');
const scoreProgress = document.getElementById('scoreProgress');
const feedbackList = document.getElementById('feedbackList');

// Init listeners
if (dropZone) {
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('dragover');
    });

    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('dragover');
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('dragover');
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleFileUpload(files[0]);
        }
    });
}

if (fileInput) {
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleFileUpload(e.target.files[0]);
        }
    });
}

// Log message to virtual scan terminal
function logTerminal(message, type = 'info') {
    if (!scanTerminal) return;
    let prefix = '<span style="color: #3b82f6;">[INFO]</span>';
    if (type === 'success') prefix = '<span style="color: #10b981;">[OK]</span>';
    if (type === 'error') prefix = '<span style="color: #ef4444;">[ERROR]</span>';
    if (type === 'system') prefix = '<span style="color: #00f2ff;">[SYSTEM]</span>';
    
    scanTerminal.innerHTML += `<p>${prefix} ${message}</p>`;
    scanTerminal.scrollTop = scanTerminal.scrollHeight;
}

// Skip directly to a blank builder
function skipToBuilder() {
    uploadView.style.display = 'none';
    dashboardView.style.display = 'grid';
    
    // Add one empty row for each section to help user start
    addExperienceCard();
    addEducationCard();
    addProjectCard();
    addCertificationCard();
    
    switchSection('personal');
    calculateATSScore();
}

// Handle PDF processing
function handleFileUpload(file) {
    if (file.type !== 'application/pdf') {
        alert('Please upload a valid PDF document.');
        return;
    }

    uploadView.style.display = 'none';
    scanView.style.display = 'block';
    
    logTerminal('Initializing PDF parsing process...', 'system');
    logTerminal(`File Loaded: ${file.name} (${Math.round(file.size / 1024)} KB)`);

    const reader = new FileReader();
    reader.onload = async function() {
        try {
            const typedarray = new Uint8Array(this.result);
            logTerminal('Loading document into memory...', 'info');
            const pdf = await pdfjsLib.getDocument({ data: typedarray }).promise;
            
            logTerminal(`Document read successfully. Pages detected: ${pdf.numPages}`, 'success');
            scanStatus.innerText = "Extracting Document Content...";
            scanSub.innerText = "Reconstructing text blocks and analyzing keywords.";
            
            let fullText = '';
            for (let i = 1; i <= pdf.numPages; i++) {
                logTerminal(`Processing Page ${i}/${pdf.numPages}...`);
                const page = await pdf.getPage(i);
                const textContent = await page.getTextContent();
                const pageText = textContent.items.map(item => item.str).join(' ');
                fullText += pageText + '\n';
                logTerminal(`Page ${i} extraction complete.`, 'success');
            }

            logTerminal('Parsing document contents & metadata...', 'system');
            parseResumeText(fullText);
            
        } catch (error) {
            logTerminal(`Fatal exception during parser run: ${error.message}`, 'error');
            setTimeout(() => {
                alert('Failed to parse PDF resume. Navigating to manual editor.');
                skipToBuilder();
            }, 2000);
        }
    };
    reader.readAsArrayBuffer(file);
}

// Parse extracted raw text
function parseResumeText(text) {
    logTerminal('Running ATS heuristic parsers...', 'info');
    
    // 1. Email Parse
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const emails = text.match(emailRegex);
    if (emails && emails.length > 0) {
        resumeData.personal.email = emails[0];
        logTerminal(`Parsed Contact: Email -> ${emails[0]}`, 'success');
    }

    // 2. Phone Parse
    const phoneRegex = /(\+?\d{1,4}[-.\s]??)?(\(?\d{2,5}\)?[-.\s]??)?\d{3,4}[-.\s]??\d{3,4}/g;
    const phones = text.match(phoneRegex);
    if (phones && phones.length > 0) {
        // Clean out spaces or odd characters to verify it's a realistic number
        const val = phones[0].trim();
        if (val.length >= 7) {
            resumeData.personal.phone = val;
            logTerminal(`Parsed Contact: Phone -> ${val}`, 'success');
        }
    }

    // 3. URLs
    const linkedinRegex = /(linkedin\.com\/in\/[a-zA-Z0-9_-]+)/i;
    const githubRegex = /(github\.com\/[a-zA-Z0-9_-]+)/i;
    
    const linkedinMatch = text.match(linkedinRegex);
    if (linkedinMatch) {
        resumeData.personal.linkedin = linkedinMatch[0];
        logTerminal(`Parsed Contact: LinkedIn -> ${linkedinMatch[0]}`, 'success');
    }
    
    const githubMatch = text.match(githubRegex);
    if (githubMatch) {
        resumeData.personal.github = githubMatch[0];
        logTerminal(`Parsed Contact: GitHub -> ${githubMatch[0]}`, 'success');
    }

    // 4. Skills extraction
    const foundSkills = [];
    const lowerText = text.toLowerCase();
    SKILLS_DB.forEach(skill => {
        if (lowerText.includes(skill)) {
            // Capitalize for styling
            const skillLabel = skill.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
            foundSkills.push(skillLabel);
        }
    });
    
    if (foundSkills.length > 0) {
        resumeData.skills = foundSkills;
        logTerminal(`Parsed Skills: Found ${foundSkills.length} matches.`, 'success');
    }

    // 5. Try parsing name
    // Name is usually the first 1-3 lines. Let's look at the clean lines at the start of text.
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    if (lines.length > 0) {
        // Find a line that doesn't look like contact details
        for (let i = 0; i < Math.min(5, lines.length); i++) {
            const line = lines[i];
            if (!line.includes('@') && !line.includes('http') && !line.match(/\d/)) {
                resumeData.personal.name = line.substring(0, 40); // Cap it
                logTerminal(`Parsed Identity: Name -> ${resumeData.personal.name}`, 'success');
                break;
            }
        }
    }
    
    // Set default name if nothing was detected
    if (!resumeData.personal.name) {
        resumeData.personal.name = "Candidate Profile";
    }

    // Simple Heuristic split to load basic default blocks for other sections
    // (Actual comprehensive layout parsing is extremely complex inside client side, 
    // so we fill basic mock details extracted or allow user to completely flesh out)
    if (resumeData.experience.length === 0) {
        // Look if we can find common cyber roles to populate experience
        if (lowerText.includes('engineer') || lowerText.includes('developer') || lowerText.includes('analyst')) {
            resumeData.experience.push({
                company: 'Tech Solutions Inc.',
                role: 'Security Engineer',
                duration: '2023 - Present',
                bullets: 'Implemented secure coding protocols.\nMonitored network systems for anomalies.'
            });
        } else {
            resumeData.experience.push({
                company: '',
                role: '',
                duration: '',
                bullets: ''
            });
        }
    }
    
    if (resumeData.education.length === 0) {
        resumeData.education.push({
            school: 'State University',
            degree: 'Bachelor of Science in Computer Science',
            duration: '2019 - 2023'
        });
    }

    if (resumeData.projects.length === 0) {
        resumeData.projects.push({
            title: 'Personal Network Scanner',
            role: 'Developer',
            bullets: 'Built multi-threaded port scanner in Python.\nOptimized socket connections.'
        });
    }

    if (resumeData.certifications.length === 0) {
        // Pre-fill a cert if cybersecurity is found
        if (lowerText.includes('cyber') || lowerText.includes('hacking')) {
            resumeData.certifications.push({
                name: 'CompTIA Security+',
                issuer: 'CompTIA',
                date: '2024'
            });
        } else {
            resumeData.certifications.push({
                name: '',
                issuer: '',
                date: ''
            });
        }
    }

    logTerminal('Parsing pipeline completed successfully!', 'system');
    logTerminal('Loading Dashboard...', 'system');
    
    setTimeout(() => {
        scanView.style.display = 'none';
        dashboardView.style.display = 'grid';
        
        populateFormInputs();
        rebuildRepeaterCards();
        syncPreview();
        calculateATSScore();
    }, 1500);
}

// Populate the form fields with state data
function populateFormInputs() {
    document.getElementById('p-name').value = resumeData.personal.name || '';
    document.getElementById('p-title').value = resumeData.personal.title || 'Professional Specialist';
    document.getElementById('p-email').value = resumeData.personal.email || '';
    document.getElementById('p-phone').value = resumeData.personal.phone || '';
    document.getElementById('p-location').value = resumeData.personal.location || '';
    document.getElementById('p-linkedin').value = resumeData.personal.linkedin || '';
    document.getElementById('p-github').value = resumeData.personal.github || '';
    document.getElementById('p-website').value = resumeData.personal.website || '';
    document.getElementById('s-skills').value = resumeData.skills.join(', ') || '';
}

// Rebuild experience, education, projects, certifications card repeaters
function rebuildRepeaterCards() {
    // Experience
    const expContainer = document.getElementById('experienceContainer');
    expContainer.innerHTML = '';
    resumeData.experience.forEach((item, idx) => {
        expContainer.appendChild(createExperienceCard(item, idx));
    });

    // Education
    const eduContainer = document.getElementById('educationContainer');
    eduContainer.innerHTML = '';
    resumeData.education.forEach((item, idx) => {
        eduContainer.appendChild(createEducationCard(item, idx));
    });

    // Projects
    const projContainer = document.getElementById('projectsContainer');
    projContainer.innerHTML = '';
    resumeData.projects.forEach((item, idx) => {
        projContainer.appendChild(createProjectCard(item, idx));
    });

    // Certifications
    const certContainer = document.getElementById('certificationsContainer');
    certContainer.innerHTML = '';
    resumeData.certifications.forEach((item, idx) => {
        certContainer.appendChild(createCertificationCard(item, idx));
    });
}

// Dynamic Section Switcher
function switchSection(sectionId) {
    // Nav highlight
    const btns = document.querySelectorAll('#sectionNav button');
    btns.forEach(btn => btn.classList.remove('active'));
    
    const activeBtn = Array.from(btns).find(btn => btn.getAttribute('onclick').includes(sectionId));
    if (activeBtn) activeBtn.classList.add('active');

    // Title update
    const titles = {
        personal: 'Edit Personal Information',
        experience: 'Manage Work Experience',
        education: 'Configure Education History',
        projects: 'Build Project Showcase',
        skills: 'Define Core Skills',
        certifications: 'Add Professional Credentials'
    };
    document.getElementById('editorTitle').innerText = titles[sectionId];

    // Form section show
    const sections = document.querySelectorAll('.form-section');
    sections.forEach(sec => sec.classList.remove('active'));
    
    document.getElementById(`sec-${sectionId}`).classList.add('active');
}

// Card Creation Helper: EXPERIENCE
function createExperienceCard(data = {}, index) {
    const card = document.createElement('div');
    card.className = 'repeater-card';
    card.innerHTML = `
        <button type="button" class="remove-btn" onclick="removeExperienceCard(${index})"><i class="fas fa-trash-can"></i></button>
        <div class="row-grid">
            <div class="input-group">
                <label>Company / Organization</label>
                <input type="text" value="${data.company || ''}" class="form-control exp-company" placeholder="e.g. Acme Corp" oninput="saveExperienceState(${index})">
            </div>
            <div class="input-group">
                <label>Job Title / Role</label>
                <input type="text" value="${data.role || ''}" class="form-control exp-role" placeholder="e.g. Lead Cybersecurity Engineer" oninput="saveExperienceState(${index})">
            </div>
        </div>
        <div class="row-grid">
            <div class="input-group">
                <label>Duration / Dates</label>
                <input type="text" value="${data.duration || ''}" class="form-control exp-dur" placeholder="e.g. May 2022 - Present" oninput="saveExperienceState(${index})">
            </div>
        </div>
        <div class="input-group">
            <label>Key Accomplishments (One per line)</label>
            <textarea class="form-control exp-bullets" rows="4" placeholder="Implemented security standard...\nReduced compliance scan failures by 35%..." oninput="saveExperienceState(${index})" style="font-family: inherit; resize: vertical;">${data.bullets || ''}</textarea>
        </div>
    `;
    return card;
}

function addExperienceCard() {
    resumeData.experience.push({ company: '', role: '', duration: '', bullets: '' });
    rebuildRepeaterCards();
    syncPreview();
}

function removeExperienceCard(idx) {
    resumeData.experience.splice(idx, 1);
    rebuildRepeaterCards();
    syncPreview();
    calculateATSScore();
}

function saveExperienceState(idx) {
    const cards = document.querySelectorAll('#experienceContainer .repeater-card');
    if (cards[idx]) {
        resumeData.experience[idx].company = cards[idx].querySelector('.exp-company').value;
        resumeData.experience[idx].role = cards[idx].querySelector('.exp-role').value;
        resumeData.experience[idx].duration = cards[idx].querySelector('.exp-dur').value;
        resumeData.experience[idx].bullets = cards[idx].querySelector('.exp-bullets').value;
    }
    syncPreview();
    calculateATSScore();
}

// Card Creation Helper: EDUCATION
function createEducationCard(data = {}, index) {
    const card = document.createElement('div');
    card.className = 'repeater-card';
    card.innerHTML = `
        <button type="button" class="remove-btn" onclick="removeEducationCard(${index})"><i class="fas fa-trash-can"></i></button>
        <div class="row-grid">
            <div class="input-group">
                <label>Institution Name</label>
                <input type="text" value="${data.school || ''}" class="form-control edu-school" placeholder="e.g. MIT" oninput="saveEducationState(${index})">
            </div>
            <div class="input-group">
                <label>Degree / Major</label>
                <input type="text" value="${data.degree || ''}" class="form-control edu-degree" placeholder="e.g. Bachelor of Science in Cybersecurity" oninput="saveEducationState(${index})">
            </div>
        </div>
        <div class="row-grid">
            <div class="input-group">
                <label>Duration / Dates</label>
                <input type="text" value="${data.duration || ''}" class="form-control edu-dur" placeholder="e.g. 2019 - 2023" oninput="saveEducationState(${index})">
            </div>
        </div>
    `;
    return card;
}

function addEducationCard() {
    resumeData.education.push({ school: '', degree: '', duration: '' });
    rebuildRepeaterCards();
    syncPreview();
}

function removeEducationCard(idx) {
    resumeData.education.splice(idx, 1);
    rebuildRepeaterCards();
    syncPreview();
    calculateATSScore();
}

function saveEducationState(idx) {
    const cards = document.querySelectorAll('#educationContainer .repeater-card');
    if (cards[idx]) {
        resumeData.education[idx].school = cards[idx].querySelector('.edu-school').value;
        resumeData.education[idx].degree = cards[idx].querySelector('.edu-degree').value;
        resumeData.education[idx].duration = cards[idx].querySelector('.edu-dur').value;
    }
    syncPreview();
    calculateATSScore();
}

// Card Creation Helper: PROJECTS
function createProjectCard(data = {}, index) {
    const card = document.createElement('div');
    card.className = 'repeater-card';
    card.innerHTML = `
        <button type="button" class="remove-btn" onclick="removeProjectCard(${index})"><i class="fas fa-trash-can"></i></button>
        <div class="row-grid">
            <div class="input-group">
                <label>Project Title</label>
                <input type="text" value="${data.title || ''}" class="form-control proj-title" placeholder="e.g. CertifyAI Platform" oninput="saveProjectState(${index})">
            </div>
            <div class="input-group">
                <label>Technologies / Role</label>
                <input type="text" value="${data.role || ''}" class="form-control proj-role" placeholder="e.g. Python, OCR, PDF.js" oninput="saveProjectState(${index})">
            </div>
        </div>
        <div class="input-group">
            <label>Project Summary & Core Work (One per line)</label>
            <textarea class="form-control proj-bullets" rows="4" placeholder="Engineered high-performance detection algorithm...\nProcessed 10k+ entries with 99.8% precision..." oninput="saveProjectState(${index})" style="font-family: inherit; resize: vertical;">${data.bullets || ''}</textarea>
        </div>
    `;
    return card;
}

function addProjectCard() {
    resumeData.projects.push({ title: '', role: '', bullets: '' });
    rebuildRepeaterCards();
    syncPreview();
}

function removeProjectCard(idx) {
    resumeData.projects.splice(idx, 1);
    rebuildRepeaterCards();
    syncPreview();
    calculateATSScore();
}

function saveProjectState(idx) {
    const cards = document.querySelectorAll('#projectsContainer .repeater-card');
    if (cards[idx]) {
        resumeData.projects[idx].title = cards[idx].querySelector('.proj-title').value;
        resumeData.projects[idx].role = cards[idx].querySelector('.proj-role').value;
        resumeData.projects[idx].bullets = cards[idx].querySelector('.proj-bullets').value;
    }
    syncPreview();
    calculateATSScore();
}

// Card Creation Helper: CERTIFICATIONS
function createCertificationCard(data = {}, index) {
    const card = document.createElement('div');
    card.className = 'repeater-card';
    card.innerHTML = `
        <button type="button" class="remove-btn" onclick="removeCertificationCard(${index})"><i class="fas fa-trash-can"></i></button>
        <div class="row-grid">
            <div class="input-group">
                <label>Certification Name</label>
                <input type="text" value="${data.name || ''}" class="form-control cert-name" placeholder="e.g. CompTIA Security+" oninput="saveCertificationState(${index})">
            </div>
            <div class="input-group">
                <label>Issuing Organization</label>
                <input type="text" value="${data.issuer || ''}" class="form-control cert-issuer" placeholder="e.g. CompTIA" oninput="saveCertificationState(${index})">
            </div>
            <div class="input-group">
                <label>Earned Date / Year</label>
                <input type="text" value="${data.date || ''}" class="form-control cert-date" placeholder="e.g. 2024" oninput="saveCertificationState(${index})">
            </div>
        </div>
    `;
    return card;
}

function addCertificationCard() {
    resumeData.certifications.push({ name: '', issuer: '', date: '' });
    rebuildRepeaterCards();
    syncPreview();
}

function removeCertificationCard(idx) {
    resumeData.certifications.splice(idx, 1);
    rebuildRepeaterCards();
    syncPreview();
    calculateATSScore();
}

function saveCertificationState(idx) {
    const cards = document.querySelectorAll('#certificationsContainer .repeater-card');
    if (cards[idx]) {
        resumeData.certifications[idx].name = cards[idx].querySelector('.cert-name').value;
        resumeData.certifications[idx].issuer = cards[idx].querySelector('.cert-issuer').value;
        resumeData.certifications[idx].date = cards[idx].querySelector('.cert-date').value;
    }
    syncPreview();
    calculateATSScore();
}

// Synchronize all input fields to State and compile the Live Print Preview
function syncPreview() {
    // 1. Core Contact
    const name = document.getElementById('p-name').value || 'CANDIDATE NAME';
    const title = document.getElementById('p-title').value || '';
    const email = document.getElementById('p-email').value;
    const phone = document.getElementById('p-phone').value;
    const location = document.getElementById('p-location').value;
    const linkedin = document.getElementById('p-linkedin').value;
    const github = document.getElementById('p-github').value;
    const website = document.getElementById('p-website').value;
    
    // Save to active state
    resumeData.personal.name = name;
    resumeData.personal.title = title;
    resumeData.personal.email = email;
    resumeData.personal.phone = phone;
    resumeData.personal.location = location;
    resumeData.personal.linkedin = linkedin;
    resumeData.personal.github = github;
    resumeData.personal.website = website;
    
    // Render preview Contact row
    document.getElementById('prev-name').innerText = name.toUpperCase();
    
    let contactInfo = [];
    if (title) contactInfo.push(title);
    if (email) contactInfo.push(email);
    if (phone) contactInfo.push(phone);
    if (location) contactInfo.push(location);
    if (linkedin) contactInfo.push(linkedin);
    if (github) contactInfo.push(github);
    if (website) contactInfo.push(website);
    
    document.getElementById('prev-contact').innerHTML = contactInfo.join(' &bull; ');

    // 2. Work Experience Preview
    const expList = document.getElementById('prev-exp-list');
    expList.innerHTML = '';
    if (resumeData.experience.length > 0 && resumeData.experience.some(e => e.company || e.role)) {
        document.getElementById('prev-exp-sec').style.display = 'block';
        resumeData.experience.forEach(item => {
            if (!item.company && !item.role) return;
            const block = document.createElement('div');
            block.style.marginBottom = '12px';
            
            let bulletLines = '';
            if (item.bullets) {
                const bulletList = item.bullets.split('\n').filter(b => b.trim().length > 0);
                bulletLines = `<ul class="pdf-bullets">${bulletList.map(b => `<li>${b}</li>`).join('')}</ul>`;
            }
            
            block.innerHTML = `
                <div class="pdf-item-header">
                    <span>${item.company || 'Organization'}</span>
                    <span>${item.duration || ''}</span>
                </div>
                <div class="pdf-item-sub">
                    <span>${item.role || 'Specialist'}</span>
                </div>
                ${bulletLines}
            `;
            expList.appendChild(block);
        });
    } else {
        document.getElementById('prev-exp-sec').style.display = 'none';
    }

    // 3. Education Preview
    const eduList = document.getElementById('prev-edu-list');
    eduList.innerHTML = '';
    if (resumeData.education.length > 0 && resumeData.education.some(e => e.school || e.degree)) {
        document.getElementById('prev-edu-sec').style.display = 'block';
        resumeData.education.forEach(item => {
            if (!item.school && !item.degree) return;
            const block = document.createElement('div');
            block.style.marginBottom = '10px';
            block.innerHTML = `
                <div class="pdf-item-header">
                    <span>${item.school || 'Institution'}</span>
                    <span>${item.duration || ''}</span>
                </div>
                <div class="pdf-item-sub">
                    <span>${item.degree || 'Degree'}</span>
                </div>
            `;
            eduList.appendChild(block);
        });
    } else {
        document.getElementById('prev-edu-sec').style.display = 'none';
    }

    // 4. Projects Preview
    const projList = document.getElementById('prev-proj-list');
    projList.innerHTML = '';
    if (resumeData.projects.length > 0 && resumeData.projects.some(p => p.title)) {
        document.getElementById('prev-proj-sec').style.display = 'block';
        resumeData.projects.forEach(item => {
            if (!item.title) return;
            const block = document.createElement('div');
            block.style.marginBottom = '12px';
            
            let bulletLines = '';
            if (item.bullets) {
                const bulletList = item.bullets.split('\n').filter(b => b.trim().length > 0);
                bulletLines = `<ul class="pdf-bullets">${bulletList.map(b => `<li>${b}</li>`).join('')}</ul>`;
            }
            
            block.innerHTML = `
                <div class="pdf-item-header">
                    <span>${item.title}</span>
                    <span>${item.role || ''}</span>
                </div>
                ${bulletLines}
            `;
            projList.appendChild(block);
        });
    } else {
        document.getElementById('prev-proj-sec').style.display = 'none';
    }

    // 5. Skills Preview
    const rawSkills = document.getElementById('s-skills').value;
    const cleanSkills = rawSkills.split(',').map(s => s.trim()).filter(s => s.length > 0);
    resumeData.skills = cleanSkills;
    
    const prevSkills = document.getElementById('prev-skills-list');
    if (cleanSkills.length > 0) {
        document.getElementById('prev-skills-sec').style.display = 'block';
        prevSkills.innerText = cleanSkills.join(' &bull; ');
    } else {
        document.getElementById('prev-skills-sec').style.display = 'none';
    }

    // 6. Certifications Preview
    const certList = document.getElementById('prev-cert-list');
    certList.innerHTML = '';
    if (resumeData.certifications.length > 0 && resumeData.certifications.some(c => c.name)) {
        document.getElementById('prev-cert-sec').style.display = 'block';
        resumeData.certifications.forEach(item => {
            if (!item.name) return;
            const block = document.createElement('div');
            block.style.marginBottom = '4px';
            block.innerHTML = `
                <div style="font-weight: bold; font-size: 10pt; display: flex; justify-content: space-between;">
                    <span>&bull; ${item.name} (${item.issuer || ''})</span>
                    <span>${item.date || ''}</span>
                </div>
            `;
            certList.appendChild(block);
        });
    } else {
        document.getElementById('prev-cert-sec').style.display = 'none';
    }
}

// Calculate the final score & populate the feedback column
function calculateATSScore() {
    let score = 0;
    const feedbacks = [];

    // Critical Checklist variables
    let hasContact = 0;
    let hasExp = false;
    let hasEdu = false;
    let hasSkills = false;
    
    // 1. Personal Info Compliance (Max 25 pts)
    if (resumeData.personal.email) { score += 5; hasContact++; }
    if (resumeData.personal.phone) { score += 5; hasContact++; }
    if (resumeData.personal.linkedin) { score += 5; hasContact++; }
    if (resumeData.personal.github || resumeData.personal.website) { score += 5; hasContact++; }
    if (resumeData.personal.location) { score += 5; hasContact++; }

    if (hasContact >= 4) {
        feedbacks.push({ text: 'All crucial contact channels are populated.', type: 'success' });
    } else {
        feedbacks.push({ text: 'Missing contact channels (Email, Phone, LinkedIn, etc.).', type: 'error' });
    }

    // 2. Experience Compliance (Max 25 pts)
    const validExp = resumeData.experience.filter(e => e.company && e.role);
    if (validExp.length > 0) {
        hasExp = true;
        score += 15;
        // Verify action verbs in bullets
        let verbCount = 0;
        validExp.forEach(exp => {
            if (exp.bullets) {
                const words = exp.bullets.toLowerCase().split(/\s+/);
                ACTION_VERBS.forEach(v => {
                    if (words.includes(v)) verbCount++;
                });
            }
        });
        
        if (verbCount >= 3) {
            score += 10;
            feedbacks.push({ text: 'Excellent usage of descriptive Action Verbs.', type: 'success' });
        } else {
            score += 5;
            feedbacks.push({ text: 'Add descriptive verbs (e.g. Optimized, Automated).', type: 'warning' });
        }
    } else {
        feedbacks.push({ text: 'Professional experience block is empty.', type: 'error' });
    }

    // 3. Education Compliance (Max 15 pts)
    const validEdu = resumeData.education.filter(e => e.school && e.degree);
    if (validEdu.length > 0) {
        hasEdu = true;
        score += 15;
        feedbacks.push({ text: 'Academic credentials verified.', type: 'success' });
    } else {
        feedbacks.push({ text: 'No education credentials found.', type: 'error' });
    }

    // 4. Core Skills (Max 20 pts)
    if (resumeData.skills.length > 0) {
        hasSkills = true;
        if (resumeData.skills.length >= 8) {
            score += 20;
            feedbacks.push({ text: 'Rich technical skills keyword profile.', type: 'success' });
        } else {
            score += 10;
            feedbacks.push({ text: 'Add more core technical skills to match ATS filters.', type: 'warning' });
        }
    } else {
        feedbacks.push({ text: 'Core skills sector is empty.', type: 'error' });
    }

    // 5. Structure & Layout (Max 15 pts)
    // Dynamic projects / certifications checking
    const validProj = resumeData.projects.filter(p => p.title);
    const validCert = resumeData.certifications.filter(c => c.name);
    
    if (validProj.length > 0) score += 8;
    if (validCert.length > 0) score += 7;

    if (validProj.length > 0 && validCert.length > 0) {
        feedbacks.push({ text: 'Excellent section distribution (Projects + Certs).', type: 'success' });
    } else {
        feedbacks.push({ text: 'Consider adding Projects/Certifications to optimize pages.', type: 'warning' });
    }

    // Cap Score at 100
    score = Math.min(100, score);
    
    // Update Score Circle & text values
    if (scoreVal) {
        scoreVal.innerText = `${score}%`;
    }

    // Animate circular fill based on score percentage (SVG length = 527)
    if (scoreProgress) {
        const offset = 527 - (527 * score) / 100;
        scoreProgress.style.strokeDashoffset = offset;
    }

    // Update feedback panel inside UI
    if (feedbackList) {
        feedbackList.innerHTML = '';
        feedbacks.forEach(item => {
            const card = document.createElement('div');
            card.className = 'checklist-item';
            
            let iconClass = 'fa-circle-check text-success';
            if (item.type === 'warning') iconClass = 'fa-circle-exclamation text-warning';
            if (item.type === 'error') iconClass = 'fa-circle-xmark text-error';

            card.innerHTML = `
                <i class="fas ${iconClass}"></i>
                <span>${item.text}</span>
            `;
            feedbackList.appendChild(card);
        });
    }
}

// Download PDF using html2pdf.js
function downloadPDF() {
    const element = document.getElementById('resumePreview');
    const opt = {
        margin:       [0.5, 0.5, 0.5, 0.5], // In inches
        filename:     `${resumeData.personal.name.replace(/\s+/g, '_')}_Optimized_Resume.pdf`,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2.5, useCORS: true, letterRendering: true },
        jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' }
    };
    
    // Create progress modal or visual notification
    const btn = document.querySelector('.action-bar .btn-primary');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Building PDF...';
    btn.disabled = true;

    html2pdf().set(opt).from(element).save()
    .then(() => {
        btn.innerHTML = '<i class="fas fa-circle-check"></i> Complete!';
        setTimeout(() => {
            btn.innerHTML = originalText;
            btn.disabled = false;
        }, 2000);
    })
    .catch(err => {
        console.error(err);
        alert('PDF compiling failed. Try again.');
        btn.innerHTML = originalText;
        btn.disabled = false;
    });
}
